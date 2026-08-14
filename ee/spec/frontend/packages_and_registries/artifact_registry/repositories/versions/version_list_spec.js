import { GlAlert, GlSkeletonLoader } from '@gitlab/ui';
import Vue, { nextTick } from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import { typePolicies as globalTypePolicies } from '~/lib/graphql';
import PageHeading from '~/vue_shared/components/page_heading.vue';
import NotFound from 'ee/packages_and_registries/artifact_registry/components/not_found.vue';
import {
  possibleTypes,
  typePolicies as artifactRegistryTypePolicies,
} from 'ee/packages_and_registries/artifact_registry/graphql/cache_config';
import getArtifactQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_artifact.query.graphql';
import FormatLogo from 'ee/packages_and_registries/artifact_registry/repositories/components/format_logo.vue';
import VersionList from 'ee/packages_and_registries/artifact_registry/repositories/versions/version_list.vue';
import { createRouter } from 'ee/packages_and_registries/artifact_registry/router';
import {
  ARTIFACT_DISPLAY_NAMES,
  ARTIFACT_ID_FOR,
  BASE_PATH,
  ORGANIZATION_GID,
  mockArtifactRepository,
  createBreadCrumbState,
  mockOrganizationHandler,
  resetBreadCrumbState,
} from '../../mock_data';

Vue.use(VueApollo);

const FORMATS = ['MAVEN', 'NPM', 'DOCKER', 'OCI'];

describe('ArtifactRegistryVersionList', () => {
  let wrapper;
  let state;

  afterEach(() => {
    resetBreadCrumbState();
  });

  const findSkeleton = () => wrapper.findComponent(GlSkeletonLoader);
  const findAlert = () => wrapper.findComponent(GlAlert);
  const findNotFound = () => wrapper.findComponent(NotFound);
  const findHeading = () => wrapper.findComponent(PageHeading);
  const findLogo = () => wrapper.findComponent(FormatLogo);
  const findName = () => wrapper.findByTestId('artifact-name');
  const findFormatName = () => wrapper.findByTestId('artifact-format-name');
  const findAnnouncement = () => wrapper.findByTestId('versions-announcement');

  const createComponent = async ({
    repositoryResolver = jest.fn().mockResolvedValue(mockArtifactRepository()),
    path = `/my-repository/${ARTIFACT_ID_FOR.MAVEN}`,
  } = {}) => {
    state = createBreadCrumbState();

    const router = createRouter(BASE_PATH, state);
    await router.push(path);

    wrapper = shallowMountExtended(VersionList, {
      router,
      apolloProvider: createMockApollo(
        [[getArtifactQuery, mockOrganizationHandler()]],
        { Organization: { artifactRegistryRepository: repositoryResolver } },
        {
          possibleTypes,
          typePolicies: { ...globalTypePolicies, ...artifactRegistryTypePolicies },
        },
      ),
      provide: { breadCrumbState: state, organizationGid: ORGANIZATION_GID },
    });

    await nextTick();
  };

  const createResolvedComponent = async (options) => {
    await createComponent(options);
    await waitForPromises();
  };

  it('reads the artifact the route names, so a shared URL opens that artifact', async () => {
    const repositoryResolver = jest.fn().mockResolvedValue(mockArtifactRepository());

    await createResolvedComponent({
      repositoryResolver,
      path: `/payment-core/${ARTIFACT_ID_FOR.OCI}`,
    });

    expect(repositoryResolver).toHaveBeenCalledWith(
      expect.anything(),
      { name: 'payment-core', artifactId: ARTIFACT_ID_FOR.OCI },
      expect.anything(),
      expect.anything(),
    );
  });

  describe('while the query is in flight', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('renders the skeleton rather than the header', () => {
      expect(findSkeleton().exists()).toBe(true);
      expect(findHeading().exists()).toBe(false);
    });

    it('announces that the artifact details are loading', () => {
      expect(findAnnouncement().text()).toBe('Loading artifact details.');
    });
  });

  describe.each(FORMATS)('for a %s artifact', (format) => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoryResolver: jest.fn().mockResolvedValue(mockArtifactRepository(format)),
        path: `/my-repository/${ARTIFACT_ID_FOR[format]}`,
      });
    });

    it('renders the artifact display name', () => {
      expect(findName().text()).toBe(ARTIFACT_DISPLAY_NAMES[format]);
    });

    it('renders the format logo, naming the format for assistive technology', () => {
      expect(findLogo().props('format')).toBe(format);
      expect(findFormatName().exists()).toBe(true);
    });

    it('renders no error, skeleton, or not-found state', () => {
      expect(findAlert().exists()).toBe(false);
      expect(findSkeleton().exists()).toBe(false);
      expect(findNotFound().exists()).toBe(false);
    });

    it('announces the artifact by name, never by its id', () => {
      expect(findAnnouncement().text()).toBe(
        `Artifact details for ${ARTIFACT_DISPLAY_NAMES[format]} loaded.`,
      );
    });
  });

  describe.each`
    scenario                    | resolved
    ${'the repository is gone'} | ${null}
    ${'the artifact is gone'}   | ${mockArtifactRepository('MAVEN', { image: null, package: null })}
  `('when $scenario', ({ resolved }) => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoryResolver: jest.fn().mockResolvedValue(resolved),
      });
    });

    it('renders the not-found state alone', () => {
      expect(findNotFound().exists()).toBe(true);
      expect(findHeading().exists()).toBe(false);
      expect(findAlert().exists()).toBe(false);
    });

    it('announces the not-found state rather than an artifact with no name', () => {
      expect(findAnnouncement().text()).toBe('Page not found');
    });
  });

  describe('when the read fails', () => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoryResolver: jest.fn().mockRejectedValue(new Error('Unavailable')),
      });
    });

    it('renders the service-unavailable alert rather than the not-found state', () => {
      expect(findAlert().text()).toBe('The Artifact Registry service is unavailable.');
      expect(findNotFound().exists()).toBe(false);
    });

    it('announces the failure', () => {
      expect(findAnnouncement().text()).toBe('The Artifact Registry service is unavailable.');
    });
  });
});
