import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCommitMetadataBatch } from './line_count.mjs';

const firstCommit = 'a'.repeat(40);
const secondCommit = 'b'.repeat(40);
const trailer = 'Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>\n';

// This is the exact stream shape emitted by `git log --format=...%x00`:
// each NUL-terminated record is followed by Git's format-record newline.
const gitOutput = [
  `${firstCommit}\0Alice\0alice@example.com\0${trailer}\0\n`,
  `${secondCommit}\0Bob\0bob@example.com\0\0\n`,
].join('');

test('parses NUL-formatted git log records without leaking record newlines', () => {
  const records = parseCommitMetadataBatch(gitOutput, [firstCommit, secondCommit]);

  assert.deepEqual(records, [
    {
      commit: firstCommit,
      author: 'Alice',
      email: 'alice@example.com',
      trailers: trailer,
      automation: true,
    },
    {
      commit: secondCommit,
      author: 'Bob',
      email: 'bob@example.com',
      trailers: '',
      automation: false,
    },
  ]);
});

test('rejects an omitted record instead of silently misattributing lines', () => {
  assert.throws(
    () => parseCommitMetadataBatch(gitOutput, [firstCommit]),
    /malformed commit metadata/,
  );
});
