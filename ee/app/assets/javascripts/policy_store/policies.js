import Api from 'ee/api';
import { TRIGGERS } from './catalog/triggers';

const triggerLabel = (triggerType) =>
  TRIGGERS.find(({ id }) => id === triggerType)?.label || triggerType;

const scopedProjectsCount = (policyScope) => {
  const ids = policyScope?.projects?.including?.ids;

  return Array.isArray(ids) ? ids.length : 0;
};

// The list renders `type`, `status` and `scope` columns; the editor reads the policy
// back through deserializePolicyData, which expects `trigger_id`.
const toListPolicy = (policy) => ({
  ...policy,
  trigger_id: policy.trigger_type,
  type: triggerLabel(policy.trigger_type),
  status: policy.lifecycle_state,
  scope: scopedProjectsCount(policy.policy_scope),
});

/**
 * Fetches the organization's policies from the Policy Store API, mapped for the
 * list and the editor. Rejects with the request error on failure.
 *
 * @param {string|number} organizationId
 * @returns {Promise<Array>}
 */
export const fetchPolicies = async (organizationId) => {
  const { data } = await Api.getPolicyStorePolicies(organizationId);

  return data.map(toListPolicy);
};
