import { GlIcon, GlSprintf } from '@gitlab/ui';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import ServiceSourceStatus from 'ee/cd/components/service_source_status.vue';
import TimeAgo from '~/vue_shared/components/time_ago_tooltip.vue';

describe('ServiceSourceStatus', () => {
  let wrapper;

  const findSourceRef = () => wrapper.findByTestId('source-ref');
  const findLastDeployed = () => wrapper.findByTestId('last-deployed');
  const findSyncStatus = () => wrapper.findByTestId('sync-status');
  const findSyncIcon = () => findSyncStatus().findComponent(GlIcon);
  const findTimeAgo = () => wrapper.findComponent(TimeAgo);

  const createComponent = (props = {}) => {
    wrapper = shallowMountExtended(ServiceSourceStatus, {
      propsData: {
        sourceRef: 'registry.example.com/api-server',
        lastDeployed: '2024-06-10T08:00:00Z',
        deployedBy: 'admin',
        sync: 'synced',
        ...props,
      },
      stubs: { GlSprintf },
    });
  };

  describe('source ref', () => {
    beforeEach(() => {
      createComponent();
    });

    it('renders the source ref in monospace', () => {
      expect(findSourceRef().text()).toBe('registry.example.com/api-server');
      expect(findSourceRef().classes()).toContain('gl-font-monospace');
    });

    describe('when the source ref is empty', () => {
      beforeEach(() => {
        createComponent({ sourceRef: '' });
      });

      it('does not render the source ref', () => {
        expect(findSourceRef().exists()).toBe(false);
      });
    });
  });

  describe('last deployed', () => {
    beforeEach(() => {
      createComponent();
    });

    it('renders the relative time with the author', () => {
      expect(findLastDeployed().exists()).toBe(true);
      expect(findTimeAgo().props('time')).toBe('2024-06-10T08:00:00Z');
      expect(findLastDeployed().text()).toContain('admin');
    });

    describe('when there is no author', () => {
      beforeEach(() => {
        createComponent({ deployedBy: null });
      });

      it('renders the relative time without the author', () => {
        expect(findLastDeployed().exists()).toBe(true);
        expect(findTimeAgo().props('time')).toBe('2024-06-10T08:00:00Z');
        expect(findLastDeployed().text()).not.toContain('admin');
      });
    });

    describe('when there is no last deployed time', () => {
      beforeEach(() => {
        createComponent({ lastDeployed: null });
      });

      it('does not render the last deployed row', () => {
        expect(findLastDeployed().exists()).toBe(false);
      });
    });
  });

  describe('sync status', () => {
    describe('when the service is synced', () => {
      beforeEach(() => {
        createComponent({ sync: 'synced' });
      });

      it('renders the check icon and "In sync"', () => {
        expect(findSyncStatus().text()).toBe('In sync');
        expect(findSyncIcon().props('name')).toBe('check-circle');
        expect(findSyncIcon().props('variant')).toBe('success');
      });
    });

    describe('when the service is out of sync', () => {
      beforeEach(() => {
        createComponent({ sync: 'out-of-sync' });
      });

      it('renders the warning icon and "Drift detected"', () => {
        expect(findSyncStatus().text()).toBe('Drift detected');
        expect(findSyncIcon().props('name')).toBe('warning');
        expect(findSyncIcon().props('variant')).toBe('warning');
      });
    });

    // Both the unknown-string and the null/absent cases have no SYNC_STATUS
    // entry, so hasSyncStatus gates the whole row rather than rendering a
    // broken GlIcon. Table-drive the two "renders nothing" inputs.
    describe.each`
      scenario              | sync
      ${'an unknown value'} | ${'mystery'}
      ${'no value'}         | ${null}
    `('when the sync field has $scenario', ({ sync }) => {
      beforeEach(() => {
        createComponent({ sync });
      });

      it('does not render the sync status row', () => {
        expect(findSyncStatus().exists()).toBe(false);
      });
    });
  });
});
