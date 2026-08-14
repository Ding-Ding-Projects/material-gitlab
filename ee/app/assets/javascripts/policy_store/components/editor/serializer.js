import { RULE_CUSTOM } from '../../catalog/rules';

// Translates between the editor's form state and the shape the Policy Store API persists.

/**
 * Serializes one selected rule into the `{ type, value }` pair the API persists.
 *
 * For the Rego rule `value` is the program itself, because
 * EE::Ci::ProcessBuildService#rego_of reads `rule['value']` for `type == 'custom'`.
 * For typed rules `value` is the rule's configuration object.
 *
 * @param {string} id - Catalog id of the rule; persisted as the rule's `type`.
 * @param {Object} config - The rule's configuration from the form state.
 * @returns {{ type: string, value: (string|Object) }} The rule as persisted.
 */
const serializeRule = (id, config) =>
  id === RULE_CUSTOM
    ? { type: RULE_CUSTOM, value: config.policy || '' }
    : { type: id, value: { ...config } };

/**
 * Reverses serializeRule: reads one persisted rule into a `[id, config]` entry
 * of the form state.
 *
 * @param {{ type: string, value: (string|Object) }} rule - The rule as persisted.
 * @returns {[string, Object]} The rule's catalog id and its form configuration.
 */
const deserializeRule = ({ type, value }) =>
  type === RULE_CUSTOM ? [type, { policy: value || '' }] : [type, { ...value }];

/**
 * Serializes the editor's form state into the policy data the API persists.
 *
 * Actions are flat — `{ type, ...config }` — because the deployment gate reads
 * action settings as siblings of `type`, e.g. `action['approvals_required']`.
 *
 * @param {Object} [formState] - The editor's form state.
 * @param {string|null} [formState.trigger] - Selected trigger id.
 * @param {Object} [formState.triggerConfig] - The trigger's configuration.
 * @param {string[]} [formState.rules] - Selected rule ids.
 * @param {Object} [formState.ruleConfigs] - Rule configurations keyed by rule id.
 * @param {string[]} [formState.actions] - Selected action ids.
 * @param {Object} [formState.actionConfigs] - Action configurations keyed by action id.
 * @returns {{ trigger_id: (string|null), trigger_config: Object, rules: Object[],
 *   actions: Object[] }} The policy data as persisted.
 */
export const serializePolicyData = ({
  trigger = null,
  triggerConfig = {},
  rules = [],
  ruleConfigs = {},
  actions = [],
  actionConfigs = {},
} = {}) => ({
  trigger_id: trigger,
  trigger_config: trigger ? { ...triggerConfig } : {},
  rules: rules.map((id) => serializeRule(id, ruleConfigs[id] || {})),
  actions: actions.map((id) => ({ type: id, ...(actionConfigs[id] || {}) })),
});

const firstPerType = (entries) => {
  const seen = new Map();

  entries.forEach(([type, config]) => {
    if (!seen.has(type)) seen.set(type, config);
  });

  return [...seen.entries()];
};

/**
 * Reverses serializePolicyData: reads persisted policy data into the editor's
 * form state.
 *
 * @param {Object} [policyData] - The policy data as persisted.
 * @param {string} [policyData.trigger_id] - The trigger's catalog id.
 * @param {Object} [policyData.trigger_config] - The trigger's configuration.
 * @param {Object[]} [policyData.rules] - Rules as `{ type, value }` pairs.
 * @param {Object[]} [policyData.actions] - Actions as flat `{ type, ...config }` objects.
 * @returns {Object} The editor's form state: selected ids under `trigger`, `rules`
 *   and `actions`, their configurations under `triggerConfig`, `ruleConfigs` and
 *   `actionConfigs`.
 */
export const deserializePolicyData = ({
  trigger_id: triggerId,
  trigger_config: triggerConfig,
  rules,
  actions,
} = {}) => {
  const ruleEntries = firstPerType((rules || []).map(deserializeRule));
  const actionEntries = firstPerType((actions || []).map(({ type, ...config }) => [type, config]));

  return {
    trigger: triggerId || null,
    triggerConfig: { ...triggerConfig },
    rules: ruleEntries.map(([type]) => type),
    ruleConfigs: Object.fromEntries(ruleEntries),
    actions: actionEntries.map(([type]) => type),
    actionConfigs: Object.fromEntries(actionEntries),
  };
};

/**
 * @returns {Object} The empty form state for a policy that has nothing selected yet.
 */
export const emptyPolicyData = () => ({
  trigger: null,
  triggerConfig: {},
  rules: [],
  ruleConfigs: {},
  actions: [],
  actionConfigs: {},
});
