import createMockApollo from 'helpers/mock_apollo_helper';
import {
  ORGANIZATION_GID,
  mockRepository,
} from 'ee_jest/packages_and_registries/artifact_registry/mock_data';
import { REPOSITORY_EDIT_ROUTE_NAME } from '../../constants';
import getRepositoryQuery from '../../graphql/queries/get_repository.query.graphql';
import { createRouter } from '../../router';
import RepositoriesEditForm from './repositories_edit_form.vue';

const BASE_PATH = '/o/gitlab-org/-/artifact_registry/acme/repositories';

// The repository read is @client, so a local resolver answers it. Its
// `organization { id }` sibling is not, so the remainder still reaches the link.
const organizationHandler = () =>
  Promise.resolve({
    data: { organization: { __typename: 'Organization', id: ORGANIZATION_GID } },
  });

export default {
  component: RepositoriesEditForm,
  title: 'ee/artifact_registry/repositories/edit/repositories_edit_form',
};

const Template = (repositoryResolver) => () => {
  // The view reads the repository named in the route, so the story has to be standing
  // on the edit route before it renders.
  const router = createRouter(BASE_PATH);
  router
    .push({ name: REPOSITORY_EDIT_ROUTE_NAME, params: { id: mockRepository.name } })
    .catch(() => {});

  return {
    components: { RepositoriesEditForm },
    router,
    apolloProvider: createMockApollo([[getRepositoryQuery, organizationHandler]], {
      Organization: { artifactRegistryRepository: repositoryResolver },
    }),
    provide: { organizationGid: ORGANIZATION_GID, slug: 'acme' },
    template: '<repositories-edit-form />',
  };
};

export const Default = Template(() => mockRepository);

export const Loading = Template(() => new Promise(() => {}));

export const ServiceUnavailable = Template(() => Promise.reject(new Error('Unavailable')));

export const NotFound = Template(() => null);
