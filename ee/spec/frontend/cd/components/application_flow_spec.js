import { GlAlert, GlBadge, GlLoadingIcon } from '@gitlab/ui';
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createMockApollo from 'helpers/mock_apollo_helper';
import { mountExtended, shallowMountExtended } from 'helpers/vue_test_utils_helper';
import waitForPromises from 'helpers/wait_for_promises';
import ApplicationFlow from 'ee/cd/components/application_flow.vue';
import FlowStage from 'ee/cd/components/flow_stage.vue';
import FlowStep from 'ee/cd/components/flow_step.vue';
import cdApplicationDeploymentFlowQuery from 'ee/cd/graphql/cd_application_deployment_flow.query.graphql';
import cdRolloutFlowQuery from 'ee/cd/graphql/cd_rollout_flow.query.graphql';

Vue.use(VueApollo);

const APPLICATION_ID = 'gid://gitlab/Cd::Application/7';
const ORGANIZATION_ID = 'gid://gitlab/Organizations::Organization/1';
const flowEditorRoute = { name: 'flow_editor_route', params: { id: '7' } };

const flowDef = ({ version = 1, definition = 'steps: []\n' } = {}) => ({
  __typename: 'CdApplicationFlowDefinition',
  id: `gid://gitlab/Cd::ApplicationFlowDefinition/${version}`,
  version,
  definition,
});

const rolloutNode = ({ id = 5, versionSetId = 5, flow = flowDef(), steps = [] } = {}) => ({
  __typename: 'CdRollout',
  id: `gid://gitlab/Cd::Rollout/${id}`,
  versionSet: versionSetId
    ? { __typename: 'CdVersionSet', id: `gid://gitlab/Cd::VersionSet/${versionSetId}` }
    : null,
  applicationFlowDefinition: flow,
  rolloutSteps: steps,
});

let stepId = 0;

const rolloutStep = ({ type, name = null, state = 'SUCCESS', environment = null, steps = [] }) => {
  stepId += 1;

  return {
    __typename: 'CdRolloutStep',
    id: `gid://gitlab/Cd::RolloutStep/${stepId}`,
    stepType: type,
    name,
    params: null,
    state,
    environment: environment
      ? {
          __typename: 'CdEnvironment',
          id: `gid://gitlab/Cd::Environment/${environment}`,
          name: environment,
        }
      : null,
    steps,
  };
};

const stageStep = (name, state, steps) =>
  rolloutStep({ type: 'com.gitlab.cd.steps.stage', name, state, steps });

const deployStep = (environment, state) =>
  rolloutStep({ type: 'com.gitlab.cd.argo.canary.deploy', environment, state });

const waitStep = (state) => rolloutStep({ type: 'com.gitlab.cd.steps.wait', state });

const approvalStep = (state) => rolloutStep({ type: 'com.gitlab.cd.steps.approval', state });

const flowSteps = () => [
  stageStep('dev', 'SUCCESS', [deployStep('dev-eu', 'SUCCESS')]),
  stageStep('production', 'RUNNING', [
    approvalStep('APPROVED'),
    deployStep('prod-eu', 'SUCCESS'),
    deployStep('prod-us', 'PENDING'),
    waitStep('PENDING'),
  ]),
  waitStep('PENDING'),
];

const connection = (node) => ({ nodes: node ? [node] : [] });

const appFlowResponse = ({
  active = null,
  latestFinished = null,
  applicationFlow = null,
} = {}) => ({
  data: {
    organization: {
      __typename: 'Organization',
      id: ORGANIZATION_ID,
      cdApplication: {
        __typename: 'CdApplication',
        id: APPLICATION_ID,
        name: 'payments-platform',
        activeRollout: connection(active),
        latestFinishedRollout: connection(latestFinished),
        applicationFlowDefinitions: connection(applicationFlow),
      },
    },
  },
});

const rolloutFlowResponse = (rollout) => ({
  data: { organization: { __typename: 'Organization', id: ORGANIZATION_ID, cdRollout: rollout } },
});

