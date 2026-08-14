/**
 * Framework-neutral entry point for the reusable Material System substrate.
 * Keep registrations here so consumers import one stable module boundary.
 */

export * from './registry';
export * from './settings';
export * from './tokens';
export * from './notifications';
export * from './regex-builder';
export * from './appearance';
export * from './capabilities';
export * from './command-palette';
export * from './file-converter';
export * from './history';
export * from './logo';
export * from './narrator';
export * from './runtime';
export * from './scheduled-settings';
export * from './school-mode';
export * from './status-hub';
export * from './tabs';
export * from './vocabulary';

export { default as notificationCenter } from './notifications';
export { default as RegexBuilder } from './regex-builder';
