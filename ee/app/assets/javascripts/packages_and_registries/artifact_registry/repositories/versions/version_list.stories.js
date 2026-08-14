import createMockApollo from 'helpers/mock_apollo_helper';
import {
  ARTIFACT_ID_FOR,
  ORGANIZATION_GID,
  mockArtifactRepository,
  mockRepository,
} from 'ee_jest/packages_and_registries/artifact_registry/mock_data';
import { possibleTypes } from '../../graphql/cache_config';
import getArtifactQuery from '../../graphql/queries/get_artifact.query.graphql';
import { createRouter } from '../../router';
import VersionList from './version_list.vue';

const BASE_PATH = '/o/gitlab-org/-/artifact_registry/acme/repositories';

// The artifact read is @client, so a local resolver answers it. Its
// `organization { id }` sibling is not, so the remainder still reaches the link.
const organizationHandler = () =>
  Promise.resolve({
    data: { organization: { __typename: 'Organization', id: ORGANIZATION_GID } },
  });

export default {
  component: VersionList,
  title: 'ee/artifact_registry/repositories/versions/version_list',
};

const Template =
  (repositoryResolver, format = 'MAVEN') =>
  () => {
    // The page reads the repository name and the artifact id from the route, so the
    // story navigates to the version list route before rendering.
    const router = createRouter(BASE_PATH);
    router.push(`/${mockRepository.name}/${ARTIFACT_ID_FOR[format]}`);

    return {
      components: { VersionList },
      router,
      apolloProvider: createMockApollo(
        [[getArtifactQuery, organizationHandler]],
        { Organization: { artifactRegistryRepository: repositoryResolver } },
        { possibleTypes },
      ),
      provide: {
        breadCrumbState: { name: '', updateName() {} },
        organizationGid: ORGANIZATION_GID,
      },
      template: '<version-list />',
    };
  };

export const Default = Template(() => mockArtifactRepository());

export const NpmPackage = Template(() => mockArtifactRepository('NPM'), 'NPM');

export const DockerImage = Template(() => mockArtifactRepository('DOCKER'), 'DOCKER');

export const OciImage = Template(() => mockArtifactRepository('OCI'), 'OCI');

export const Loading = Template(() => new Promise(() => {}));

export const ServiceUnavailable = Template(() => Promise.reject(new Error('Unavailable')));

export const NotFound = Template(() => null);

export const ArtifactNotFound = Template(() =>
  mockArtifactRepository('MAVEN', { image: null, package: null }),
);