describe('ApplicationFlow', () => {
  let wrapper;
  let appHandler;
  let rolloutHandler;

  const createComponent = ({
    appResponse = appFlowResponse(),
    rolloutResponse = rolloutFlowResponse(null),
    selectedDeploymentId = null,
    appError = false,
    rolloutError = false,
    mountFn = shallowMountExtended,
  } = {}) => {
    appHandler = appError
      ? jest.fn().mockRejectedValue(new Error('boom'))
      : jest.fn().mockResolvedValue(appResponse);
    rolloutHandler = rolloutError
      ? jest.fn().mockRejectedValue(new Error('boom'))
      : jest.fn().mockResolvedValue(rolloutResponse);

    wrapper = mountFn(ApplicationFlow, {
      apolloProvider: createMockApollo([
        [cdApplicationDeploymentFlowQuery, appHandler],
        [cdRolloutFlowQuery, rolloutHandler],
      ]),
      propsData: { applicationId: APPLICATION_ID, selectedDeploymentId },
    });
  };

  const findLoadingIcon = () => wrapper.findComponent(GlLoadingIcon);
  const findAlert = () => wrapper.findComponent(GlAlert);
  const findBadge = () => wrapper.findComponent(GlBadge);
  const findFlowCanvas = () => wrapper.findByTestId('flow-canvas');
  const findEditButton = () => wrapper.findComponentByTestId('edit-flow-button');
  const findCreateButton = () => wrapper.findComponentByTestId('create-flow-button');
  const lastRolloutSelected = () => wrapper.emitted('rollout-selected').at(-1)[0];
  const findDefinition = () => wrapper.findByTestId('flow-definition');
  const findStages = () => wrapper.findAllComponents(FlowStage);
  const findSteps = () => wrapper.findAllComponents(FlowStep);
  const findConnectorPaths = () => wrapper.findAllByTestId('flow-connector');
  const findStageHeaders = () => wrapper.findAllByTestId('stage-header');
  const nodeIdsInMarkup = () =>
    findFlowCanvas()
      .findAll('[data-flow-node]')
      .wrappers.map((node) => node.attributes('data-flow-node'));
  const findExpandedStage = () => findStages().wrappers.find((stage) => stage.props('expanded'));
  const expandedStepNodeIds = () =>
    findExpandedStage()
      .findAll('[data-testid="stage-body"] [data-flow-node]')
      .wrappers.map((node) => node.attributes('data-flow-node'));

  describe('while loading', () => {
    beforeEach(() => {
      createComponent();
    });

    it('renders the loading icon', () => {
      expect(findLoadingIcon().exists()).toBe(true);
    });
  });

  describe('errors', () => {
    describe('when the application query fails and nothing is selected', () => {
      beforeEach(async () => {
        createComponent({ appError: true });
        await waitForPromises();
      });

      it('shows the error', () => {
        expect(findAlert().props('variant')).toBe('danger');
        expect(findAlert().text()).toContain('Failed to load the application flow');
      });
    });

    describe('when a selected deployment loads while the application query fails', () => {
      beforeEach(async () => {
        createComponent({
          appError: true,
          rolloutResponse: rolloutFlowResponse(
            rolloutNode({ id: 9, flow: flowDef({ version: 9, definition: 'selected\n' }) }),
          ),
          selectedDeploymentId: 'gid://gitlab/Cd::Rollout/9',
        });
        await waitForPromises();
      });

      it('shows the selected flow without an error', () => {
        expect(findAlert().exists()).toBe(false);
        expect(findBadge().text()).toBe('Version 9');
      });
    });

    describe('when the selected deployment fails to load', () => {
      beforeEach(async () => {
        createComponent({ rolloutError: true, selectedDeploymentId: 'gid://gitlab/Cd::Rollout/9' });
        await waitForPromises();
      });

      it('shows the error', () => {
        expect(findAlert().props('variant')).toBe('danger');
      });
    });
  });

  describe('with no rollout and no application flow', () => {
    beforeEach(async () => {
      createComponent();
      await waitForPromises();
    });

    it('renders the empty state message', () => {
      expect(wrapper.text()).toContain('No flow is defined for this application yet.');
    });

    it('renders the create button linking to the flow editor', () => {
      expect(findCreateButton().props('to')).toEqual(flowEditorRoute);
    });

    it('does not render the canvas or the version badge', () => {
      expect(findFlowCanvas().exists()).toBe(false);
      expect(findBadge().exists()).toBe(false);
    });
  });

  describe('flow source fallback', () => {
    it.each`
      scenario             | appResponse                                                                            | version
      ${'active'}          | ${appFlowResponse({ active: rolloutNode({ flow: flowDef({ version: 5 }) }) })}         | ${5}
      ${'latest finished'} | ${appFlowResponse({ latestFinished: rolloutNode({ flow: flowDef({ version: 4 }) }) })} | ${4}
    `('shows the $scenario rollout flow', async ({ appResponse, version }) => {
      createComponent({ appResponse });
      await waitForPromises();

      expect(findBadge().text()).toBe(`Version ${version}`);
    });

    it('prefers the active rollout over the latest finished rollout', async () => {
      createComponent({
        appResponse: appFlowResponse({
          active: rolloutNode({ id: 5, flow: flowDef({ version: 5, definition: 'active\n' }) }),
          latestFinished: rolloutNode({
            id: 4,
            flow: flowDef({ version: 4, definition: 'finished\n' }),
          }),
        }),
      });
      await waitForPromises();

      expect(findBadge().text()).toBe('Version 5');
    });

    describe('when no rollout has a flow definition', () => {
      beforeEach(async () => {
        createComponent({
          appResponse: appFlowResponse({
            applicationFlow: flowDef({ version: 2, definition: 'app-flow\n' }),
          }),
        });
        await waitForPromises();
      });

      it('falls back to the application flow', () => {
        expect(findBadge().text()).toBe('Version 2');
        expect(findDefinition().exists()).toBe(true);
      });

      it('renders the edit button linking to the flow editor', () => {
        expect(findEditButton().props('to')).toEqual(flowEditorRoute);
      });
    });
  });

  describe('when a deployment is explicitly selected', () => {
    const selectedId = 'gid://gitlab/Cd::Rollout/9';

    beforeEach(async () => {
      createComponent({
        appResponse: appFlowResponse({
          active: rolloutNode({ id: 5, flow: flowDef({ version: 5, definition: 'active\n' }) }),
        }),
        rolloutResponse: rolloutFlowResponse(
          rolloutNode({
            id: 9,
            versionSetId: 9,
            flow: flowDef({ version: 9, definition: 'selected\n' }),
          }),
        ),
        selectedDeploymentId: selectedId,
      });
      await waitForPromises();
    });

    it('fetches that rollout and overrides the fallback', () => {
      expect(rolloutHandler).toHaveBeenCalledWith({ id: selectedId });
      expect(findBadge().text()).toBe('Version 9');
    });
  });

  describe('when the selected deployment has no flow of its own', () => {
    beforeEach(async () => {
      createComponent({
        appResponse: appFlowResponse({ applicationFlow: flowDef({ definition: 'app-flow\n' }) }),
        rolloutResponse: rolloutFlowResponse(rolloutNode({ id: 9, flow: null })),
        selectedDeploymentId: 'gid://gitlab/Cd::Rollout/9',
      });
      await waitForPromises();
    });

    it('clears the canvas', () => {
      expect(findFlowCanvas().exists()).toBe(false);
      expect(findCreateButton().exists()).toBe(true);
    });
  });

  describe('rollout-selected event', () => {
    describe('when a rollout is shown', () => {
      beforeEach(async () => {
        createComponent({
          appResponse: appFlowResponse({ active: rolloutNode({ id: 5, versionSetId: 5 }) }),
        });
        await waitForPromises();
      });

      it('emits the shown rollout id and version set id', () => {
        expect(lastRolloutSelected()).toEqual({
          id: 'gid://gitlab/Cd::Rollout/5',
          versionSetId: 'gid://gitlab/Cd::VersionSet/5',
        });
      });
    });

    describe('when falling back to the application flow', () => {
      beforeEach(async () => {
        createComponent({ appResponse: appFlowResponse({ applicationFlow: flowDef() }) });
        await waitForPromises();
      });

      it('emits nulls', () => {
        expect(lastRolloutSelected()).toEqual({ id: null, versionSetId: null });
      });
    });
  });
  describe('when the selected rollout has steps', () => {
    beforeEach(async () => {
      createComponent({
        appResponse: appFlowResponse({
          active: rolloutNode({ id: 5, flow: flowDef({ version: 2 }), steps: flowSteps() }),
        }),
        mountFn: mountExtended,
      });
      await waitForPromises();
    });

    it('renders a trigger step ahead of the flow the rollout describes', () => {
      expect(findSteps().at(0).props('category')).toBe('trigger');
    });

    it('renders a container per stage and a bare step per standalone step', () => {
      expect(findStages()).toHaveLength(2);
      expect(nodeIdsInMarkup()).toEqual([
        'item-0',
        'item-1',
        'item-2',
        'item-2-step-0',
        'item-2-step-1',
        'item-2-step-2',
        'item-2-step-3',
        'item-3',
      ]);
    });

    it('expands the running stage and leaves the settled one collapsed', () => {
      expect(findStages().wrappers.map((stage) => stage.props('expanded'))).toEqual([false, true]);
    });

    it('draws a connector for every edge', () => {
      expect(findConnectorPaths()).toHaveLength(6);
    });

    it('anchors every node exactly once, so no connector can resolve two elements', () => {
      const rendered = nodeIdsInMarkup();

      expect(rendered).toEqual([...new Set(rendered)]);
    });

    it("anchors every one of the expanded stage's steps, in flow order", () => {
      expect(expandedStepNodeIds()).toEqual([
        'item-2-step-0',
        'item-2-step-1',
        'item-2-step-2',
        'item-2-step-3',
      ]);
    });

    describe('when the rollout data changes after the user has toggled a stage', () => {
      beforeEach(async () => {
        const steps = flowSteps();

        createComponent({
          appResponse: appFlowResponse({
            active: rolloutNode({ id: 5, flow: flowDef({ version: 2 }), steps }),
          }),
          rolloutResponse: rolloutFlowResponse(
            rolloutNode({ id: 5, flow: flowDef({ version: 2 }), steps }),
          ),
          mountFn: mountExtended,
        });
        await waitForPromises();

        await findStageHeaders().at(1).trigger('click');
        await waitForPromises();
      });

      it("keeps the user's choice when the same stages arrive again", async () => {
        expect(findStages().wrappers.map((stage) => stage.props('expanded'))).toEqual([
          false,
          false,
        ]);

        await wrapper.setProps({ selectedDeploymentId: 'gid://gitlab/Cd::Rollout/5' });
        await waitForPromises();

        expect(findStages().wrappers.map((stage) => stage.props('expanded'))).toEqual([
          false,
          false,
        ]);
      });
    });

    describe('when a stage header is clicked', () => {
      beforeEach(async () => {
        await findStageHeaders().at(0).trigger('click');
        await waitForPromises();
      });

      it('expands that stage and leaves the others as they were', () => {
        expect(findStages().wrappers.map((stage) => stage.props('expanded'))).toEqual([true, true]);
      });

      it('exposes the newly revealed steps as connector anchors', () => {
        expect(nodeIdsInMarkup()).toContain('item-1-step-0');
      });
    });
  });

  describe('when there is a flow definition but no rollout to visualize', () => {
    beforeEach(async () => {
      createComponent({
        appResponse: appFlowResponse({ applicationFlow: flowDef({ version: 2 }) }),
        mountFn: mountExtended,
      });
      await waitForPromises();
    });

    it('still shows the flow header for the definition that was selected', () => {
      expect(findBadge().text()).toBe('Version 2');
    });

    it('falls back to showing the definition instead of an empty canvas', () => {
      expect(findFlowCanvas().exists()).toBe(false);
      expect(findDefinition().text()).toBe('steps: []');
    });
  });

  describe('when the rollout carrying the flow definition has no steps', () => {
    beforeEach(async () => {
      createComponent({
        appResponse: appFlowResponse({
          active: rolloutNode({ id: 5, flow: flowDef({ version: 5, definition: 'active\n' }) }),
        }),
        mountFn: mountExtended,
      });
      await waitForPromises();
    });

    it("shows the rollout's flow definition", () => {
      expect(findDefinition().text()).toBe('active');
    });
  });
});
