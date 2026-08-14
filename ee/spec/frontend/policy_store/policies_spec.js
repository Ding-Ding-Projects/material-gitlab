import MockAdapter from 'axios-mock-adapter';
import axios from '~/lib/utils/axios_utils';
import { HTTP_STATUS_INTERNAL_SERVER_ERROR, HTTP_STATUS_OK } from '~/lib/utils/http_status';
import { fetchPolicies } from 'ee/policy_store/policies';

const POLICIES_URL = '/api/v4/organizations/1/security/policy_store';

describe('policy store policies', () => {
  let mock;

  beforeEach(() => {
    window.gon = { api_version: 'v4' };
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
  });

  const apiPolicy = {
    id: 7,
    name: 'Production gate',
    description: 'Gates production deployments',
    trigger_type: 'deployment_requested',
    rules: [{ type: 'custom', value: 'package governance' }],
    actions: [{ type: 'block' }],
    policy_scope: { projects: { including: { ids: [1, 2, 3] } } },
    mode: 'enforce',
    lifecycle_state: 'active',
    updated_at: '2026-08-11T10:00:00Z',
  };

  it('maps the API policy for the list and the editor', async () => {
    mock.onGet(POLICIES_URL).reply(HTTP_STATUS_OK, [apiPolicy]);

    const policies = await fetchPolicies(1);

    expect(policies[0]).toMatchObject({
      id: 7,
      name: 'Production gate',
      type: 'Deployment',
      trigger_id: 'deployment_requested',
      status: 'active',
      scope: 3,
      mode: 'enforce',
    });
  });

  it('falls back to the raw trigger type when the catalog does not know it', async () => {
    mock
      .onGet(POLICIES_URL)
      .reply(HTTP_STATUS_OK, [{ ...apiPolicy, trigger_type: 'merge_requested' }]);

    const policies = await fetchPolicies(1);

    expect(policies[0].type).toBe('merge_requested');
  });

  it('counts no scoped projects when the policy scope has none', async () => {
    mock.onGet(POLICIES_URL).reply(HTTP_STATUS_OK, [{ ...apiPolicy, policy_scope: null }]);

    const policies = await fetchPolicies(1);

    expect(policies[0].scope).toBe(0);
  });

  it('rejects with the request error when the API fails', async () => {
    mock.onGet(POLICIES_URL).reply(HTTP_STATUS_INTERNAL_SERVER_ERROR);

    await expect(fetchPolicies(1)).rejects.toThrow();
  });
});
