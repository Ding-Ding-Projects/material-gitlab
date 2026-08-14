// Runtime Apollo local resolvers standing in for the Artifact Registry GraphQL
// schema, which does not exist yet. They back the organization's registry, the
// repositories connection, the single-repository read, the create, update, and delete
// mutations, and the activate mutation, so the read and write flows are exercisable in a
// browser ahead of the backend, per doc/development/fe_guide/graphql.md ("Mocking API
// response with local Apollo cache"). The precedent for shipping a runtime mock merged is
// ee/app/assets/javascripts/cd/graphql/mock_resolvers.js.
//
// To remove once the backend ships the types, the reads, and the mutations:
//   1. delete this file and graphql/typedefs.graphql,
//   2. drop the `mockResolvers`, `typeDefs`, and `possibleTypes` arguments in
//      repositories/index.js, settings/index.js, and setup/index.js,
//   3. remove the `@client` directive from the query and mutation documents.
// Tracked in the follow-up issue linked from the merge request.
import { TYPENAME_USER } from '~/graphql_shared/constants';
import { convertToGraphQLId } from '~/graphql_shared/utils';
import { userPath } from '~/lib/utils/path_helpers/user';
import { s__, sprintf } from '~/locale';
import {
  REPOSITORY_DESCRIPTION_MAX_LENGTH,
  REPOSITORY_KIND_HOSTED,
  REPOSITORY_NAME_MAX_LENGTH,
  REPOSITORY_NAME_PATTERN,
  TYPENAME_ARTIFACT_REGISTRY,
  TYPENAME_ARTIFACT_REGISTRY_REPOSITORY,
} from '../constants';
import { isContainerFormat, toTableSort } from '../utils';
import { seededRepositories } from './seed_data';

let mockRepositories = seededRepositories();

// The handle a claim resolves to, whatever was typed. It has to be the slug the
// repositories route serves - `Organizations::ArtifactRegistry::STUB_SLUG` - or the
// post-activation redirect lands on a 404 until the resolved handle arrives.
const MOCK_SERVED_HANDLE = 'acme';

const MOCK_CLAIMED_HANDLE = 'taken-handle';

// A date in the past, so the registry the settings section reports on reads as one the
// organization has held for a while rather than one claimed this instant.
const MOCK_REGISTRY_CREATED_AT = '2026-01-15T09:00:00Z';

// Mocks network latency by introducing a configurable pause before resolving, matching real network behaviour.
const delay = () =>
  new Promise((resolve) => {
    const MOCK_LATENCY_MS = 500;

    setTimeout(resolve, MOCK_LATENCY_MS);
  });

export const clearMockRepositories = () => {
  mockRepositories = [];
};

const nameValidationError = (name) => {
  if (typeof name !== 'string') {
    return s__('ArtifactRegistry|Name is required.');
  }

  if (mockRepositories.some((repository) => repository.name === name)) {
    return s__('ArtifactRegistry|Name has already been taken.');
  }

  if (name.length > REPOSITORY_NAME_MAX_LENGTH) {
    return sprintf(s__('ArtifactRegistry|Name cannot be longer than %{maxLength} characters.'), {
      maxLength: REPOSITORY_NAME_MAX_LENGTH,
    });
  }

  if (!REPOSITORY_NAME_PATTERN.test(name)) {
    return s__(
      'ArtifactRegistry|Name must use lowercase letters, digits, periods, underscores, and hyphens, and start and end with a letter or digit.',
    );
  }

  return null;
};

const descriptionValidationError = (description) => {
  if (typeof description !== 'string') return null;

  if (description.length > REPOSITORY_DESCRIPTION_MAX_LENGTH) {
    return sprintf(
      s__('ArtifactRegistry|Description cannot be longer than %{maxLength} characters.'),
      { maxLength: REPOSITORY_DESCRIPTION_MAX_LENGTH },
    );
  }

  return null;
};

const findMockRepository = (name) =>
  mockRepositories.find((repository) => repository.name === name) ?? null;

// An Artifact Registry cursor is opaque: a caller may only hand one back (ADR-009).
// This one carries the key of the row it points at, encoded rather than passed bare
// so no reader can start reading it as a name or an id.
const encodeCursor = (key) => window.btoa(JSON.stringify({ key }));

// A cursor naming a row the filters exclude, or a repository that has since gone away,
// reads as no cursor at all rather than as an empty page.
const cursorIndex = (rows, cursor, keyOf) => {
  const index = rows.findIndex((row) => encodeCursor(keyOf(row)) === cursor);

  return index === -1 ? null : index;
};

