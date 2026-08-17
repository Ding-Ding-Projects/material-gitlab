/**
 * Sample repository dataset, ported from the Repository.dc.html design's `state`.
 *
 * This module owns only the raw data an API would return. The derived view model
 * that the design's `renderVals()` computed (matching, breadcrumbs, entry icons,
 * commit avatars) lives in Repository.vue as computed properties instead, since
 * that logic stays client-side even once this data is fetched from a real API.
 *
 * Shape notes for a real API integration:
 *  - `tree` is keyed by the joined path string ('' is the repository root) mapping
 *    to an array of TreeEntry. A real API would page this per-directory instead of
 *    shipping the whole tree; the `tree[path]` lookup is the seam to swap for a
 *    `GET /projects/:id/repository/tree?path=...&ref=...` call.
 *  - `blobs` is keyed by file name and holds raw file content lines; a real API
 *    would fetch this on demand via `GET /projects/:id/repository/files/:path`.
 *  - `when` fields are pre-formatted relative time strings in this sample; a real
 *    API would send an ISO-8601 timestamp for the client to format instead.
 */

/** @typedef {{ name: string, kind: 'dir'|'file', message: string, when: string }} TreeEntry */
/** @typedef {{ size: string, lines: string[] }} Blob */
/** @typedef {{ sha: string, message: string, author: string, when: string }} Commit */
/** @typedef {{ name: string, percent: number, token: string }} LanguageShare */

const treeEntry = (name, kind, message, when) => ({ name, kind, message, when });

const SAMPLE_TREE = {
  '': [
    treeEntry('app', 'dir', 'Move pipeline badges to tonal containers', '2h ago'),
    treeEntry('config', 'dir', 'Add regex search feature flag', '1d ago'),
    treeEntry('db', 'dir', 'Add index on issues.moved_to_id', '2d ago'),
    treeEntry('doc', 'dir', 'Document regex search mode', '5h ago'),
    treeEntry('ee', 'dir', 'Security dashboard triage drawer', '3d ago'),
    treeEntry('lib', 'dir', 'Backoff for state query polling', '1d ago'),
    treeEntry('spec', 'dir', 'Update empty-state snapshots', '2h ago'),
    treeEntry('.gitlab-ci.yml', 'file', 'Split jest into 4 shards', '6h ago'),
    treeEntry('Gemfile', 'file', 'Bump rails to 7.2.4', '1w ago'),
    treeEntry('README.md', 'file', 'Add MD3 rewrite notes', '3h ago'),
    treeEntry('package.json', 'file', 'Add virtual-scroll dependency', '2h ago'),
  ],
  app: [
    treeEntry('assets', 'dir', 'Tonal container colors', '2h ago'),
    treeEntry('controllers', 'dir', 'Regex param validation', '1d ago'),
    treeEntry('models', 'dir', 'Issue board position index', '2d ago'),
    treeEntry('services', 'dir', 'MergeRequests::MergeService backoff', '1d ago'),
  ],
  'app/assets': [
    treeEntry('images', 'dir', 'Refresh ci favicons', '2w ago'),
    treeEntry('javascripts', 'dir', 'Virtualize board columns', '2h ago'),
    treeEntry('stylesheets', 'dir', 'MD3 token layer', '4h ago'),
  ],
};

const SAMPLE_BLOBS = {
  'README.md': {
    size: '4.1 KB',
    lines: [
      '# phoenix-api',
      '',
      'GitLab-hosted service powering the Phoenix product line.',
      '',
      '## Development',
      '',
      '```',
      'bundle install && yarn install',
      'bin/rails s',
      '```',
      '',
      'See doc/ for the MD3 rewrite notes and the regex search spec.',
    ],
  },
  '.gitlab-ci.yml': {
    size: '2.8 KB',
    lines: [
      'stages:',
      '  - build',
      '  - test',
      '  - deploy',
      '',
      'jest:',
      '  stage: test',
      '  parallel: 4',
      '  script:',
      '    - yarn jest --shard $CI_NODE_INDEX/$CI_NODE_TOTAL',
    ],
  },
  Gemfile: {
    size: '1.2 KB',
    lines: ["source 'https://rubygems.org'", '', "gem 'rails', '~> 7.2.4'", "gem 'pg'", "gem 'sidekiq'"],
  },
  'package.json': {
    size: '0.9 KB',
    lines: ['{', '  "name": "phoenix-api",', '  "dependencies": {', '    "vue": "^3.4",', '    "virtual-scroll": "^2.1"', '  }', '}'],
  },
};

const SAMPLE_COMMITS = [
  { sha: 'a41f9c2e', message: 'Virtualize board column lists', author: 'Jun Park', when: '2h ago' },
  { sha: '7be20d11', message: 'Move pipeline badges to tonal containers', author: 'Dana Weiss', when: '6h ago' },
  { sha: '90c3aa17', message: 'Backoff for state query polling', author: 'Omar Haddad', when: '1d ago' },
  { sha: '5f01bd93', message: 'Add regex search feature flag', author: 'Jun Park', when: '1d ago' },
  { sha: 'c2d84b60', message: 'Update empty-state snapshots', author: 'Dana Weiss', when: '2h ago' },
];

const SAMPLE_LANGUAGES = [
  { name: 'Ruby', percent: 51, token: 'prim' },
  { name: 'Vue', percent: 28, token: 'good' },
  { name: 'JavaScript', percent: 14, token: 'warn' },
  { name: 'Other', percent: 7, token: 'outl' },
];

const SAMPLE_BRANCHES = ['main', 'perf/board-virtual', 'fix/badge-contrast', 'feat/mr-regex-search'];

const SAMPLE_PROJECT = {
  name: 'phoenix-api',
  visibility: 'Internal',
  stars: 214,
  starred: false,
  forks: 38,
  commitCount: 2481,
  branchCount: SAMPLE_BRANCHES.length,
  tagCount: 42,
  storage: '96.2 MB',
  cloneUrls: {
    https: 'https://gitlab.example.com/phoenix/phoenix-api.git',
    ssh: 'git@gitlab.example.com:phoenix/phoenix-api.git',
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Returns a fresh, independently-mutable copy of the sample repository dataset.
 * A real integration replaces the body of this function with data fetched from
 * the project, repository tree, and commits APIs while keeping the same shape.
 */
export function createSampleRepositoryData() {
  return {
    project: clone(SAMPLE_PROJECT),
    languages: clone(SAMPLE_LANGUAGES),
    branches: clone(SAMPLE_BRANCHES),
    defaultBranch: 'main',
    tree: clone(SAMPLE_TREE),
    blobs: clone(SAMPLE_BLOBS),
    commits: clone(SAMPLE_COMMITS),
  };
}

export default createSampleRepositoryData;
