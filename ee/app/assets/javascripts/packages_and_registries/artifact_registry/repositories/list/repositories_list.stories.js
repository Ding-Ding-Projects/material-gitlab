import createMockApollo from 'helpers/mock_apollo_helper';
import {
  CLIENT_BASE_URL,
  FIRST_PAGE_END_CURSOR,
  ORGANIZATION_GID,
  SLUG,
  mockEmptyRepositoryPage,
  mockFirstRepositoryPage,
  mockRepositoryPage,
  mockSecondRepositoryPage,
} from 'ee_jest/packages_and_registries/artifact_registry/mock_data';
import getRepositoriesQuery from '../../graphql/queries/get_repositories.query.graphql';
import { createRouter } from '../../router';
import RepositoriesList from './repositories_list.vue';

const BASE_PATH = '/o/gitlab-org/-/artifact_registry/acme/repositories';

// The repositories connection is @client, so a local resolver answers it. Its
// `organization { id }` sibling is not, so the remainder still reaches the link.
const organizationHandler = () =>
  Promise.resolve({
    data: { organization: { __typename: 'Organization', id: ORGANIZATION_GID } },
  });

export default {
  component: RepositoriesList,
  title: 'ee/artifact_registry/repositories/list/repositories_list',
};

// The page is a route component, so a standalone story needs a router, seeded with the
// story's filter selection because the page reads that selection from the route query.
// Seeding an empty query would push the route the router already holds, which
// vue-router rejects as a duplicate navigation.
function createStoryRouter(query) {
  const router = createRouter(BASE_PATH);

  if (query) {
    router.push({ path: '/', query });
  }

  return router;
}

function Template(repositoriesResolver, query = null) {
  return () => ({
    components: { RepositoriesList },
    router: createStoryRouter(query),
    apolloProvider: createMockApollo([[getRepositoriesQuery, organizationHandler]], {
      Organization: { artifactRegistryRepositories: repositoriesResolver },
    }),
    provide: { organizationGid: ORGANIZATION_GID, slug: SLUG, clientBaseUrl: CLIENT_BASE_URL },
    template: '<repositories-list />',
  });
}

export const Default = Template(() => mockRepositoryPage);

export const Empty = Template(() => mockEmptyRepositoryPage);

export const ZeroResult = Template(() => mockEmptyRepositoryPage, { format: 'npm' });

// A non-default sort, so the accessibility run covers a header carrying an active sort.
export const Sorted = Template(() => mockRepositoryPage, { sort: 'name_asc' });

export const Loading = Template(() => new Promise(() => {}));

export const ServiceUnavailable = Template(() => Promise.reject(new Error('Unavailable')));

export const NotFound = Template(() => null);

// The pager is operable rather than only rendered: the request after the first page's
// end cursor answers the second page, and every other request answers the first.
export const Paginated = Template((_, { after }) =>
  after === FIRST_PAGE_END_CURSOR ? mockSecondRepositoryPage : mockFirstRepositoryPage,
);
