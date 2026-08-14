import { REPOSITORY_FORMAT_VALUES } from 'ee/packages_and_registries/artifact_registry/constants';
import { seededRepositories } from 'ee/packages_and_registries/artifact_registry/graphql/seed_data';

describe('Artifact registry seed data', () => {
  it('seeds a repository for every format', () => {
    const formats = seededRepositories().map(({ format }) => format);

    expect(formats.sort()).toEqual([...REPOSITORY_FORMAT_VALUES].sort());
  });

  it('names each repository once', () => {
    const names = seededRepositories().map(({ name }) => name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('hands out a fresh copy, so a caller cannot edit the seed', () => {
    const [repository] = seededRepositories();
    repository.description = 'Edited';

    expect(seededRepositories()[0].description).not.toBe('Edited');
  });
});