// `after` names the last row of the page being left and `before` its first, so a
// forward page starts after the one and a backward page ends at the other. Apollo hands
// a resolver `null` rather than `{}` when its field is called with no arguments.
const paginate = (rows, keyOf, pageArguments) => {
  const { first, last, before, after } = pageArguments ?? {};

  const afterIndex = after ? cursorIndex(rows, after, keyOf) : null;
  const beforeIndex = before ? cursorIndex(rows, before, keyOf) : null;

  const windowStart = afterIndex === null ? 0 : afterIndex + 1;
  const windowEnd = beforeIndex === null ? rows.length : beforeIndex;

  // A backward page fills from the end of the window, a forward page from its start.
  const start = last ? Math.max(windowEnd - last, windowStart) : windowStart;
  const end = first ? Math.min(start + first, windowEnd) : windowEnd;
  const nodes = rows.slice(start, end);

  return {
    nodes,
    pageInfo: {
      __typename: 'PageInfo',
      hasPreviousPage: start > 0,
      hasNextPage: end < rows.length,
      startCursor: nodes.length ? encodeCursor(keyOf(nodes[0])) : null,
      endCursor: nodes.length ? encodeCursor(keyOf(nodes.at(-1))) : null,
    },
  };
};

// A repository is addressed by name and every artifact shape carries an id, while only
// some carry a name.
const repositoryKey = ({ name }) => name;

const artifactKey = ({ id }) => id;

const findMockArtifact = (artifacts, id) => {
  const artifact = artifacts.find((candidate) => candidate.id === id) ?? null;

  return artifact && { ...artifact };
};

const mockCurrentUser = () => {
  const { current_user_id: id, current_username: username } = window.gon ?? {};

  if (!id) return null;

  return {
    __typename: 'UserCore',
    id: convertToGraphQLId(TYPENAME_USER, id),
    name: window.gon.current_user_fullname,
    avatarUrl: window.gon.current_user_avatar_url,
    webPath: userPath(username),
  };
};

// The counters arrive as strings, and content that never changed carries no timestamp
// and reads as the oldest.
const COMPARABLE_VALUE = {
  name: ({ name }) => name,
  downloadsCount: ({ downloadsCount }) => Number(downloadsCount ?? 0),
  sizeBytes: ({ sizeBytes }) => Number(sizeBytes ?? 0),
  lastUpdatedAt: ({ lastUpdatedAt }) => (lastUpdatedAt ? Date.parse(lastUpdatedAt) : 0),
};

const sortRepositories = (repositories, sort) => {
  const tableSort = toTableSort(sort);

  if (!tableSort) return repositories;

  const valueOf = COMPARABLE_VALUE[tableSort.sortBy];
  const direction = tableSort.sortDesc ? -1 : 1;

  return [...repositories].sort((left, right) => {
    const leftValue = valueOf(left);
    const rightValue = valueOf(right);

    if (leftValue === rightValue) return 0;

    return (leftValue > rightValue ? 1 : -1) * direction;
  });
};

