// Hand-written route inventory. An unavailable capability still has an explicit
// metadata section; silently dropping its host binding is an integration error.
export const SETTINGS_ROUTE_METADATA_FIELDS = Object.freeze([
  'permissions', 'permissionsMetadata', 'additionalMetadata', 'advancedMetadata',
  'serviceDeskMetadata', 'specialMetadata', 'secretsMetadata', 'duoContextMetadata',
]);

export function assertSettingsRouteConfig(config) {
  if (!config || !config.projectId || typeof config.fullPath !== 'string' || !config.fullPath || typeof config.generalAllowed !== 'boolean') throw new Error('The current project Settings identity is incomplete.');
  for (const field of SETTINGS_ROUTE_METADATA_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(config, field) || !config[field] || typeof config[field] !== 'object' || Array.isArray(config[field])) throw new Error(`The Settings capability binding ${field} is missing or invalid.`);
  }
  return config;
}
