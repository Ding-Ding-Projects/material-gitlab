import { nDaysBefore, nMonthsBefore } from '~/lib/utils/datetime/date_calculation_utility';
import {
  REPOSITORY_KIND_HOSTED,
  REPOSITORY_VISIBILITY_PRIVATE,
  TYPENAME_ARTIFACT_REGISTRY_IMAGE,
  TYPENAME_ARTIFACT_REGISTRY_MAVEN_PACKAGE,
  TYPENAME_ARTIFACT_REGISTRY_NPM_PACKAGE,
  TYPENAME_ARTIFACT_REGISTRY_REPOSITORY,
} from '../constants';

const monthsAgo = (months) => nMonthsBefore(new Date(), months).toISOString();

const daysAgo = (days) => nDaysBefore(new Date(), days).toISOString();

// Artifact Registry addresses an artifact by an opaque UUID, unlike a repository, which
// it addresses by name (api/openapi/v1.yaml, `ArtifactId`). Sequential rather than random
// so a seeded artifact keeps its URL across a reload.
let artifactSequence = 0;

const nextArtifactId = () => {
  artifactSequence += 1;

  return `01937b2e-0000-7000-8000-${String(artifactSequence).padStart(12, '0')}`;
};

const image = (name) => ({
  __typename: TYPENAME_ARTIFACT_REGISTRY_IMAGE,
  id: nextArtifactId(),
  name,
});

const mavenPackage = (groupId, artifactId) => ({
  __typename: TYPENAME_ARTIFACT_REGISTRY_MAVEN_PACKAGE,
  id: nextArtifactId(),
  groupId,
  artifactId,
});

const npmPackage = ({ scope = null, name, versionsCount }) => ({
  __typename: TYPENAME_ARTIFACT_REGISTRY_NPM_PACKAGE,
  id: nextArtifactId(),
  scope,
  name,
  versionsCount,
});

const generate = (count, build) => Array.from({ length: count }, (_, index) => build(index + 1));

/* eslint-disable @gitlab/require-i18n-strings -- Mock data, not interface copy */
const SEEDED_REPOSITORIES = [
  {
    name: 'payment-core',
    format: 'MAVEN',
    description:
      'Maven repository for storing and distributing build artifacts, dependencies, and packages for the payments domain.',
    downloadsCount: '6910',
    sizeBytes: '597688320',
    lastUpdatedAt: daysAgo(2),
    artifacts: [
      mavenPackage('com.company.payment', 'core'),
      mavenPackage('com.company.payment', 'api'),
      mavenPackage('com.company.payment', 'gateway'),
      ...generate(22, (n) => mavenPackage('com.company.payment', `connector-${n}`)),
    ],
  },
  {
    name: 'payment-service',
    format: 'DOCKER',
    description: 'Docker repository for storing and distributing container images.',
    downloadsCount: '5991',
    sizeBytes: '770703360',
    lastUpdatedAt: daysAgo(9),
    artifacts: [
      image('payment-service'),
      image('api-gateway'),
      image('auth-service'),
      ...generate(21, (n) => image(`worker-${n}`)),
    ],
  },
  {
    name: 'ui-components',
    format: 'NPM',
    description: null,
    downloadsCount: '8733',
    sizeBytes: '653262848',
    lastUpdatedAt: monthsAgo(1),
    artifacts: [
      npmPackage({ scope: '@company', name: 'design-system', versionsCount: 12 }),
      npmPackage({ scope: '@company', name: 'icons', versionsCount: 5 }),
      npmPackage({ name: 'design-tokens', versionsCount: 34 }),
    ],
  },
  {
    name: 'oci-artifacts',
    format: 'OCI',
    description: null,
    downloadsCount: '18550',
    sizeBytes: '383778816',
    lastUpdatedAt: null,
    artifacts: [image('helm-charts'), image('wasm-modules')],
  },
];
/* eslint-enable @gitlab/require-i18n-strings */

export const seededRepositories = () =>
  SEEDED_REPOSITORIES.map((repository) => ({
    __typename: TYPENAME_ARTIFACT_REGISTRY_REPOSITORY,
    kind: REPOSITORY_KIND_HOSTED,
    visibility: REPOSITORY_VISIBILITY_PRIVATE,
    createdAt: monthsAgo(3),
    ...repository,
  }));
