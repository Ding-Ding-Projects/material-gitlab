import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { mountExtended } from 'helpers/vue_test_utils_helper';
import { typePolicies as globalTypePolicies } from '~/lib/graphql';
import { createAlert } from '~/alert';
import ErrorsAlert from '~/vue_shared/components/errors_alert.vue';
import PageHeading from '~/vue_shared/components/page_heading.vue';
import RepositoriesCreateForm from 'ee/packages_and_registries/artifact_registry/repositories/create/repositories_create_form.vue';
import { typePolicies } from 'ee/packages_and_registries/artifact_registry/graphql/cache_config';
import getRepositoriesQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repositories.query.graphql';
import { createRouter } from 'ee/packages_and_registries/artifact_registry/router';
import {
  BASE_PATH,
  ORGANIZATION_GID,
  SLUG,
  mockEmptyRepositoryPage,
  mockRepository,
} from '../../mock_data';

jest.mock('~/alert');

Vue.use(VueApollo);

describe('ArtifactRegistryRepositoriesCreateForm', () => {
  let wrapper;
  let router;
  let cache;
  let createMutationResolver;
  let toastShow;

  const MOCK_SUCCESS_PAYLOAD = {
    __typename: 'LocalArtifactRegistryRepositoryCreatePayload',
    repository: mockRepository,
    errors: [],
  };

  const mockErrorPayload = (errors) => ({
    __typename: 'LocalArtifactRegistryRepositoryCreatePayload',
    repository: null,
    errors,
  });

  const findHeading = () => wrapper.findComponent(PageHeading);
  const findHeadingDescription = () => wrapper.findByTestId('page-heading-description');
  const findErrorsAlert = () => wrapper.findComponent(ErrorsAlert);
  const findNameInput = () => wrapper.findByTestId('repository-name');
  const findDescription = () => wrapper.findByTestId('repository-description');
  const findFormatListbox = () => wrapper.findComponentByTestId('repository-format');
  const findSubmitButton = () => wrapper.findComponentByTestId('submit-repository');

  const organizationCacheId = () =>
    cache.identify({ __typename: 'Organization', id: ORGANIZATION_GID });

  const seedRepositoriesList = () => {
    cache.writeQuery({
      query: getRepositoriesQuery,
      variables: { organizationId: ORGANIZATION_GID },
      data: {
        organization: {
          __typename: 'Organization',
          id: ORGANIZATION_GID,
          artifactRegistryRepositories: mockEmptyRepositoryPage,
        },
      },
    });
  };

  const createComponent = async () => {
    createMutationResolver = jest.fn().mockResolvedValue(MOCK_SUCCESS_PAYLOAD);
    toastShow = jest.fn();

    const mockApollo = createMockApollo(
      [],
      { Mutation: { artifactRegistryRepositoryCreate: createMutationResolver } },
      { typePolicies: { ...globalTypePolicies, ...typePolicies } },
    );
    cache = mockApollo.clients.defaultClient.cache;

    router = createRouter(BASE_PATH);
    await router.push('/new/hosted');

    wrapper = mountExtended(RepositoriesCreateForm, {
      router,
      apolloProvider: mockApollo,
      provide: { organizationGid: ORGANIZATION_GID, slug: SLUG },
      mocks: { $toast: { show: toastShow } },
      attachTo: document.body,
    });

    await waitForPromises();
  };

  const updateForm = async ({ name = 'my-repository', description } = {}) => {
    await findNameInput().setValue(name);
    if (description !== undefined) await findDescription().setValue(description);
    await waitForPromises();
  };

  const submitForm = async () => {
    await wrapper.find('form').trigger('submit');
    await waitForPromises();
  };

  beforeEach(async () => {
    await createComponent();
  });

  describe('the page heading', () => {
    it('names the view', () => {
      expect(findHeading().props('heading')).toBe('Create hosted repository');
    });

    it('says what a hosted repository is, because the kind is chosen before the form', () => {
      expect(findHeadingDescription().text()).toBe(
        'A hosted repository directly hosts artifacts. You can publish artifacts to and pull them from a hosted repository.',
      );
    });
  });

  describe('when the form is submitted', () => {
    beforeEach(async () => {
      seedRepositoriesList();
      await updateForm({ description: 'A hosted repository' });
      await submitForm();
    });

    it('issues the create mutation with the identity, the kind, and the writable fields', () => {
      expect(createMutationResolver).toHaveBeenCalledWith(
        {},
        {
          input: {
            slug: SLUG,
            kind: 'HOSTED',
            format: 'DOCKER',
            name: 'my-repository',
            description: 'A hosted repository',
            visibility: 'PRIVATE',
          },
        },
        expect.anything(),
        expect.anything(),
      );
    });

    it('evicts the cached repositories connection so the list refetches', () => {
      // Matching the field rather than a bare key is what keeps this assertion honest:
      // the connection caches under a filter-keyed name, which a bare-key check would
      // report as absent whether or not the eviction ran.
      expect(Object.keys(cache.extract()[organizationCacheId()])).not.toContainEqual(
        expect.stringMatching(/^artifactRegistryRepositories[:(]/),
      );
    });

    it('shows a success toast', () => {
      expect(toastShow).toHaveBeenCalledWith('Repository was successfully created.');
    });

    it('returns to the repositories list', () => {
      expect(router.currentRoute.name).toBe('repositories_list');
    });

    it('raises no alert', () => {
      expect(createAlert).not.toHaveBeenCalled();
    });
  });

  describe('when a format other than the default is chosen', () => {
    beforeEach(async () => {
      findFormatListbox().vm.$emit('select', 'MAVEN');
      await updateForm();
      await submitForm();
    });

    it('sends the chosen format', () => {
      expect(createMutationResolver).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ input: expect.objectContaining({ format: 'MAVEN' }) }),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('when the mutation returns a recoverable error', () => {
    beforeEach(async () => {
      createMutationResolver.mockResolvedValue(mockErrorPayload(['Name has already been taken.']));
      seedRepositoriesList();
      await updateForm();
      await submitForm();
    });

    it('renders it above the form rather than as a page-level alert', () => {
      expect(findErrorsAlert().props('errors')).toEqual(['Name has already been taken.']);
      expect(createAlert).not.toHaveBeenCalled();
    });

    // Otherwise a retry that fails differently shows both sets at once.
    it('drops them when the form is submitted again', async () => {
      createMutationResolver.mockRejectedValue(new Error('Service unavailable'));
      await submitForm();

      expect(findErrorsAlert().props('errors')).toEqual([]);
    });

    it('clears the errors when the alert is dismissed', async () => {
      findErrorsAlert().vm.$emit('dismiss');
      await waitForPromises();

      expect(findErrorsAlert().props('errors')).toEqual([]);
    });

    it('leaves the cached repositories connection in place', () => {
      // The connection caches under a filter-keyed field, so the assertion matches the
      // field rather than a bare key.
      expect(Object.keys(cache.extract()[organizationCacheId()])).toContainEqual(
        expect.stringMatching(/^artifactRegistryRepositories[:(]/),
      );
    });

    it('stays on the create view', () => {
      expect(router.currentRoute.name).toBe('repository_new_hosted');
    });

    it('shows no success toast', () => {
      expect(toastShow).not.toHaveBeenCalled();
    });

    it('re-enables the submit button', () => {
      expect(findSubmitButton().props('loading')).toBe(false);
    });
  });

  describe('when the mutation returns several recoverable errors', () => {
    beforeEach(async () => {
      createMutationResolver.mockResolvedValue(
        mockErrorPayload(['Name has already been taken.', 'Format is not supported.']),
      );
      await updateForm();
      await submitForm();
    });

    it('renders them as a list rather than one run-on sentence', () => {
      expect(findErrorsAlert().props('errors')).toEqual([
        'Name has already been taken.',
        'Format is not supported.',
      ]);
    });
  });

  describe('when the mutation throws a top-level error', () => {
    beforeEach(async () => {
      createMutationResolver.mockRejectedValue(new Error('Service unavailable'));
      await updateForm();
      await submitForm();
    });

    it('raises a generic alert, reports it, and leaves the view rendered', () => {
      expect(createAlert).toHaveBeenCalledWith({
        message: 'Something went wrong. Please try again.',
        error: expect.any(Error),
        captureError: true,
      });
      expect(findFormatListbox().exists()).toBe(true);
      expect(findSubmitButton().exists()).toBe(true);
    });

    it('re-enables the submit button', () => {
      expect(findSubmitButton().props('loading')).toBe(false);
    });
  });
});
