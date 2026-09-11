import csrf from '~/lib/utils/csrf';

const CUSTOM_EMAIL_ERROR = 'Custom email request failed. Check the settings and try again.';
const MALFORMED_RESPONSE = 'Service Desk returned an invalid settings response.';
const CONTROL_OR_SPACE = /[\\\u0000-\u0020]/;
const CUSTOM_EMAIL_STATES = new Set(['started', 'finished', 'failed']);
const CUSTOM_EMAIL_ERRORS = new Set([
  'smtp_host_issue',
  'invalid_credentials',
  'mail_not_received_within_timeframe',
  'incorrect_from',
  'incorrect_token',
  'read_timeout',
  'incorrect_forwarding_target',
]);
const localPath = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  !CONTROL_OR_SPACE.test(value);
const optionalString = (value) => value == null || typeof value === 'string';
const optionalBoolean = (value) => value == null || typeof value === 'boolean';
const serviceDeskPayload = (data) => {
  const keys = [
    'service_desk_enabled',
    'service_desk_address',
    'issue_template_key',
    'outgoing_name',
    'project_key',
    'tickets_confidential_by_default',
    'reopen_issue_on_external_participant_note',
    'add_external_participants_from_cc',
  ];
  if (
    !data ||
    typeof data !== 'object' ||
    !keys.every((key) => Object.prototype.hasOwnProperty.call(data, key)) ||
    typeof data.service_desk_enabled !== 'boolean' ||
    typeof data.service_desk_address !== 'string' ||
    !optionalString(data.issue_template_key) ||
    !optionalString(data.outgoing_name) ||
    !optionalString(data.project_key) ||
    !optionalBoolean(data.tickets_confidential_by_default) ||
    !optionalBoolean(data.reopen_issue_on_external_participant_note) ||
    !optionalBoolean(data.add_external_participants_from_cc)
  )
    throw new Error(MALFORMED_RESPONSE);
  return data;
};
const customEmailState = (data = {}) => {
  if (
    !data ||
    typeof data !== 'object' ||
    !optionalString(data.custom_email) ||
    typeof data.custom_email_enabled !== 'boolean' ||
    !optionalString(data.custom_email_verification_state) ||
    !optionalString(data.custom_email_verification_error) ||
    !optionalString(data.custom_email_smtp_address)
  )
    throw new Error(MALFORMED_RESPONSE);
  return {
    custom_email: data.custom_email || '',
    custom_email_enabled: data.custom_email_enabled,
    custom_email_verification_state: CUSTOM_EMAIL_STATES.has(data.custom_email_verification_state)
      ? data.custom_email_verification_state
      : '',
    custom_email_verification_error: CUSTOM_EMAIL_ERRORS.has(data.custom_email_verification_error)
      ? data.custom_email_verification_error
      : '',
    custom_email_smtp_address: data.custom_email_smtp_address || '',
  };
};

const parseResponse = async (response, { customEmail = false } = {}) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      customEmail
        ? CUSTOM_EMAIL_ERROR
        : payload.message || `Service Desk request failed (${response.status})`,
    );
  return customEmail ? customEmailState(payload) : serviceDeskPayload(payload);
};

const request = async (fetchImpl, url, method, body, options = {}) => {
  if (typeof fetchImpl !== 'function') throw new Error('Service Desk transport is unavailable');
  if (!localPath(url)) throw new Error('Service Desk endpoint must be a local path');
  const response = await fetchImpl(url, {
    method,
    credentials: 'same-origin',
    redirect: 'error',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf.token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse(response, options);
};

export const normalizeServiceDesk = (data = {}) => ({
  enabled: Boolean(data.service_desk_enabled ?? data.enabled),
  incomingEmail: String(data.service_desk_address || data.incomingEmail || ''),
  issueTemplateKey: String(data.issue_template_key || data.issueTemplateKey || ''),
  fileTemplateProjectId: data.file_template_project_id ?? data.fileTemplateProjectId ?? null,
  outgoingName: String(data.outgoing_name || data.outgoingName || ''),
  projectKey: String(data.project_key || data.projectKey || ''),
  ticketsConfidentialByDefault: Boolean(
    data.tickets_confidential_by_default ?? data.ticketsConfidentialByDefault,
  ),
  reopenIssueOnExternalParticipantNote: Boolean(
    data.reopen_issue_on_external_participant_note ?? data.reopenIssueOnExternalParticipantNote,
  ),
  addExternalParticipantsFromCc: Boolean(
    data.add_external_participants_from_cc ?? data.addExternalParticipantsFromCc,
  ),
});

export function createServiceDeskAdapter({
  endpoint,
  customEmailEndpoint,
  allowed = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!localPath(endpoint)) throw new Error('Service Desk endpoint must be a local path');
  if (customEmailEndpoint && !localPath(customEmailEndpoint))
    throw new Error('Custom email endpoint must be a local path');
  const requirePermission = () => {
    if (allowed !== true) throw new Error('Service Desk permission is required');
  };
  return {
    async load() {
      requirePermission();
      return normalizeServiceDesk(await request(fetchImpl, endpoint, 'GET'));
    },
    async save(changes) {
      requirePermission();
      return normalizeServiceDesk(await request(fetchImpl, endpoint, 'PUT', changes));
    },
    async loadCustomEmail() {
      requirePermission();
      return request(fetchImpl, customEmailEndpoint, 'GET', undefined, { customEmail: true });
    },
    async saveCustomEmail(payload) {
      requirePermission();
      return request(fetchImpl, customEmailEndpoint, 'POST', payload, { customEmail: true });
    },
    async toggleCustomEmail(enabled) {
      requirePermission();
      return request(
        fetchImpl,
        customEmailEndpoint,
        'PUT',
        { custom_email_enabled: enabled === true },
        { customEmail: true },
      );
    },
    async resetCustomEmail() {
      requirePermission();
      return request(fetchImpl, customEmailEndpoint, 'DELETE', undefined, { customEmail: true });
    },
  };
}
