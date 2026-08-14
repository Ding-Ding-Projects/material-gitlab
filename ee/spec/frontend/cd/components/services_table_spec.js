import { GlTableLite } from '@gitlab/ui';
import { mountExtended, shallowMountExtended } from 'helpers/vue_test_utils_helper';
import TimeAgo from '~/vue_shared/components/time_ago_tooltip.vue';
import ServicesTable from 'ee/cd/components/services_table.vue';
import { makeService } from './mock_data';

describe('ServicesTable', () => {
  let wrapper;

  const findTable = () => wrapper.findComponent(GlTableLite);
  const findHealthBadge = () => wrapper.findComponentByTestId('health-badge');
  const findServiceTypeBadge = () => wrapper.findByTestId('service-type-badge');
  const findSyncBadge = () => wrapper.findComponentByTestId('sync-badge');
  const findHealthDot = () => wrapper.findByTestId('health-dot');
  const findServiceName = () => wrapper.findByTestId('service-name');
  const findTimeAgo = () => wrapper.findComponent(TimeAgo);
  const findTierEnvironments = () => wrapper.findAllByTestId('tier-environment');
  const findTierEmpties = () => wrapper.findAllByTestId('tier-empty');

  const createComponent = (props = {}) => {
    wrapper = shallowMountExtended(ServicesTable, {
      propsData: {
        services: [makeService()],
        ...props,
      },
    });
  };

  const mountComponent = (props = {}) => {
    wrapper = mountExtended(ServicesTable, {
      propsData: {
        services: [makeService()],
        ...props,
      },
    });
  };

  const makeHealthNode = ({ id, name, tier, health, version }) => ({
    id: `gid://gitlab/Cd::ServiceEnvironmentHealth/${id}`,
    health,
    environment: { id: `gid://gitlab/Cd::Environment/${id}`, name, tier },
    deployedVersions: { nodes: [{ id: `gid://gitlab/Cd::Version/${id}`, name: version }] },
  });

  // Health nodes come back worst-first from the backend (ordered_by_severity).
  const multiTierService = makeService({
    serviceEnvironmentHealths: {
      nodes: [
        { id: 3, name: 'prod-eu-west-1', tier: 'PRODUCTION', health: 'FAILED', version: 'v0.9.2' },
        {
          id: 2,
          name: 'staging-eu-west-1',
          tier: 'STAGING',
          health: 'DEGRADED',
          version: 'v0.9.2',
        },
        { id: 1, name: 'dev-1', tier: 'DEVELOPMENT', health: 'HEALTHY', version: 'v1.0.0' },
      ].map(makeHealthNode),
    },
  });

  describe('table rendering', () => {
    beforeEach(() => {
      createComponent();
    });

    it('renders a GlTableLite', () => {
      expect(findTable().exists()).toBe(true);
    });

    it('passes services as items', () => {
      expect(findTable().props('items')).toHaveLength(1);
    });

    it('stacks the table on small viewports', () => {
      expect(findTable().attributes('stacked')).toBe('sm');
    });
  });

  describe('mini variant (full=false)', () => {
    beforeEach(() => {
      createComponent({ full: false });
    });

    it('shows 2 columns (Service + Deployed)', () => {
      const fields = findTable().props('fields');

      expect(fields).toHaveLength(2);
      expect(fields.map((f) => f.key)).toEqual(['name', 'lastDeployedAt']);
    });
  });

  describe('full variant (full=true)', () => {
    it('shows Service, Status, a column per present tier, Type, Sync, then Deployed', () => {
      createComponent({ full: true, services: [multiTierService] });

      expect(
        findTable()
          .props('fields')
          .map((f) => f.key),
      ).toEqual([
        'name',
        'health',
        'DEVELOPMENT',
        'STAGING',
        'PRODUCTION',
        'serviceType',
        'sync',
        'lastDeployedAt',
      ]);
    });
  });

  describe('cell rendering (full mount)', () => {
    beforeEach(() => {
      mountComponent({ full: true });
    });

    it('renders raw serviceType in a badge', () => {
      expect(findServiceTypeBadge().text()).toBe('http-api');
    });

    it('renders the sync badge', () => {
      expect(findSyncBadge().text()).toBe('Synced');
      expect(findSyncBadge().props('variant')).toBe('success');
    });

    it('renders TimeAgo for lastDeployed', () => {
      expect(findTimeAgo().props('time')).toBe('2024-06-10T08:00:00Z');
    });
  });

  describe('tier columns (full mount)', () => {
    describe('with a multi-tier service', () => {
      beforeEach(() => {
        mountComponent({ full: true, services: [multiTierService] });
      });

      it('lists each environment under its tier with name and version', () => {
        const envs = findTierEnvironments();

        expect(envs).toHaveLength(3);
        expect(envs.at(0).text()).toContain('dev-1');
        expect(envs.at(0).text()).toContain('v1.0.0');
        expect(envs.at(1).text()).toContain('staging-eu-west-1');
        expect(envs.at(1).text()).toContain('v0.9.2');
        expect(envs.at(2).text()).toContain('prod-eu-west-1');
      });

      it('colors each environment dot by its own health with a tooltip', () => {
        const staging = findTierEnvironments().at(1);

        expect(staging.find('[data-testid="tier-health-dot"]').classes()).toContain(
          'gl-bg-orange-500',
        );
        expect(staging.attributes('title')).toBe('Degraded');
      });
    });

    describe('when a service is not deployed to a present tier', () => {
      beforeEach(() => {
        mountComponent({
          full: true,
          services: [
            multiTierService,
            makeService({
              id: 'gid://gitlab/Cd::Service/2',
              name: 'worker',
              serviceEnvironmentHealths: {
                nodes: [
                  makeHealthNode({
                    id: 9,
                    name: 'prod-eu-west-1',
                    tier: 'PRODUCTION',
                    health: 'HEALTHY',
                    version: 'v2.0.0',
                  }),
                ],
              },
            }),
          ],
        });
      });

      it('renders a placeholder in each missing tier cell', () => {
        expect(findTierEmpties()).toHaveLength(2);
      });
    });
  });

  describe('health rendering (full mount)', () => {
    const mountWithHealth = (health) =>
      mountComponent({
        full: true,
        services: [
          makeService({
            serviceEnvironmentHealths: {
              nodes: [{ id: 'gid://gitlab/Cd::ServiceEnvironmentHealth/1', health }],
            },
          }),
        ],
      });

    describe.each`
      health        | label         | variant
      ${'HEALTHY'}  | ${'Healthy'}  | ${'success'}
      ${'DEGRADED'} | ${'Degraded'} | ${'warning'}
      ${'FAILED'}   | ${'Failed'}   | ${'danger'}
      ${'UNKNOWN'}  | ${'Unknown'}  | ${'neutral'}
    `('when the worst health is $health', ({ health, label, variant }) => {
      beforeEach(() => {
        mountWithHealth(health);
      });

      it('renders the badge with the mapped label and variant', () => {
        expect(findHealthBadge().text()).toBe(label);
        expect(findHealthBadge().props('variant')).toBe(variant);
      });

      it('shows the health as a tooltip on the service name and dot', () => {
        expect(findServiceName().attributes('title')).toBe(label);
      });
    });

    describe('when the service has no health data', () => {
      beforeEach(() => {
        mountComponent({
          full: true,
          services: [makeService({ serviceEnvironmentHealths: { nodes: [] } })],
        });
      });

      it('renders the placeholder badge', () => {
        expect(findHealthBadge().text()).toBe('—');
        expect(findHealthBadge().props('variant')).toBe('neutral');
      });

      it('renders a gray health dot', () => {
        expect(findHealthDot().classes()).toContain('gl-bg-gray-400');
      });

      it('shows the placeholder as the tooltip', () => {
        expect(findServiceName().attributes('title')).toBe('—');
      });
    });
  });

  describe('when sync is null', () => {
    beforeEach(() => {
      mountComponent({ full: true, services: [makeService({ sync: null })] });
    });

    it('hides the sync badge', () => {
      expect(findSyncBadge().exists()).toBe(false);
    });
  });

  describe('when serviceType is null', () => {
    beforeEach(() => {
      mountComponent({ full: true, services: [makeService({ serviceType: null })] });
    });

    it('hides the serviceType badge', () => {
      expect(findServiceTypeBadge().exists()).toBe(false);
    });
  });

  describe('when lastDeployedAt is null', () => {
    beforeEach(() => {
      mountComponent({ services: [makeService({ lastDeployedAt: null })] });
    });

    it('hides TimeAgo', () => {
      expect(findTimeAgo().exists()).toBe(false);
    });
  });
});
