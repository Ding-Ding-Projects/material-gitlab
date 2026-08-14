import createMockApollo from 'helpers/mock_apollo_helper';
import {
  CLIENT_BASE_URL,
  FIRST_PAGE_END_CURSOR,
  ORGANIZATION_GID,
  SLUG,
  mockDetailRepository,
  mockEmptyImagePage,
  mockFirstImagePage,
  mockRepository,
  mockSecondImagePage,
} from 'ee_jest/packages_and_registries/artifact_registry/mock_data';
import { possibleTypes } from '../../graphql/cache_config';
import getRepositoryDetailQuery from '../../graphql/queries/get_repository_detail.query.graphql';
import getRepositoryImagesQuery from '../../graphql/queries/get_repository_images.query.graphql';
import getRepositoryPackagesQuery from '../../graphql/queries/get_repository_packages.query.graphql';
import { createRouter } from '../../router';
import RepositoryDetail from './repository_detail.vue';

const BASE_PATH = '/o/gitlab-org/-/artifact_registry/acme/repositories';

// The repository read is @client, so a local resolver answers it. Its
// `organization { id }` sibling is not, so the remainder still reaches the link.
const organizationHandler = () =>
  Promise.resolve({
    data: { organization: { __typename: 'Organization', id: ORGANIZATION_GID } },
  });

export default {
  component: RepositoryDetail,
  title: 'ee/artifact_registry/repositories/detail/repository_detail',
};

const Template =
  (repositoryResolver, artifactResolvers = {}) =>
  () => {
    // The page reads the repository name from the route, so the story navigates to
    // the detail route before rendering.
    const router = createRouter(BASE_PATH);
    router.push(`/${mockRepository.name}`);

    return {
      components: { RepositoryDetail },
      router,
      apolloProvider: createMockApollo(
        [
          [getRepositoryDetailQuery, organizationHandler],
          [getRepositoryImagesQuery, organizationHandler],
          [getRepositoryPackagesQuery, organizationHandler],
        ],
        {
          Organization: { artifactRegistryRepository: repositoryResolver },
          ArtifactRegistryRepository: artifactResolvers,
        },
        { possibleTypes },
      ),
      // The kebab composes its copy-URL item from the slug and the client base URL, so
      // both have to be provided or the item does not render.
      provide: { organizationGid: ORGANIZATION_GID, slug: SLUG, clientBaseUrl: CLIENT_BASE_URL },
      template: '<repository-detail />',
    };
  };

export const Default = Template(() => mockDetailRepository());

export const WithoutDescription = Template(() =>
  mockDetailRepository('MAVEN', { description: null }),
);

export const NpmRepository = Template(() => mockDetailRepository('NPM'));

export const ContainerRepository = Template(() => mockDetailRepository('DOCKER'));

export const WithoutAttribution = Template(() =>
  mockDetailRepository('MAVEN', { createdBy: null, updatedBy: null }),
);

export const WithoutLastUpdate = Template(() =>
  mockDetailRepository('MAVEN', {
    downloadsCount: '0',
    sizeBytes: '0',
    artifactsCount: '0',
    lastUpdatedAt: null,
    updatedBy: null,
  }),
);

export const WithoutArtifacts = Template(() =>
  mockDetailRepository('DOCKER', { images: mockEmptyImagePage }),
);

export const ArtifactsUnavailable = Template(() =>
  mockDetailRepository('DOCKER', { images: null }),
);

export const Paginated = Template(() => mockDetailRepository('DOCKER'), {
  images: (_, { after }) =>
    after === FIRST_PAGE_END_CURSOR ? mockSecondImagePage : mockFirstImagePage,
});

export const Loading = Template(() => new Promise(() => {}));

export const ServiceUnavailable = Template(() => Promise.reject(new Error('Unavailable')));

export const NotFound = Template(() => null);
