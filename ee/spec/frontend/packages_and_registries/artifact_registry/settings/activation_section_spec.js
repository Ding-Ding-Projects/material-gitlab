import { GlAlert, GlCard, GlSkeletonLoader } from '@gitlab/ui';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { mountExtended } from 'helpers/vue_test_utils_helper';
import ClipboardButton from '~/vue_shared/components/clipboard_button.vue';
import ActivationSection from 'ee/packages_and_registries/artifact_registry/settings/activation_section.vue';
import getArtifactRegistryQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_artifact_registry.query.graphql';
import {
  CLIENT_BASE_URL,
  ORGANIZATION_GID,
  REGISTRY_HANDLE,
  mockArtifactRegistry,
  mockOrganizationHandler,
} from '../mock_data';

Vue.use(VueApollo);

describe('ArtifactRegistryActivationSection', () => {
  let wrapper;
  let organizationHandler;
  let registryResolver;

  const findSkeleton = () => wrapper.findComponent(GlSkeletonLoader);
  const findAlert = () => wrapper.findComponent(GlAlert);
  const findCard = () => wrapper.findComponent(GlCard);
  const findClipboardButtons = () => wrapper.findAllComponents(ClipboardButton);
  const findIdentity = () => wrapper.findByTestId('registry-identity');
  const findHandle = () => wrapper.findByTestId('registry-handle');
  const findUrl = () => wrapper.findByTestId('registry-url');
  const findActiveSince = () => wrapper.findByTestId('registry-active-since');
  const findStatus = () => wrapper.findByTestId('registry-status');

  const createComponent = ({ clientBaseUrl = CLIENT_BASE_URL } = {}) => {
    organizationHandler = mockOrganizationHandler();

    wrapper = mountExtended(ActivationSection, {
      apolloProvider: createMockApollo([[getArtifactRegistryQuery, organizationHandler]], {
        Organization: { artifactRegistry: registryResolver },
      }),
      provide: { organizationGid: ORGANIZATION_GID, clientBaseUrl },
    });
  };

  const createResolvedComponent = async (options) => {
    createComponent(options);
    await waitForPromises();
  };

  const resolveRegistry = (overrides) => {
    registryResolver = jest.fn().mockResolvedValue(mockArtifactRegistry(overrides));
  };

  beforeEach(() => {
    resolveRegistry();
  });

  describe('while the registry is being read', () => {
    beforeEach(() => {
      createComponent();
    });

    it('stands a loading affordance in for the identity, reporting no state it has not read', () => {
      expect(findSkeleton().exists()).toBe(true);
      expect(findIdentity().exists()).toBe(false);
      expect(findStatus().exists()).toBe(false);
      expect(findCard().exists()).toBe(false);
      expect(findAlert().exists()).toBe(false);
    });
  });

  describe('when the registry resolves', () => {
    beforeEach(() => createResolvedComponent());

    it('reads the registry of the organization it was mounted for', () => {
      expect(organizationHandler).toHaveBeenCalledTimes(1);
      expect(organizationHandler).toHaveBeenCalledWith({ organizationId: ORGANIZATION_GID });
    });

    it('names the handle, the client URL composed from it, and the date it was activated', () => {
      expect(findHandle().text()).toBe(REGISTRY_HANDLE);
      expect(findUrl().text()).toBe(`${CLIENT_BASE_URL}/${REGISTRY_HANDLE}`);
      expect(findActiveSince().text()).toBe('Aug 6, 2026');
    });

    it('labels each identity value, so none of the three is an unexplained string', () => {
      expect(findIdentity().text()).toContain('Registry handle');
      expect(findIdentity().text()).toContain('Registry URL');
      expect(findIdentity().text()).toContain('Active since');
    });

    it('renders the identity rather than the loading affordance or an error', () => {
      expect(findIdentity().exists()).toBe(true);
      expect(findCard().exists()).toBe(true);
      expect(findSkeleton().exists()).toBe(false);
      expect(findAlert().exists()).toBe(false);
    });

    it('offers the handle and the registry URL for copying, and the date not at all', () => {
      expect(findClipboardButtons().wrappers.map((button) => button.props('text'))).toEqual([
        REGISTRY_HANDLE,
        `${CLIENT_BASE_URL}/${REGISTRY_HANDLE}`,
      ]);
    });

    it('says which value each copy action takes, so neither is an unlabelled icon', () => {
      expect(findClipboardButtons().wrappers.map((button) => button.props('title'))).toEqual([
        'Copy registry handle',
        'Copy registry URL',
      ]);
    });
  });

  describe('when the instance configures no Artifact Registry origin', () => {
    beforeEach(() => createResolvedComponent({ clientBaseUrl: null }));

    it('still names the handle, and no registry URL rather than one with a hole in it', () => {
      expect(findHandle().text()).toBe(REGISTRY_HANDLE);
      expect(findUrl().exists()).toBe(false);
    });

    it('offers the handle for copying and no copy action for the URL it does not render', () => {
      expect(findClipboardButtons().wrappers.map((button) => button.props('text'))).toEqual([
        REGISTRY_HANDLE,
      ]);
    });
  });

  describe('the status indication', () => {
    it.each([
      ['active', 'Artifact Registry is enabled'],
      ['disabled', 'Artifact Registry is disabled'],
      ['suspended', 'Artifact Registry is not available for this organization'],
      ['blocked', 'Artifact Registry is not available for this organization'],
      ['deleted', 'Artifact Registry is not available for this organization'],
      ['purged', 'Artifact Registry is not available for this organization'],
    ])('indicates %p as %p', async (status, indication) => {
      resolveRegistry({ status });

      await createResolvedComponent();

      expect(findStatus().text()).toBe(indication);
    });

    it('indicates a status it does not recognize neutrally, beside the identity', async () => {
      resolveRegistry({ status: 'unrecognized-status' });

      await createResolvedComponent();

      expect(findStatus().text()).toBe('Artifact Registry is not available for this organization');
      expect(findHandle().text()).toBe(REGISTRY_HANDLE);
      expect(findAlert().exists()).toBe(false);
    });
  });

  describe.each([
    ['the read fails', () => jest.fn().mockRejectedValue(new Error('Artifact Registry is down'))],
    ['the field resolves null', () => jest.fn().mockResolvedValue(null)],
  ])('when %s', (_, buildResolver) => {
    beforeEach(async () => {
      registryResolver = buildResolver();

      await createResolvedComponent();
    });

    it('replaces the identity with the service-unavailable error, naming no status', () => {
      expect(findAlert().text()).toBe('The Artifact Registry service is unavailable.');
      expect(findIdentity().exists()).toBe(false);
      expect(findCard().exists()).toBe(false);
      expect(findStatus().exists()).toBe(false);
      expect(findClipboardButtons()).toHaveLength(0);
    });

    it('leaves the error in place rather than offering to dismiss a state that persists', () => {
      expect(findAlert().props('dismissible')).toBe(false);
    });
  });
});
