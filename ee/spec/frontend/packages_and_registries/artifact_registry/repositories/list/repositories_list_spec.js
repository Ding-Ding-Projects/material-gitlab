import { GlAlert, GlEmptyState, GlKeysetPagination } from '@gitlab/ui';
import { isUndefined, omit, omitBy } from 'lodash-es';
import Vue, { nextTick } from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import waitForPromises from 'helpers/wait_for_promises';
import { useLocalStorageSpy } from 'helpers/local_storage_helper';
import { mountExtended, shallowMountExtended } from 'helpers/vue_test_utils_helper';
import { typePolicies as globalTypePolicies } from '~/lib/graphql';
import LocalStorageSync from '~/vue_shared/components/local_storage_sync.vue';
import NotFound from 'ee/packages_and_registries/artifact_registry/components/not_found.vue';
import { GRAPHQL_PAGE_SIZE } from 'ee/packages_and_registries/artifact_registry/constants';
import { typePolicies as artifactRegistryTypePolicies } from 'ee/packages_and_registries/artifact_registry/graphql/cache_config';
import getRepositoriesQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repositories.query.graphql';
import RepositoriesHeader from 'ee/packages_and_registries/artifact_registry/repositories/list/repositories_header.vue';
import RepositoriesList from 'ee/packages_and_registries/artifact_registry/repositories/list/repositories_list.vue';
import RepositoriesTable from 'ee/packages_and_registries/artifact_registry/repositories/list/repositories_table.vue';
import RepositoriesToolbar from 'ee/packages_and_registries/artifact_registry/repositories/list/repositories_toolbar.vue';
import { createRouter } from 'ee/packages_and_registries/artifact_registry/router';
import {
  BASE_PATH,
  CLIENT_BASE_URL,
  FIRST_PAGE_END_CURSOR,
  ORGANIZATION_GID,
  SLUG,
  SECOND_PAGE_START_CURSOR,
  mockEmptyRepositoryPage,
  mockFirstRepositoryPage,
  mockOrganizationHandler,
  mockRepositories,
  mockRepositoryPage,
  mockSecondRepositoryPage,
} from '../../mock_data';

Vue.use(VueApollo);

