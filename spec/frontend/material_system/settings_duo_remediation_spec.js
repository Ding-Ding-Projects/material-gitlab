import { ensureDependencyBumpProfile } from '~/material_system/surfaces/Settings/duo_remediation_adapter';
import { checkDuoRunner } from '~/material_system/surfaces/Settings/duo_readiness_adapter';

jest.mock('~/lib/graphql', () => jest.fn());
jest.mock('~/lib/utils/csrf', () => ({ token: 'duo-csrf' }));

const context = { projectFullPath: 'group/project', projectGlobalId: 'gid://gitlab/Project/7', allowed: true };

describe('design-owned Duo service boundaries', () => {
  it('accepts an existing remediation profile without attaching another', async () => {
    const apolloClient = { query: jest.fn().mockResolvedValue({ data: { project: { id: context.projectGlobalId, securityScanProfiles: [{ scanType: 'DEPENDENCY_SCANNING_POST_PROCESSING' }] } } }), mutate: jest.fn() };
    await expect(ensureDependencyBumpProfile({ ...context, apolloClient })).resolves.toEqual({ attached: false });
    expect(apolloClient.mutate).not.toHaveBeenCalled();
  });

  it('does not attach when the metadata query is malformed or unauthorized', async () => {
    const apolloClient = { query: jest.fn().mockResolvedValue({ data: { project: null } }), mutate: jest.fn() };
    await expect(ensureDependencyBumpProfile({ ...context, apolloClient })).rejects.toThrow('current remediation profiles');
    expect(apolloClient.mutate).not.toHaveBeenCalled();
    await expect(ensureDependencyBumpProfile({ ...context, allowed: 'true', apolloClient })).rejects.toThrow('current project access');
  });

  it('requires an explicit successful attachment payload', async () => {
    const apolloClient = { query: jest.fn().mockResolvedValue({ data: { project: { id: context.projectGlobalId, securityScanProfiles: [] } } }), mutate: jest.fn().mockResolvedValue({ data: {} }) };
    await expect(ensureDependencyBumpProfile({ ...context, apolloClient })).rejects.toThrow('did not confirm');
    apolloClient.mutate.mockResolvedValueOnce({ data: { securityScanProfileAttach: { errors: [] } } });
    await expect(ensureDependencyBumpProfile({ ...context, apolloClient })).resolves.toEqual({ attached: true });
  });

  it('distinguishes a redacted runner result from no runner available', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { project: { duoWorkflowRunnerAvailable: null } } }) });
    await expect(checkDuoRunner({ fullPath: 'group/project', endpoint: '/gitlab/api/graphql', fetchImpl })).rejects.toThrow('unavailable for your access');
    fetchImpl.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { project: { duoWorkflowRunnerAvailable: false, duoWorkflowUsableRunnerType: null } } }) });
    await expect(checkDuoRunner({ fullPath: 'group/project', endpoint: '/gitlab/api/graphql', fetchImpl })).resolves.toMatchObject({ runnerAvailable: false });
    expect(fetchImpl).toHaveBeenCalledWith('/gitlab/api/graphql', expect.objectContaining({ credentials: 'same-origin', redirect: 'error', headers: expect.objectContaining({ 'X-CSRF-Token': 'duo-csrf' }) }));
  });
});
