import { join } from 'node:path';
import { rest } from 'msw';
import { cloneDeep } from 'lodash-es';
import { parseGid } from '~/graphql_shared/utils';
import { loadFixturesMap } from '../fixture_utils';
import { server } from '../server';

const FIXTURES_PATH = join('tmp/tests/frontend/fixtures-ee/graphql/ai/duo_agentic_chat/');
export const fixtures = loadFixturesMap(FIXTURES_PATH);

// Derive test constants from fixture data so the spec does not need to
// hardcode IDs that only exist at fixture-generation time.
const workflowNode = fixtures.getWorkflowLatestCheckpoint?.data?.duoWorkflowWorkflows?.nodes?.[0];
export const MOCK_WORKFLOW_GID = workflowNode?.id;
export const MOCK_WORKFLOW_NUMERIC_ID = workflowNode ? parseGid(MOCK_WORKFLOW_GID)?.id : null;

export function handleDuoAgenticChatOperation({ operationName, res, ctx }) {
  const fixture = fixtures[operationName];
  if (!fixture) return null;
  return res(ctx.json(fixture));
}

// -----------------------------------------------------------------------------
// Runtime handlers for the live chat flow.
//
// Sending a prompt creates a workflow and then reads it back, so these
// operations depend on what earlier requests in the same test did and cannot be
// served as static fixtures. They are installed per-suite via `server.use` (see
// `installAgenticChatFlowHandlers`) rather than added to the global EE chain,
// because `handlers/ai_duo_panel.js` already answers some of them with its own
// canned workflow and the other suites depend on that.
//
// Response *shapes* are still taken from the generated fixtures and only the
// varying values are overridden, so a schema change reaches these handlers when
// the fixtures are regenerated instead of silently diverging from the API.
// -----------------------------------------------------------------------------

const GRAPHQL_URL = 'http://test.host/api/graphql';

/**
 * Reads a generated fixture, resolved on use rather than at import so a spec that
 * never exercises an operation is not broken by an unrelated missing fixture. A
 * stale `tmp/` is common, so say what to do about it instead of failing with
 * `Cannot read properties of undefined`.
 */
const fixtureFor = (operationName) => {
  const fixture = fixtures[operationName];

  if (!fixture) {
    throw new Error(
      `Missing MSW fixture for "${operationName}". Regenerate with: ` +
        'bundle exec rspec ee/spec/frontend/fixtures/ai/duo_agentic_chat.rb',
    );
  }

  return fixture;
};

const createPayloadTemplate = () => fixtureFor('createAiDuoWorkflow').data.aiDuoWorkflowCreate;

const flowState = {
  nextWorkflowId: 900,
};

const resetAgenticChatFlowState = () => {
  flowState.nextWorkflowId = 900;
};

const OPERATION_HANDLERS = {
  createAiDuoWorkflow: () => {
    flowState.nextWorkflowId += 1;
    const id = `gid://gitlab/Ai::DuoWorkflows::Workflow/${flowState.nextWorkflowId}`;
    const template = createPayloadTemplate();

    return {
      data: {
        aiDuoWorkflowCreate: {
          ...cloneDeep(template),
          workflow: { ...template.workflow, id },
        },
      },
    };
  },
};

// Fixtures the handlers above need. Checked when the handlers are installed
// rather than at import: a resolver that throws is swallowed by MSW and
// resurfaces as an unrelated timeout, and only specs that opt into the flow
// should care whether these exist.
const REQUIRED_FIXTURES = ['createAiDuoWorkflow'];

/**
 * Installs the runtime handlers for the current test. MSW 1.x prepends runtime
 * handlers and treats an `undefined` return as "not handled", so operations this
 * module does not own fall through to the global chain. The suite-wide
 * `server.resetHandlers()` in `spec/frontend/msw_integration/test_setup.js`
 * removes them again after each test.
 */
export const installAgenticChatFlowHandlers = () => {
  resetAgenticChatFlowState();

  server.use(
    rest.post(GRAPHQL_URL, (req, res, ctx) => {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const handler = OPERATION_HANDLERS[body.operationName];

      if (!handler) {
        return undefined;
      }

      return res(ctx.json(handler({ variables: body.variables ?? {} })));
    }),
  );

  // Checked after the handlers are registered, so a stale fixture surfaces as
  // this message rather than as the suite-level "missing graphql handlers"
  // warning that would otherwise fire first and point somewhere unhelpful.
  REQUIRED_FIXTURES.forEach(fixtureFor);
};