export const mockResolvers = {
  Organization: {
    // Exactly the field set the resolver will carry - handle, status, and createdAt, with
    // `status` a String rather than an enum and no namespace UUID - so a schema mismatch
    // cannot hide behind a permissive mock.
    artifactRegistry: async () => {
      await delay();

      return {
        __typename: TYPENAME_ARTIFACT_REGISTRY,
        handle: MOCK_SERVED_HANDLE,
        status: 'active',
        createdAt: MOCK_REGISTRY_CREATED_AT,
      };
    },
    artifactRegistryRepositories: async (_, { format, kind, sort, ...pageArguments } = {}) => {
      await delay();

      // The real connection filters, orders, and pages server-side, so the mock does the
      // same; without it the toolbar, the headers, and the pager would change nothing.
      const matching = mockRepositories.filter(
        (repository) =>
          (!format || repository.format === format) && (!kind || repository.kind === kind),
      );
      // Ordered before slicing, so a page holds the rows that sort into it.
      const sorted = sortRepositories(matching, sort);

      return {
        __typename: 'ArtifactRegistryRepositoryConnection',
        ...paginate(sorted, repositoryKey, pageArguments),
      };
    },
    // Existence-hiding: the read resolves null both for a repository that does not
    // exist and for one the viewer may not see, which is the read-404 the resolver
    // will answer with once the backend lands. The copy keeps a caller from mutating
    // the store by reference.
    artifactRegistryRepository: async (_, { name }) => {
      await delay();

      const repository = findMockRepository(name);

      return repository && { ...repository };
    },
  },
  [TYPENAME_ARTIFACT_REGISTRY_REPOSITORY]: {
    images: async ({ format, artifacts }, pageArguments) => {
      if (!isContainerFormat(format)) return null;

      await delay();

      return {
        __typename: 'ArtifactRegistryImageConnection',
        ...paginate(artifacts, artifactKey, pageArguments),
      };
    },
    packages: async ({ format, artifacts }, pageArguments) => {
      if (isContainerFormat(format)) return null;

      await delay();

      return {
        __typename: 'ArtifactRegistryPackageConnection',
        ...paginate(artifacts, artifactKey, pageArguments),
      };
    },
    image: async ({ format, artifacts }, { id }) => {
      if (!isContainerFormat(format)) return null;

      await delay();

      return findMockArtifact(artifacts, id);
    },
    package: async ({ format, artifacts }, { id }) => {
      if (isContainerFormat(format)) return null;

      await delay();

      return findMockArtifact(artifacts, id);
    },
    artifactsCount: ({ artifacts }) => String(artifacts.length),
    createdBy: () => mockCurrentUser(),
    updatedBy: () => mockCurrentUser(),
  },
  Mutation: {
    artifactRegistryActivate: async (_, { input }) => {
      await delay();

      const { handle } = input;

      if (handle === MOCK_CLAIMED_HANDLE) {
        return {
          __typename: 'LocalArtifactRegistryActivatePayload',
          registry: null,
          errors: [s__('ArtifactRegistry|Handle has already been taken.')],
        };
      }

      return {
        __typename: 'LocalArtifactRegistryActivatePayload',
        registry: {
          __typename: TYPENAME_ARTIFACT_REGISTRY,
          handle: MOCK_SERVED_HANDLE,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        errors: [],
      };
    },
    artifactRegistryRepositoryCreate: async (_, { input }) => {
      await delay();

      const { name, format, visibility, description } = input;
      const error = nameValidationError(name) ?? descriptionValidationError(description);

      if (error) {
        return {
          __typename: 'LocalArtifactRegistryRepositoryCreatePayload',
          repository: null,
          errors: [error],
        };
      }

      const repository = {
        __typename: TYPENAME_ARTIFACT_REGISTRY_REPOSITORY,
        name,
        format,
        kind: REPOSITORY_KIND_HOSTED,
        visibility,
        description: description ?? null,
        // A repository is created empty and its content has never changed, which is
        // what the list renders until Artifact Registry backs these counters.
        downloadsCount: '0',
        sizeBytes: '0',
        createdAt: new Date().toISOString(),
        lastUpdatedAt: null,
        artifacts: [],
      };

      mockRepositories.push(repository);

      return {
        __typename: 'LocalArtifactRegistryRepositoryCreatePayload',
        repository,
        errors: [],
      };
    },
    artifactRegistryRepositoryUpdate: async (_, { input }) => {
      await delay();

      const { name, visibility, description } = input;
      const index = mockRepositories.findIndex((repository) => repository.name === name);

      // A repository that has gone away between the prefill and the submit is a
      // recoverable payload error rather than a top-level one, so the form can render
      // it and the rest of the view stays put.
      const error =
        index === -1
          ? s__('ArtifactRegistry|Repository not found.')
          : descriptionValidationError(description);

      if (error) {
        return {
          __typename: 'LocalArtifactRegistryRepositoryUpdatePayload',
          repository: null,
          errors: [error],
        };
      }

      // The connection hands out the stored objects themselves, so the entry is
      // replaced rather than mutated: an already-delivered node must not change
      // underneath its reader. `lastUpdatedAt` is left alone because editing metadata
      // does not change repository content, which is what that timestamp reports.
      const updated = {
        ...mockRepositories[index],
        visibility,
        description: description ?? null,
      };

      mockRepositories.splice(index, 1, updated);

      return {
        __typename: 'LocalArtifactRegistryRepositoryUpdatePayload',
        repository: { ...updated },
        errors: [],
      };
    },
    // Deleting a repository that is already gone succeeds rather than erroring: the
    // Artifact Registry delete is idempotent, and existence-hiding means a caller
    // cannot be told a repository is missing anyway. This is deliberately the
    // opposite of a read, which resolves null on a miss.
    artifactRegistryRepositoryDelete: async (_, { input }) => {
      await delay();

      const { name } = input;
      const index = mockRepositories.findIndex((repository) => repository.name === name);

      if (index !== -1) {
        mockRepositories.splice(index, 1);
      }

      return {
        __typename: 'LocalArtifactRegistryRepositoryDeletePayload',
        errors: [],
      };
    },
  },
};
