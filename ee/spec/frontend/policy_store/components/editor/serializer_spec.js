import {
  deserializePolicyData,
  emptyPolicyData,
  serializePolicyData,
} from 'ee/policy_store/components/editor/serializer';

describe('policy data serializer', () => {
  const formState = {
    trigger: 'deployment_requested',
    triggerConfig: { environment: 'production' },
    rules: ['custom', 'environment'],
    ruleConfigs: {
      custom: { policy: 'package governance' },
      environment: { environment: 'production' },
    },
    actions: ['require_approval'],
    actionConfigs: { require_approval: { roles: ['maintainer'] } },
  };

  describe('serializePolicyData', () => {
    it('puts the Rego program in `value` directly, which is where the gate reads it', () => {
      const { rules } = serializePolicyData(formState);

      expect(rules[0]).toEqual({ type: 'custom', value: 'package governance' });
    });

    it('puts a typed rule config in `value` as an object', () => {
      const { rules } = serializePolicyData(formState);

      expect(rules[1]).toEqual({ type: 'environment', value: { environment: 'production' } });
    });

    it('flattens action config alongside `type`', () => {
      const { actions } = serializePolicyData(formState);

      expect(actions).toEqual([{ type: 'require_approval', roles: ['maintainer'] }]);
    });

    it('exposes the trigger as trigger_id', () => {
      expect(serializePolicyData(formState).trigger_id).toBe('deployment_requested');
    });

    it('carries the trigger configuration as trigger_config', () => {
      expect(serializePolicyData(formState).trigger_config).toEqual({ environment: 'production' });
    });

    it('drops leftover trigger config when no trigger is selected', () => {
      const { trigger_config: triggerConfig } = serializePolicyData({
        trigger: null,
        triggerConfig: { environment: 'production' },
      });

      expect(triggerConfig).toEqual({});
    });

    it('serializes an empty policy without throwing', () => {
      expect(serializePolicyData(emptyPolicyData())).toEqual({
        trigger_id: null,
        trigger_config: {},
        rules: [],
        actions: [],
      });
    });

    it('serializes with no argument at all', () => {
      expect(serializePolicyData()).toEqual({
        trigger_id: null,
        trigger_config: {},
        rules: [],
        actions: [],
      });
    });

    it('defaults a missing rule config to an empty value', () => {
      const { rules } = serializePolicyData({ rules: ['environment'] });

      expect(rules).toEqual([{ type: 'environment', value: {} }]);
    });

    it('defaults a missing Rego program to an empty string, not undefined', () => {
      const { rules } = serializePolicyData({ rules: ['custom'] });

      expect(rules).toEqual([{ type: 'custom', value: '' }]);
    });
  });

  describe('round trip', () => {
    it('returns the original form state', () => {
      expect(deserializePolicyData(serializePolicyData(formState))).toEqual(formState);
    });

    it('survives a policy with no rules or actions', () => {
      const empty = emptyPolicyData();

      expect(deserializePolicyData(serializePolicyData(empty))).toEqual(empty);
    });
  });

  describe('deserializePolicyData', () => {
    it('returns empty form state for a policy with nothing set', () => {
      expect(deserializePolicyData({})).toEqual(emptyPolicyData());
    });

    it('returns empty form state with no argument', () => {
      expect(deserializePolicyData()).toEqual(emptyPolicyData());
    });

    it('unwraps the Rego program back into the code field', () => {
      const { ruleConfigs } = deserializePolicyData({
        rules: [{ type: 'custom', value: 'package foo' }],
      });

      expect(ruleConfigs.custom).toEqual({ policy: 'package foo' });
    });

    it('tolerates a Rego rule with no value', () => {
      const { ruleConfigs } = deserializePolicyData({ rules: [{ type: 'custom' }] });

      expect(ruleConfigs.custom).toEqual({ policy: '' });
    });

    it('keeps the first occurrence of a duplicated rule type', () => {
      const { rules, ruleConfigs } = deserializePolicyData({
        rules: [
          { type: 'custom', value: 'package first' },
          { type: 'custom', value: 'package second' },
        ],
      });

      expect(rules).toEqual(['custom']);
      expect(ruleConfigs).toEqual({ custom: { policy: 'package first' } });
    });

    it('keeps the first occurrence of a duplicated action type', () => {
      const { actions, actionConfigs } = deserializePolicyData({
        actions: [
          { type: 'require_approval', approvals_required: 1 },
          { type: 'require_approval', approvals_required: 5 },
        ],
      });

      expect(actions).toEqual(['require_approval']);
      expect(actionConfigs).toEqual({ require_approval: { approvals_required: 1 } });
    });

    it('reads trigger_config back into the form state', () => {
      const { triggerConfig } = deserializePolicyData({
        trigger_id: 'deployment_requested',
        trigger_config: { environment: 'production' },
      });

      expect(triggerConfig).toEqual({ environment: 'production' });
    });
  });
});
