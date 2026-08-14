import { removeClientSetsFromDocument } from '@apollo/client/utilities';
import { visit } from 'graphql';
import getRepositoriesQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repositories.query.graphql';
import getRepositoryQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repository.query.graphql';
import getRepositoryDetailQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repository_detail.query.graphql';
import getRepositoryImagesQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repository_images.query.graphql';
import getRepositoryPackagesQuery from 'ee/packages_and_registries/artifact_registry/graphql/queries/get_repository_packages.query.graphql';

// Apollo drops a removed @client field's own argument variables but never descends into
// its selection set, so a variable only a nested client field named survives into a
// document that no longer references it. Nothing else fails on that: a mock link answers
// the query regardless, and the source document does use the variable, so schema
// validation passes too. It surfaces only against a real endpoint, as a rejected query.
const unusedVariablesInServerDocument = (document) => {
  const serverDocument = removeClientSetsFromDocument(document);

  if (!serverDocument) return [];

  const referenced = new Set();

  visit(serverDocument, {
    VariableDefinition: () => false,
    Variable: ({ name }) => {
      referenced.add(name.value);
    },
  });

  return serverDocument.definitions
    .flatMap(({ variableDefinitions = [] }) => variableDefinitions)
    .map(({ variable }) => variable.name.value)
    .filter((name) => !referenced.has(name));
};

describe('Artifact registry query documents', () => {
  describe.each([
    ['getArtifactRegistryRepositories', getRepositoriesQuery],
    ['getArtifactRegistryRepository', getRepositoryQuery],
    ['getArtifactRegistryRepositoryDetail', getRepositoryDetailQuery],
    ['getArtifactRegistryRepositoryImages', getRepositoryImagesQuery],
    ['getArtifactRegistryRepositoryPackages', getRepositoryPackagesQuery],
  ])('%s, with its client fields stripped as Apollo strips them', (_name, document) => {
    it('leaves behind no variable the server rejects as declared but not used', () => {
      expect(unusedVariablesInServerDocument(document)).toEqual([]);
    });
  });
});
