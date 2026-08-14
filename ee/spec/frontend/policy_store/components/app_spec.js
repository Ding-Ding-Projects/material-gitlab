import { shallowMount } from '@vue/test-utils';
import waitForPromises from 'helpers/wait_for_promises';
import * as Sentry from '~/sentry/sentry_browser_wrapper';
import { visitUrl } from '~/lib/utils/url_utility';
import App from 'ee/policy_store/components/app.vue';
import ListWrapper from 'ee/policy_store/components/list/list_wrapper.vue';
import StepWizard from 'ee/policy_store/components/editor/step_wizard.vue';
import { fetchPolicies } from 'ee/policy_store/policies';
import { MOCK_EVALUATIONS_THIS_WEEK } from 'ee/policy_store/mock_data';

jest.mock('~/sentry/sentry_browser_wrapper');
jest.mock('~/lib/utils/url_utility', () => ({
  ...jest.requireActual('~/lib/utils/url_utility'),
  visitUrl: jest.fn(),
}));
jest.mock('ee/policy_store/policies', () => ({
  fetchPolicies: jest.fn(),
}));

describe('PolicyStoreApp', () => {
  let wrapper;

  const policies = [
    { id: 1, name: 'Production gate', trigger_id: 'deployment_requested', status: 'active' },
    { id: 2, name: 'Merge gate', trigger_id: 'merge_request', status: 'active' },
  ];

  const findList = () => wrapper.findComponent(ListWrapper);
  const findWizard = () => wrapper.findComponent(StepWizard);
  const findError = () => wrapper.find('[data-testid="policies-error"]');

  const createComponent = async (provide = {}) => {
    wrapper = shallowMount(App, {
      provide: { organizationId: '1', ...provide },
    });
    await waitForPromises();
  };

  beforeEach(() => {
    fetchPolicies.mockResolvedValue(policies);
  });

  describe('list view', () => {
    it('fetches the organization policies and passes them to the list with an edit path', async () => {
      await createComponent({ listPath: '/-/security/policy_store' });

      expect(fetchPolicies).toHaveBeenCalledWith('1');
      expect(findList().props('policies')).toEqual([
        { ...policies[0], editPath: '/-/security/policy_store/1/edit' },
        { ...policies[1], editPath: '/-/security/policy_store/2/edit' },
      ]);
      expect(findList().props('evaluationsThisWeek')).toBe(MOCK_EVALUATIONS_THIS_WEEK);
      expect(findList().props('loading')).toBe(false);
      expect(findError().exists()).toBe(false);
    });

    it('marks the list as loading while the fetch is in flight', () => {
      fetchPolicies.mockReturnValue(new Promise(() => {}));

      wrapper = shallowMount(App, { provide: { organizationId: '1' } });

      expect(findList().props('loading')).toBe(true);
    });

    it('passes the new policy path to the list', async () => {
      await createComponent({ newPolicyPath: '/-/security/policy_store/new' });

      expect(findList().props('newPolicyPath')).toBe('/-/security/policy_store/new');
    });

    it('shows the error alert and reports to Sentry when the fetch fails', async () => {
      const error = new Error('API is down');
      fetchPolicies.mockRejectedValue(error);

      await createComponent();

      expect(findError().text()).toContain(
        'The policies could not be fetched from the Policy Store API.',
      );
      expect(findList().props('policies')).toEqual([]);
      expect(findList().props('error')).toBe(true);
      expect(findList().props('loading')).toBe(false);
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });

  describe('editor view', () => {
    it('renders the editor when initialView is editor', async () => {
      await createComponent({ initialView: 'editor' });

      expect(findWizard().exists()).toBe(true);
      expect(findList().exists()).toBe(false);
    });

    it('opens the editor with the policy matching the injected id', async () => {
      await createComponent({ initialView: 'editor', policyId: '2' });

      expect(findWizard().props('policy')).toEqual(policies[1]);
    });

    it('opens the editor with no policy when there is no policy id', async () => {
      await createComponent({ initialView: 'editor' });

      expect(findWizard().props('policy')).toBe(null);
    });

    it('navigates to the list path when the editor emits cancel', async () => {
      await createComponent({ initialView: 'editor', listPath: '/-/security/policy_store' });

      findWizard().vm.$emit('cancel');

      expect(visitUrl).toHaveBeenCalledWith('/-/security/policy_store');
    });
  });
});
