/**
 * Framework-neutral entry point for the reusable Material System substrate.
 * Keep registrations here so consumers import one stable module boundary.
 */

export * from './registry';
export * from './settings';
export * from './tokens';
export * from './notifications';
export * from './regex-builder';

export { default as notificationCenter } from './notifications';
export { default as RegexBuilder } from './regex-builder';

