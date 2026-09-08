#!/usr/bin/env node
/**
 * Executable negative regression check for the hand-written site feature inventory.
 * It validates the inventory's seven evidence dimensions and then proves that
 * removing any one dimension makes validation fail. This is intentionally
 * structural: planned rows remain honest until their implementation evidence exists.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');
const inventoryPath = path.join(root, 'data', 'completeness-inventory.json');
const dimensions = ['implementation', 'documentation', 'localization', 'persistence', 'tests', 'capture', 'evidence'];

/**
 * A row may name a path that does not exist yet ONLY while it is planned.
 * The moment a row claims "implemented" or "verified", every path it names is
 * a claim about something on disk, and the check reads the disk rather than
 * believing the row. Without this, a row could point its documentation and
 * evidence at files nobody ever wrote and still pass.
 */
function missingClaimedPaths(inventory) {
  const missing = [];
  for (const row of inventory?.features ?? []) {
    if (row?.status !== 'implemented' && row?.status !== 'verified') continue;
    for (const dimension of dimensions) {
      for (const relative of row?.[dimension]?.paths ?? []) {
        if (typeof relative !== 'string') continue;
        const absolute = path.resolve(repoRoot, relative);
        if (!existsSync(absolute)) missing.push(`${row.id}.${dimension} claims ${relative}, which does not exist`);
      }
    }
  }
  return missing;
}

function failures(inventory) {
  const result = [];
  if (!inventory || inventory.schemaVersion !== 1 || inventory.generated !== false) {
    result.push('inventory must be schemaVersion 1 and hand-written (generated=false)');
  }
  if (!Array.isArray(inventory?.features) || inventory.features.length === 0) {
    result.push('inventory must contain at least one feature row');
    return result;
  }
  const ids = new Set();
  for (const [index, row] of inventory.features.entries()) {
    const prefix = `features[${index}]`;
    if (!row || typeof row !== 'object') {
      result.push(`${prefix} must be an object`);
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(row.id || '') || ids.has(row.id)) result.push(`${prefix}.id must be unique kebab-case`);
    ids.add(row.id);
    if (!row.label || typeof row.label !== 'string') result.push(`${prefix}.label is required`);
    if (!['planned', 'implemented', 'verified'].includes(row.status)) result.push(`${prefix}.status is invalid`);
    for (const dimension of dimensions) {
      const entry = row[dimension];
      if (!entry || typeof entry !== 'object') {
        result.push(`${prefix}.${dimension} is required`);
        continue;
      }
      if (!Array.isArray(entry.paths) || entry.paths.length === 0 || entry.paths.some((value) => typeof value !== 'string' || value.length === 0)) {
        result.push(`${prefix}.${dimension}.paths must be a non-empty string array`);
      }
      if (typeof entry.assertion !== 'string' || entry.assertion.trim().length < 12) {
        result.push(`${prefix}.${dimension}.assertion must be a hand-written boundary`);
      }
    }
  }
  return result;
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function runNegativeRegression(inventory) {
  const failuresFound = [];
  for (const dimension of dimensions) {
    for (let index = 0; index < inventory.features.length; index += 1) {
      const mutated = clone(inventory);
      delete mutated.features[index][dimension].assertion;
      if (failures(mutated).length === 0) failuresFound.push(`${mutated.features[index].id}.${dimension}`);
    }
  }
  return failuresFound;
}

const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const baselineFailures = [...failures(inventory), ...missingClaimedPaths(inventory)];
if (baselineFailures.length) {
  console.error('Completeness check failed for the baseline inventory:');
  for (const failure of baselineFailures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  const escapedMutations = runNegativeRegression(inventory);
  if (escapedMutations.length) {
    console.error('Completeness check negative regression failed; mutations escaped validation:');
    for (const mutation of escapedMutations) console.error(`- ${mutation}`);
    process.exitCode = 1;
  } else {
    console.log(`Completeness check passed: ${inventory.features.length} hand-written rows; ${dimensions.length} evidence dimensions; every removal was rejected.`);
  }
}