describe('ArtifactRegistryRepositoriesList', () => {
  let wrapper;
  let router;
  let routerPush;
  let routerReplace;

  // Named here rather than imported, because a key already written into a user's browser
  // is harder to change than a constant.
  const STICKY_SORT_STORAGE_KEY = 'artifact-registry-repositories-sort';

  const DEFAULT_SORT = { sortBy: 'lastUpdatedAt', sortDesc: true };

  // The default in the spelling the query carries, which every request sends.
  const DEFAULT_SORT_VALUE = 'LAST_UPDATED_AT_DESC';

  const findHeader = () => wrapper.findComponent(RepositoriesHeader);
  const findEmptyState = () => wrapper.findComponent(GlEmptyState);
  const findTable = () => wrapper.findComponent(RepositoriesTable);
  const findToolbar = () => wrapper.findComponent(RepositoriesToolbar);
  const findAlert = () => wrapper.findComponent(GlAlert);
  const findNotFound = () => wrapper.findComponent(NotFound);
  const findLiveRegion = () => wrapper.findByTestId('result-announcement');
  const findClearFilters = () => wrapper.findComponentByTestId('clear-filters');
  const findPagination = () => wrapper.findComponent(GlKeysetPagination);
  const findLocalStorageSync = () => wrapper.findComponent(LocalStorageSync);

  const renderedNames = () =>
    findTable()
      .props('repositories')
      .map(({ name }) => name);

  // A variable the page leaves out reaches the resolver as an absent argument, and one
  // it passes as undefined reaches it as a key holding undefined. Dropping those makes
  // the arguments comparable whole, so an unexpected one fails rather than passing
  // through a partial match.
  const lastQueryArguments = (repositoriesResolver) =>
    omitBy(repositoriesResolver.mock.calls.at(-1)[1], isUndefined);

  const applyFilter = async (filters) => {
    findToolbar().vm.$emit('apply-filter', filters);
    await waitForPromises();
  };

  const pageForward = async () => {
    findPagination().vm.$emit('next', findPagination().props('endCursor'));
    await waitForPromises();
  };

  const pageBack = async () => {
    findPagination().vm.$emit('prev', findPagination().props('startCursor'));
    await waitForPromises();
  };

  const applySort = async (sort) => {
    findTable().vm.$emit('sort-changed', sort);
    await waitForPromises();
  };

  const createComponent = async ({
    query = {},
    stubs = {},
    mountFn = shallowMountExtended,
    repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage),
  } = {}) => {
    router = createRouter(BASE_PATH);
    await router.push({ path: '/', query });

    routerPush = jest.spyOn(router, 'push');
    routerReplace = jest.spyOn(router, 'replace');

    wrapper = mountFn(RepositoriesList, {
      router,
      apolloProvider: createMockApollo(
        [[getRepositoriesQuery, mockOrganizationHandler()]],
        { Organization: { artifactRegistryRepositories: repositoriesResolver } },
        // The mock cache is built from whatever cache options it is handed rather than
        // from a merge, so passing the view's own policies alone would drop every global
        // one. Handing it the view's connection policy is what puts the cursor-agnostic
        // cache key under test.
        { typePolicies: { ...globalTypePolicies, ...artifactRegistryTypePolicies } },
      ),
      // `slug` and `clientBaseUrl` are the table's injections, needed by a full mount.
      provide: { organizationGid: ORGANIZATION_GID, slug: SLUG, clientBaseUrl: CLIENT_BASE_URL },
      stubs,
    });

    await nextTick();
  };

  const createResolvedComponent = async (options) => {
    await createComponent(options);
    await waitForPromises();
  };

  it('renders the header, which names the view and carries the create entry', async () => {
    await createResolvedComponent();

    expect(findHeader().exists()).toBe(true);
  });

  describe('while the repositories query is in flight', () => {
    beforeEach(async () => {
      await createComponent();
    });

    it('hands the loading state to the table rather than rendering rows', () => {
      expect(findTable().props()).toMatchObject({ isLoading: true, repositories: [] });
    });

    it('renders no empty state, so an in-flight query is not mistaken for no repositories', () => {
      expect(findEmptyState().exists()).toBe(false);
    });

    it('keeps the toolbar mounted, so the filters stay operable during a refetch', () => {
      expect(findToolbar().exists()).toBe(true);
    });
  });

  describe('when the query returns repositories', () => {
    beforeEach(async () => {
      await createResolvedComponent();
    });

    it('hands the returned page to the table', () => {
      // The list query selects no description, so Apollo resolves the nodes without
      // one. Only the create mutation reads that field.
      expect(findTable().props()).toMatchObject({
        isLoading: false,
        repositories: mockRepositories.map((repository) => omit(repository, 'description')),
      });
    });

    it('renders neither the empty state nor an error', () => {
      expect(findEmptyState().exists()).toBe(false);
      expect(findAlert().exists()).toBe(false);
    });

    it('renders the toolbar', () => {
      expect(findToolbar().exists()).toBe(true);
    });
  });

  describe('when the query returns no repositories', () => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockResolvedValue(mockEmptyRepositoryPage),
      });
    });

    it('explains that the organization holds no repositories yet', () => {
      expect(findEmptyState().props()).toMatchObject({
        title: 'No repositories',
        description: 'This organization has no repositories yet.',
      });
    });

    it('keeps the header, so the first repository can be created from the empty state', () => {
      expect(findHeader().exists()).toBe(true);
    });

    it('renders no table', () => {
      expect(findTable().exists()).toBe(false);
    });

    it('renders no toolbar, because an organization with no repositories has nothing to filter', () => {
      expect(findToolbar().exists()).toBe(false);
    });
  });

  describe('when the query fails', () => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockRejectedValue(new Error('Artifact Registry is down')),
      });
    });

    it('renders the service-unavailable alert', () => {
      expect(findAlert().text()).toBe('The Artifact Registry service is unavailable.');
    });

    it('keeps the header, so the surrounding shell still renders', () => {
      expect(findHeader().exists()).toBe(true);
    });

    it('renders no table', () => {
      expect(findTable().exists()).toBe(false);
    });
  });

  describe('when the connection resolves null', () => {
    beforeEach(async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockResolvedValue(null),
      });
    });

    it('renders the not-found state', () => {
      expect(findNotFound().exists()).toBe(true);
    });

    it('renders no header, so the view never confirms the namespace exists', () => {
      expect(findHeader().exists()).toBe(false);
    });

    it('renders no table, toolbar, empty state, or error', () => {
      expect(findTable().exists()).toBe(false);
      expect(findToolbar().exists()).toBe(false);
      expect(findEmptyState().exists()).toBe(false);
      expect(findAlert().exists()).toBe(false);
    });
  });

  describe('the filter selection', () => {
    it('hands the toolbar the filters the route query carries', async () => {
      await createResolvedComponent({ query: { format: 'maven', kind: 'hosted' } });

      expect(findToolbar().props('filters')).toEqual({ format: 'MAVEN', kind: 'HOSTED' });
    });

    it('hands the toolbar unfiltered filters when the route query carries none', async () => {
      await createResolvedComponent();

      expect(findToolbar().props('filters')).toEqual({ format: null, kind: null });
    });

    it('reads a value the enum does not carry as no filter, so a stale link still renders', async () => {
      await createResolvedComponent({ query: { format: 'rubygems', kind: 'constructor' } });

      expect(findToolbar().props('filters')).toEqual({ format: null, kind: null });
    });

    it('writes an applied selection to the route query in lowercase, so it survives a reload', async () => {
      await createResolvedComponent();

      await applyFilter({ format: 'NPM', kind: 'VIRTUAL' });

      expect(router.currentRoute.query).toEqual({ format: 'npm', kind: 'virtual' });
    });

    it('drops a cleared dimension rather than writing it empty', async () => {
      await createResolvedComponent({ query: { format: 'npm', kind: 'virtual' } });

      await applyFilter({ format: 'NPM', kind: null });

      expect(router.currentRoute.query).toEqual({ format: 'npm' });
    });

    it('drops the active cursor, so a changed selection renders from its first page', async () => {
      await createResolvedComponent({ query: { after: 'END_CURSOR', format: 'npm' } });

      await applyFilter({ format: 'MAVEN', kind: null });

      expect(router.currentRoute.query).toEqual({ format: 'maven' });
    });

    it('keeps the active cursor when the selection is unchanged', async () => {
      await createResolvedComponent({ query: { after: 'END_CURSOR', format: 'npm' } });

      await applyFilter({ format: 'NPM', kind: null });

      expect(router.currentRoute.query).toEqual({ after: 'END_CURSOR', format: 'npm' });
    });

    it('sends the selection to the query, so the rendered list reflects the filters', async () => {
      const repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage);

      await createResolvedComponent({
        query: { format: 'maven', kind: 'hosted' },
        repositoriesResolver,
      });

      expect(repositoriesResolver).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ format: 'MAVEN', kind: 'HOSTED' }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('re-runs the query when the selection changes', async () => {
      const repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage);

      await createResolvedComponent({ repositoriesResolver });
      await applyFilter({ format: 'NPM', kind: null });

      expect(repositoriesResolver).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ format: 'NPM', kind: null }),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('when a filter matches no repositories', () => {
    beforeEach(async () => {
      await createResolvedComponent({
        query: { format: 'npm' },
        stubs: { GlEmptyState },
        repositoriesResolver: jest.fn().mockResolvedValue(mockEmptyRepositoryPage),
      });
    });

    it('distinguishes a filtered miss from an organization with no repositories', () => {
      expect(findEmptyState().props()).toMatchObject({
        title: 'No results found',
        description: 'Edit or clear your filters to see more repositories.',
      });
    });

    it('leaves the toolbar operable, so the filters can be changed from here', () => {
      expect(findToolbar().exists()).toBe(true);
    });

    it('renders no table', () => {
      expect(findTable().exists()).toBe(false);
    });

    it('clears every filter from the route query on request', async () => {
      findClearFilters().vm.$emit('click');
      await waitForPromises();

      expect(router.currentRoute.query).toEqual({});
    });
  });

  describe('the sort selection', () => {
    it('hands the table the sort the route query carries', async () => {
      await createResolvedComponent({ query: { sort: 'downloads_count_asc' } });

      expect(findTable().props('sort')).toEqual({ sortBy: 'downloadsCount', sortDesc: false });
    });

    it('sorts by the newest content first when the route query carries no sort', async () => {
      await createResolvedComponent();

      expect(findTable().props('sort')).toEqual(DEFAULT_SORT);
      expect(router.currentRoute.query).toEqual({});
    });

    it('reads a sort the enum does not carry as the default, so a stale link still renders', async () => {
      // A column Artifact Registry sorts on but the list does not render.
      await createResolvedComponent({ query: { sort: 'artifacts_count_desc' } });

      expect(findTable().props('sort')).toEqual(DEFAULT_SORT);
    });

    it('writes a sort change to the route query in lowercase, so it survives a reload', async () => {
      await createResolvedComponent();

      await applySort({ sortBy: 'sizeBytes', sortDesc: true });

      expect(router.currentRoute.query).toEqual({ sort: 'size_bytes_desc' });
    });

    it('keeps the active filters when the sort changes', async () => {
      await createResolvedComponent({ query: { format: 'npm', kind: 'virtual' } });

      await applySort({ sortBy: 'name', sortDesc: false });

      expect(router.currentRoute.query).toEqual({
        format: 'npm',
        kind: 'virtual',
        sort: 'name_asc',
      });
    });

    it('drops the active cursor, so a re-sorted list renders from its first page', async () => {
      await createResolvedComponent({ query: { after: 'END_CURSOR', sort: 'name_asc' } });

      await applySort({ sortBy: 'name', sortDesc: true });

      expect(router.currentRoute.query).toEqual({ sort: 'name_desc' });
    });

    it('sends the sort to the query, so the rendered order is the one the server applied', async () => {
      const repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage);

      await createResolvedComponent({ repositoriesResolver });

      expect(repositoriesResolver).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sort: 'LAST_UPDATED_AT_DESC' }),
        expect.anything(),
        expect.anything(),
      );
    });

    it('re-runs the query when the sort changes', async () => {
      const repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage);

      await createResolvedComponent({ repositoriesResolver });
      await applySort({ sortBy: 'name', sortDesc: false });

      expect(repositoriesResolver).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ sort: 'NAME_ASC' }),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('the sticky sort', () => {
    useLocalStorageSpy();

    const storeSort = (sort) => localStorage.setItem(STICKY_SORT_STORAGE_KEY, JSON.stringify(sort));

    it('holds the active sort under the sticky-sort key', async () => {
      await createResolvedComponent();

      expect(findLocalStorageSync().props()).toMatchObject({
        storageKey: STICKY_SORT_STORAGE_KEY,
        value: 'LAST_UPDATED_AT_DESC',
      });
    });

    it('writes a sort change to storage, so it outlives the visit', async () => {
      await createResolvedComponent({ stubs: { LocalStorageSync } });

      await applySort({ sortBy: 'name', sortDesc: false });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STICKY_SORT_STORAGE_KEY,
        JSON.stringify('NAME_ASC'),
      );
    });

    it('restores the stored sort into the route query when the query carries none', async () => {
      storeSort('NAME_ASC');

      await createResolvedComponent({ stubs: { LocalStorageSync } });

      expect(router.currentRoute.query).toEqual({ sort: 'name_asc' });
      expect(findTable().props('sort')).toEqual({ sortBy: 'name', sortDesc: false });
    });

    it('replaces the route on a restore, so returning to the list adds no history entry', async () => {
      storeSort('NAME_ASC');

      await createResolvedComponent({ stubs: { LocalStorageSync } });

      expect(routerReplace).toHaveBeenCalledTimes(1);
      expect(routerPush).not.toHaveBeenCalled();
    });

    it('renders the sort the route query carries even when the stored sort differs', async () => {
      storeSort('SIZE_BYTES_ASC');

      await createResolvedComponent({
        query: { sort: 'downloads_count_desc' },
        stubs: { LocalStorageSync },
      });

      expect(router.currentRoute.query).toEqual({ sort: 'downloads_count_desc' });
      expect(findTable().props('sort')).toEqual({ sortBy: 'downloadsCount', sortDesc: true });
    });

    it('falls back to the default sort when the stored sort is one the enum does not carry', async () => {
      storeSort('ARTIFACTS_COUNT_DESC');

      await createResolvedComponent({ stubs: { LocalStorageSync } });

      expect(router.currentRoute.query).toEqual({});
      expect(findTable().props('sort')).toEqual(DEFAULT_SORT);
    });

    it('issues one query on a restore rather than one for the default and another for the stored sort', async () => {
      storeSort('SIZE_BYTES_ASC');
      const repositoriesResolver = jest.fn().mockResolvedValue(mockRepositoryPage);

      await createResolvedComponent({ repositoriesResolver, stubs: { LocalStorageSync } });

      expect(repositoriesResolver.mock.calls.map(([, { sort }]) => sort)).toEqual([
        'SIZE_BYTES_ASC',
      ]);
    });

    // A shallow mount stubs the table away, so only a full one sees the rendered header.
    it('renders the restored sort in the header, not only in the table prop', async () => {
      storeSort('SIZE_BYTES_ASC');

      await createResolvedComponent({
        mountFn: mountExtended,
        stubs: { LocalStorageSync },
      });

      const sortStates = Object.fromEntries(
        wrapper
          .findAllByRole('columnheader')
          .wrappers.map((header) => [
            header.text().trim().split('\n')[0],
            header.attributes('aria-sort'),
          ]),
      );

      expect(sortStates).toMatchObject({ Size: 'ascending', 'Last updated': 'none' });
    });

    it('leaves the route query bare when the stored sort is the default one', async () => {
      storeSort(DEFAULT_SORT_VALUE);

      await createResolvedComponent({ stubs: { LocalStorageSync } });

      expect(router.currentRoute.query).toEqual({});
      expect(routerReplace).not.toHaveBeenCalled();
      expect(findTable().props('sort')).toEqual(DEFAULT_SORT);
    });
  });

  describe('the result-state live region', () => {
    it('is in the DOM before the first result arrives, so a later change is announced', async () => {
      await createComponent();

      expect(findLiveRegion().attributes()).toMatchObject({
        'aria-live': 'polite',
        'aria-atomic': 'true',
      });
    });

    it('announces that the list is loading while the query is in flight', async () => {
      await createComponent();

      expect(findLiveRegion().text()).toBe('Loading repositories.');
    });

    it('announces the result set once the query resolves', async () => {
      await createResolvedComponent();

      expect(findLiveRegion().text()).toBe('Repositories list updated.');
    });

    it('announces the empty state when the query returns no repositories', async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockResolvedValue(mockEmptyRepositoryPage),
      });

      expect(findLiveRegion().text()).toBe('This organization has no repositories yet.');
    });

    it('announces the failure when the query fails', async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockRejectedValue(new Error('Artifact Registry is down')),
      });

      expect(findLiveRegion().text()).toBe('The Artifact Registry service is unavailable.');
    });

    it('announces the not-found state when the connection resolves null', async () => {
      await createResolvedComponent({
        repositoriesResolver: jest.fn().mockResolvedValue(null),
      });

      expect(findLiveRegion().text()).toBe('Page not found');
    });

    it('announces the zero-result state when a filter matches nothing', async () => {
      await createResolvedComponent({
        query: { format: 'npm' },
        repositoriesResolver: jest.fn().mockResolvedValue(mockEmptyRepositoryPage),
      });

      expect(findLiveRegion().text()).toBe('No repositories match your filters.');
    });

    it('announces the updated result set when a filter changes', async () => {
      await createResolvedComponent({
        query: { format: 'npm' },
        repositoriesResolver: jest.fn().mockResolvedValue(mockEmptyRepositoryPage),
      });

      await applyFilter({ format: null, kind: null });

      expect(findLiveRegion().text()).toBe('This organization has no repositories yet.');
    });

    // A sort change leaves the result state itself untouched, so the region only
    // announces again because its content is replaced while the re-sorted page loads.
    it('replaces its content while a re-sorted page is in flight', async () => {
      let resolveResortedPage;
      const repositoriesResolver = jest
        .fn()
        .mockResolvedValueOnce(mockRepositoryPage)
        .mockReturnValueOnce(
          new Promise((resolve) => {
            resolveResortedPage = resolve;
          }),
        );

      await createResolvedComponent({ repositoriesResolver });

      await applySort({ sortBy: 'name', sortDesc: false });

      expect(findLiveRegion().text()).toBe('Loading repositories.');

      resolveResortedPage(mockRepositoryPage);
      await waitForPromises();

      expect(findLiveRegion().text()).toBe('Repositories list updated.');
    });
  });

  describe('keyset pagination', () => {
    // Slices the pair of pages the way the connection does: the second page is the one
    // after the first page's end cursor, and every other request answers the first page,
    // including the walk back from the second page's start cursor.
    const pagedRepositoriesResolver = () =>
      jest
        .fn()
        .mockImplementation((_, { after }) =>
          after === FIRST_PAGE_END_CURSOR ? mockSecondRepositoryPage : mockFirstRepositoryPage,
        );

    const namesOf = ({ nodes }) => nodes.map(({ name }) => name);

    it('drives the pager from the page info the connection returns', async () => {
      await createResolvedComponent({ repositoriesResolver: pagedRepositoriesResolver() });

      expect(findPagination().props()).toMatchObject({
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: FIRST_PAGE_END_CURSOR,
      });
    });

    it.each`
      page          | query                                   | pageArguments
      ${'first'}    | ${{}}                                   | ${{ first: GRAPHQL_PAGE_SIZE }}
      ${'next'}     | ${{ after: FIRST_PAGE_END_CURSOR }}     | ${{ first: GRAPHQL_PAGE_SIZE, after: FIRST_PAGE_END_CURSOR }}
      ${'previous'} | ${{ before: SECOND_PAGE_START_CURSOR }} | ${{ last: GRAPHQL_PAGE_SIZE, before: SECOND_PAGE_START_CURSOR }}
    `('requests the $page page the route query names', async ({ query, pageArguments }) => {
      const repositoriesResolver = pagedRepositoriesResolver();

      await createResolvedComponent({ query, repositoriesResolver });

      expect(lastQueryArguments(repositoriesResolver)).toStrictEqual({
        format: null,
        kind: null,
        sort: DEFAULT_SORT_VALUE,
        ...pageArguments,
      });
    });

    describe('paging forward', () => {
      beforeEach(async () => {
        await createResolvedComponent({ repositoriesResolver: pagedRepositoriesResolver() });
        await pageForward();
      });

      it('writes the end cursor to the route query, so the page is shareable and survives a reload', () => {
        expect(router.currentRoute.query).toEqual({ after: FIRST_PAGE_END_CURSOR });
      });

      it('renders the next page alone, so a page replaces the previous one rather than extending it', () => {
        expect(renderedNames()).toEqual(namesOf(mockSecondRepositoryPage));
      });
    });

    describe('paging back', () => {
      beforeEach(async () => {
        await createResolvedComponent({ repositoriesResolver: pagedRepositoriesResolver() });
        await pageForward();
        await pageBack();
      });

      it('replaces the forward cursor in the route query with the start cursor', () => {
        expect(router.currentRoute.query).toEqual({ before: SECOND_PAGE_START_CURSOR });
      });

      it('renders the first page again', () => {
        expect(renderedNames()).toEqual(namesOf(mockFirstRepositoryPage));
      });
    });

    it('drops an active backward cursor when the selection changes, so it renders from its first page', async () => {
      await createResolvedComponent({
        query: { before: SECOND_PAGE_START_CURSOR, format: 'npm' },
        repositoriesResolver: pagedRepositoriesResolver(),
      });

      await applyFilter({ format: 'MAVEN', kind: null });

      expect(router.currentRoute.query).toEqual({ format: 'maven' });
    });

    it('announces the result set again on a page change, so an unchanged message still reaches a reader', async () => {
      await createResolvedComponent({ repositoriesResolver: pagedRepositoriesResolver() });

      expect(findLiveRegion().text()).toBe('Repositories list updated.');

      await router.push({ path: '/', query: { after: FIRST_PAGE_END_CURSOR } });
      await nextTick();

      // A live region reads what changed, so a page landing in the same result state
      // needs the message to leave before it comes back.
      expect(findLiveRegion().text()).not.toBe('Repositories list updated.');

      await waitForPromises();

      expect(findLiveRegion().text()).toBe('Repositories list updated.');
    });
  });
});
