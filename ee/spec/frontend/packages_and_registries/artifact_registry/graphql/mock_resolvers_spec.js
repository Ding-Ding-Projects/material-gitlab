import createMockApollo from 'helpers/mock_apollo_helper';
import { typePolicies as globalTypePolicies } from '~/lib/graphql';
import { typePolicies } from 'ee/packages_and_registries/artifact_registry/graphql/cache_config';
import {
  clearMockRepositories,
  mockResolvers,
} from 'ee/packages_and_registries/artifact_registry/graphql/mock_resolvers';
import { seededRepositories } from 'ee/packages_and_registries/artifact_registry/graphql/seed_data';
import createRepositoryMutation from 'ee/packages_and_registries/artifact_registry/graphql/mutations/create_repository.mutation.graphql';
import updateRepositoryMutation from 'ee/packages_and_registries/artifact_registry/graphql/mutations/update_repository.mutation.graphql';
import deleteRepositoryMutation from 'ee/packages_and_registries/artifact_registry/graphql/mutations/delete_repository.mutation.graphql';
import { SLUG } from '../mock_data';

describe('Artifact registry mock resolvers', () => {
  let client;

  const MOCK_NEW_REPOSITORY = {
    slug: SLUG,
    name: 'my-repository',
    format: 'MAVEN',
    kind: 'HOSTED',
    visibility: 'PRIVATE',
    description: 'A hosted Maven repository',
  };

  const createRepository = (overrides = {}) =>
    client.mutate({
      mutation: createRepositoryMutation,
      variables: { input: { ...MOCK_NEW_REPOSITORY, ...overrides } },
    });

  const updateRepository = (overrides = {}) =>
    client.mutate({
      mutation: updateRepositoryMutation,
      variables: {
        input: {
          slug: SLUG,
          name: 'my-repository',
          visibility: 'PRIVATE',
          description: 'An edited description',
          ...overrides,
        },
      },
    });

  const deleteRepository = (name) =>
    client.mutate({
      mutation: deleteRepositoryMutation,
      variables: { input: { slug: SLUG, name } },
    });

  const readRepositories = (args) =>
    mockResolvers.Organization.artifactRegistryRepositories(undefined, args);

  const readRepository = (name) =>
    mockResolvers.Organization.artifactRegistryRepository(null, { name });

  const seeded = (name) => seededRepositories().find((repository) => repository.name === name);

  const readImages = (repository, args) =>
    mockResolvers.ArtifactRegistryRepository.images(repository, args);

  const readPackages = (repository, args) =>
    mockResolvers.ArtifactRegistryRepository.packages(repository, args);

  const readImage = (repository, id) =>
    mockResolvers.ArtifactRegistryRepository.image(repository, { id });

  const readPackage = (repository, id) =>
    mockResolvers.ArtifactRegistryRepository.package(repository, { id });

  const readArtifactsCount = (repository) =>
    mockResolvers.ArtifactRegistryRepository.artifactsCount(repository);

  const readCreatedBy = () => mockResolvers.ArtifactRegistryRepository.createdBy();

  beforeEach(() => {
    // The resolvers delay so a consuming view exercises its loading state. Apollo
    // schedules that timeout asynchronously, so advancing Jest's timers cannot reach it;
    // collapsing the delay keeps these assertions about behavior rather than timing.
    jest.spyOn(global, 'setTimeout').mockImplementation((callback) => callback());

    clearMockRepositories();

    const mockApollo = createMockApollo([], mockResolvers, {
      typePolicies: { ...globalTypePolicies, ...typePolicies },
    });
    client = mockApollo.clients.defaultClient;
  });

  describe('create mutation', () => {
    it('returns the created repository with no errors', async () => {
      const { data } = await createRepository();

      expect(data.createRepository.errors).toEqual([]);
      expect(data.createRepository.repository).toMatchObject({
        name: 'my-repository',
        format: 'MAVEN',
        kind: 'HOSTED',
        visibility: 'PRIVATE',
        description: 'A hosted Maven repository',
      });
    });

    it('stamps the creation timestamp, which the detail sidebar renders', async () => {
      const { data } = await createRepository();

      expect(Date.parse(data.createRepository.repository.createdAt)).not.toBeNaN();
    });

    it('defaults a missing description to null rather than omitting the field', async () => {
      const { data } = await createRepository({ description: null });

      expect(data.createRepository.repository.description).toBe(null);
    });

    describe('when a repository of that name already exists', () => {
      beforeEach(async () => {
        await createRepository();
      });

      it('surfaces the collision as a recoverable payload error', async () => {
        const { data } = await createRepository();

        expect(data.createRepository.errors).toEqual(['Name has already been taken.']);
        expect(data.createRepository.repository).toBe(null);
      });
    });

    describe.each(['-', '?', 'UPPERCASE', 'trailing-', 'has space'])(
      'when the name %p does not match the contract pattern',
      (name) => {
        it('refuses it with a recoverable payload error', async () => {
          const { data } = await createRepository({ name });

          expect(data.createRepository.errors).toEqual([
            'Name must use lowercase letters, digits, periods, underscores, and hyphens, and start and end with a letter or digit.',
          ]);
          expect(data.createRepository.repository).toBe(null);
        });
      },
    );

    it('refuses a name longer than 255 characters', async () => {
      const { data } = await createRepository({ name: 'a'.repeat(256) });

      expect(data.createRepository.errors).toEqual(['Name cannot be longer than 255 characters.']);
    });

    it('refuses an empty name, which the contract pattern already excludes', async () => {
      const { data } = await createRepository({ name: '' });

      expect(data.createRepository.errors).toEqual([
        'Name must use lowercase letters, digits, periods, underscores, and hyphens, and start and end with a letter or digit.',
      ]);
    });

    it('refuses a description longer than 1024 characters', async () => {
      const { data } = await createRepository({ description: 'a'.repeat(1025) });

      expect(data.createRepository.errors).toEqual([
        'Description cannot be longer than 1024 characters.',
      ]);
      expect(data.createRepository.repository).toBe(null);
    });

    it('accepts an absent description without bounding it', async () => {
      const { data } = await createRepository({ description: null });

      expect(data.createRepository.errors).toEqual([]);
    });

    // `RegExp.test` coerces its argument, so a missing name would match the pattern as the
    // string "undefined" and be accepted. These assert the guard that runs ahead of it.
    describe.each([
      ['undefined', undefined],
      ['null', null],
    ])('when the name is %s', (_, name) => {
      it('refuses it as required rather than creating a repository', async () => {
        const { data } = await createRepository({ name });

        expect(data.createRepository.errors).toEqual(['Name is required.']);
        expect(data.createRepository.repository).toBe(null);
      });
    });
  });

  describe('the repositories connection', () => {
    it('starts empty, so the list renders its empty state until a create adds one', async () => {
      const connection = await readRepositories();

      expect(connection.nodes).toEqual([]);
    });

    it('returns the repositories created since the last reset', async () => {
      await createRepository({ name: 'first' });
      await createRepository({ name: 'second' });

      const connection = await readRepositories();

      expect(connection.nodes.map(({ name }) => name)).toEqual(['first', 'second']);
    });

    it('hands back a copy, so a caller cannot mutate the backing store', async () => {
      await createRepository();

      const firstRead = await readRepositories();
      firstRead.nodes.pop();

      const secondRead = await readRepositories();
      expect(secondRead.nodes).toHaveLength(1);
    });

    // The create mutation stamps every repository HOSTED, so the seeded store varies by
    // format alone. Virtual and Remote are unreachable here rather than untested: the
    // kind filter is exercised on the one value the mock can hold and on one it cannot.
    describe('the filter arguments', () => {
      beforeEach(async () => {
        await createRepository({ name: 'a-maven', format: 'MAVEN' });
        await createRepository({ name: 'b-npm', format: 'NPM' });
        await createRepository({ name: 'c-maven', format: 'MAVEN' });
      });

      it('narrows the connection to a format', async () => {
        const connection = await readRepositories({ format: 'MAVEN' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['a-maven', 'c-maven']);
      });

      it('narrows the connection to a kind', async () => {
        const connection = await readRepositories({ kind: 'HOSTED' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['a-maven', 'b-npm', 'c-maven']);
      });

      it('applies both filters together rather than either alone', async () => {
        const connection = await readRepositories({ format: 'NPM', kind: 'HOSTED' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['b-npm']);
      });

      it('returns nothing when the filters match no repository', async () => {
        const connection = await readRepositories({ format: 'NPM', kind: 'VIRTUAL' });

        expect(connection.nodes).toEqual([]);
      });

      it('treats a null filter as unfiltered, so a cleared dimension widens the set', async () => {
        const connection = await readRepositories({ format: null, kind: null });

        expect(connection.nodes).toHaveLength(3);
      });
    });

    // The routed view drives these arguments through the pager, so the mock slices the
    // store the way the connection does rather than answering the whole set every time.
    describe('the paging arguments', () => {
      const namesOf = ({ nodes }) => nodes.map(({ name }) => name);

      const cursorFor = (name) => window.btoa(JSON.stringify({ key: name }));

      beforeEach(async () => {
        await createRepository({ name: 'first' });
        await createRepository({ name: 'second' });
        await createRepository({ name: 'third' });
      });

      it('answers the whole set when the caller asks for no page', async () => {
        expect(namesOf(await readRepositories())).toEqual(['first', 'second', 'third']);
      });

      it('answers the leading rows for a forward page with no cursor', async () => {
        expect(namesOf(await readRepositories({ first: 2 }))).toEqual(['first', 'second']);
      });

      it('resumes after the row the forward cursor names', async () => {
        const page = await readRepositories({ first: 2, after: cursorFor('first') });

        expect(namesOf(page)).toEqual(['second', 'third']);
      });

      it('stops before the row the backward cursor names', async () => {
        const page = await readRepositories({ last: 2, before: cursorFor('third') });

        expect(namesOf(page)).toEqual(['first', 'second']);
      });

      it('pages from the unbounded edge when the cursor names no row it holds', async () => {
        const page = await readRepositories({ first: 2, after: cursorFor('no-such-repository') });

        expect(namesOf(page)).toEqual(['first', 'second']);
      });

      it('reports the cursors of the rows the page holds', async () => {
        const { pageInfo } = await readRepositories({ first: 2 });

        expect(pageInfo).toEqual({
          __typename: 'PageInfo',
          hasPreviousPage: false,
          hasNextPage: true,
          startCursor: cursorFor('first'),
          endCursor: cursorFor('second'),
        });
      });

      it('reports both edges reached on the last page of a walk forward', async () => {
        const { pageInfo } = await readRepositories({ first: 2, after: cursorFor('second') });

        expect(pageInfo).toMatchObject({ hasPreviousPage: true, hasNextPage: false });
      });

      it('reports no cursors for a page holding no rows', async () => {
        const { pageInfo } = await readRepositories({ format: 'DOCKER' });

        expect(pageInfo).toMatchObject({ startCursor: null, endCursor: null });
      });
    });

    // Every repository this mutation stamps carries the same counters and no timestamp,
    // so name is the one column the seeded store can order by.
    describe('the sort argument', () => {
      beforeEach(async () => {
        await createRepository({ name: 'b-second' });
        await createRepository({ name: 'a-first' });
      });

      it('orders the connection by the requested column and direction', async () => {
        const connection = await readRepositories({ sort: 'NAME_ASC' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['a-first', 'b-second']);
      });

      it('reverses the order for the descending direction', async () => {
        const connection = await readRepositories({ sort: 'NAME_DESC' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['b-second', 'a-first']);
      });

      it('leaves the order alone for a sort the enum does not carry', async () => {
        const connection = await readRepositories({ sort: 'ARTIFACTS_COUNT_DESC' });

        expect(connection.nodes.map(({ name }) => name)).toEqual(['b-second', 'a-first']);
      });
    });
  });

  describe('the single-repository read', () => {
    // Existence-hiding: the read answers the same way for a repository that does not
    // exist and for one the viewer may not see, so the detail and edit pages have one
    // state to render for both. Null rather than an error is also the read-404 the
    // resolver answers with once Artifact Registry backs it.
    it('resolves null when no repository carries that name', async () => {
      expect(await readRepository('missing')).toBe(null);
    });

    it('resolves the repository the name identifies', async () => {
      await createRepository({ name: 'first' });
      await createRepository({ name: 'second' });

      expect(await readRepository('second')).toMatchObject({ name: 'second' });
    });

    it('resolves every field the write recorded', async () => {
      await createRepository();

      expect(await readRepository('my-repository')).toMatchObject({
        name: 'my-repository',
        format: 'MAVEN',
        kind: 'HOSTED',
        visibility: 'PRIVATE',
        description: 'A hosted Maven repository',
      });
    });

    it('hands back a copy, so a caller cannot mutate the backing store', async () => {
      await createRepository();

      const read = await readRepository('my-repository');
      read.description = 'Mutated by the caller';

      expect((await readRepository('my-repository')).description).toBe('A hosted Maven repository');
    });
  });

  describe('the artifact connections', () => {
    it.each(['payment-service', 'oci-artifacts'])(
      'resolves images and no packages for %s',
      async (name) => {
        const repository = seeded(name);

        expect(await readImages(repository)).toMatchObject({
          __typename: 'ArtifactRegistryImageConnection',
          nodes: repository.artifacts,
        });
        expect(await readPackages(repository)).toBe(null);
      },
    );

    it.each(['payment-core', 'ui-components'])(
      'resolves packages and no images for %s',
      async (name) => {
        const repository = seeded(name);

        expect(await readPackages(repository)).toMatchObject({
          __typename: 'ArtifactRegistryPackageConnection',
          nodes: repository.artifacts,
        });
        expect(await readImages(repository)).toBe(null);
      },
    );

    it('resolves an empty connection for a repository the browser created', async () => {
      await createRepository();

      expect(await readPackages(await readRepository('my-repository'))).toMatchObject({
        __typename: 'ArtifactRegistryPackageConnection',
        nodes: [],
      });
    });
  });

  describe('the single-artifact reads', () => {
    const firstArtifact = (repositoryName) => seeded(repositoryName).artifacts[0];

    it.each(['payment-service', 'oci-artifacts'])(
      'resolves an image and no package for %s',
      async (name) => {
        const repository = seeded(name);
        const { id } = firstArtifact(name);

        expect(await readImage(repository, id)).toMatchObject({ id });
        expect(await readPackage(repository, id)).toBe(null);
      },
    );

    it.each(['payment-core', 'ui-components'])(
      'resolves a package and no image for %s',
      async (name) => {
        const repository = seeded(name);
        const { id } = firstArtifact(name);

        expect(await readPackage(repository, id)).toMatchObject({ id });
        expect(await readImage(repository, id)).toBe(null);
      },
    );

    it('resolves null for an artifact the repository does not hold', async () => {
      expect(await readPackage(seeded('payment-core'), firstArtifact('ui-components').id)).toBe(
        null,
      );
    });

    it('hands out a copy, so a caller cannot edit the store through it', async () => {
      const repository = seeded('payment-core');
      const { id } = firstArtifact('payment-core');
      const artifact = await readPackage(repository, id);
      artifact.artifactId = 'edited';

      expect((await readPackage(repository, id)).artifactId).toBe('core');
    });
  });

  describe('the paging arguments', () => {
    const idsOf = ({ nodes }) => nodes.map(({ id }) => id);

    const cursorFor = ({ id }) => window.btoa(JSON.stringify({ key: id }));

    const npmRepository = () => seeded('ui-components');

    const containerRepository = () => seeded('oci-artifacts');

    it('answers the whole set when the caller asks for no page', async () => {
      const repository = npmRepository();

      expect(idsOf(await readPackages(repository))).toEqual(
        repository.artifacts.map(({ id }) => id),
      );
    });

    it('answers the leading rows for a forward page with no cursor', async () => {
      const repository = npmRepository();
      const [first, second] = repository.artifacts;

      expect(idsOf(await readPackages(repository, { first: 2 }))).toEqual([first.id, second.id]);
    });

    it('resumes after the row the forward cursor names', async () => {
      const repository = npmRepository();
      const [first, second, third] = repository.artifacts;

      const page = await readPackages(repository, { first: 2, after: cursorFor(first) });

      expect(idsOf(page)).toEqual([second.id, third.id]);
    });

    it('stops before the row the backward cursor names', async () => {
      const repository = npmRepository();
      const [first, second, third] = repository.artifacts;

      const page = await readPackages(repository, { last: 2, before: cursorFor(third) });

      expect(idsOf(page)).toEqual([first.id, second.id]);
    });

    it('pages from the unbounded edge when the cursor names no row it holds', async () => {
      const repository = npmRepository();
      const [first, second] = repository.artifacts;

      const page = await readPackages(repository, { first: 2, after: cursorFor({ id: 'gone' }) });

      expect(idsOf(page)).toEqual([first.id, second.id]);
    });

    it('reports the cursors of the rows the page holds', async () => {
      const repository = npmRepository();
      const [first, second] = repository.artifacts;

      const { pageInfo } = await readPackages(repository, { first: 2 });

      expect(pageInfo).toEqual({
        __typename: 'PageInfo',
        hasPreviousPage: false,
        hasNextPage: true,
        startCursor: cursorFor(first),
        endCursor: cursorFor(second),
      });
    });

    it('reports no next page on the last page', async () => {
      const repository = npmRepository();
      const [first] = repository.artifacts;

      const { pageInfo } = await readPackages(repository, { first: 2, after: cursorFor(first) });

      expect(pageInfo).toMatchObject({ hasPreviousPage: true, hasNextPage: false });
    });

    it('slices the images connection by the same cursors', async () => {
      const repository = containerRepository();
      const [first, second] = repository.artifacts;

      const page = await readImages(repository, { first: 1, after: cursorFor(first) });

      expect(idsOf(page)).toEqual([second.id]);
    });
  });

  describe('the artifact counter', () => {
    it.each(['payment-core', 'payment-service', 'ui-components', 'oci-artifacts'])(
      'counts the rows %s resolves',
      async (name) => {
        const repository = seeded(name);
        const connection = (await readImages(repository)) ?? (await readPackages(repository));

        expect(readArtifactsCount(repository)).toBe(String(connection.nodes.length));
      },
    );

    it('resolves a string, the shape the BigInt scalar serializes to', () => {
      expect(readArtifactsCount(seeded('ui-components'))).toBe('3');
    });

    it('counts none for a repository the browser created', async () => {
      await createRepository();

      expect(readArtifactsCount(await readRepository('my-repository'))).toBe('0');
    });
  });

  describe('the attribution joins', () => {
    it('resolves the signed-in user', () => {
      window.gon = {
        current_user_id: 7,
        current_username: 'alex',
        current_user_fullname: 'Alex Turner',
        current_user_avatar_url: '/avatar.png',
      };

      expect(readCreatedBy()).toMatchObject({
        __typename: 'UserCore',
        id: 'gid://gitlab/User/7',
        name: 'Alex Turner',
        avatarUrl: '/avatar.png',
        webPath: '/alex',
      });
    });

    it('resolves null when nobody is signed in', () => {
      window.gon = {};

      expect(readCreatedBy()).toBe(null);
    });
  });

  describe('update mutation', () => {
    beforeEach(async () => {
      await createRepository();
    });

    it('returns the updated repository with no errors', async () => {
      const { data } = await updateRepository();

      expect(data.updateRepository.errors).toEqual([]);
      expect(data.updateRepository.repository).toMatchObject({
        name: 'my-repository',
        description: 'An edited description',
      });
    });

    it('writes the change through to the store', async () => {
      await updateRepository();

      expect((await readRepository('my-repository')).description).toBe('An edited description');
    });

    it('leaves the immutable fields and the content counters alone', async () => {
      await updateRepository();

      expect(await readRepository('my-repository')).toMatchObject({
        format: 'MAVEN',
        kind: 'HOSTED',
        downloadsCount: '0',
        sizeBytes: '0',
        lastUpdatedAt: null,
      });
    });

    it('clears the description when one is not given', async () => {
      await updateRepository({ description: null });

      expect((await readRepository('my-repository')).description).toBe(null);
    });

    it('refuses a description longer than 1024 characters', async () => {
      const { data } = await updateRepository({ description: 'a'.repeat(1025) });

      expect(data.updateRepository.errors).toEqual([
        'Description cannot be longer than 1024 characters.',
      ]);
      expect(data.updateRepository.repository).toBe(null);
    });

    // A repository that went away between the prefill and the submit: recoverable, so
    // the form renders it rather than the page replacing itself with an error.
    it('surfaces an unknown name as a recoverable payload error', async () => {
      const { data } = await updateRepository({ name: 'no-such-repository' });

      expect(data.updateRepository.errors).toEqual(['Repository not found.']);
      expect(data.updateRepository.repository).toBe(null);
    });

    it('replaces the stored entry rather than mutating a node it already handed out', async () => {
      const connection = await readRepositories();

      await updateRepository();

      expect(connection.nodes[0].description).toBe('A hosted Maven repository');
    });
  });

  describe('delete mutation', () => {
    it('removes the repository the name identifies, leaving the rest', async () => {
      await createRepository({ name: 'first' });
      await createRepository({ name: 'second' });

      const { data } = await deleteRepository('first');

      expect(data.deleteRepository.errors).toEqual([]);
      expect((await readRepositories()).nodes).toMatchObject([{ name: 'second' }]);
    });

    it('takes the repository out of the single-repository read too', async () => {
      await createRepository({ name: 'first' });
      await deleteRepository('first');

      expect(await readRepository('first')).toBe(null);
    });

    // Delete is idempotent at Artifact Registry, and existence-hiding means a caller
    // cannot be told a repository was already missing. So a repeat delete succeeds,
    // deliberately unlike a read, which resolves null on a miss.
    it('succeeds when the repository is already gone', async () => {
      await createRepository({ name: 'first' });
      await deleteRepository('first');

      const { data } = await deleteRepository('first');

      expect(data.deleteRepository.errors).toEqual([]);
    });

    it('succeeds when the repository never existed', async () => {
      const { data } = await deleteRepository('never-existed');

      expect(data.deleteRepository.errors).toEqual([]);
    });
  });
});
