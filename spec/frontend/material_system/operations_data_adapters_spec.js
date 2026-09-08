import { normalizeDeployCollection } from '~/material_system/surfaces/Deploy/data';
import { fetchOperateData } from '~/material_system/surfaces/Operate/data';
import { fetchMonitorData } from '~/material_system/surfaces/Monitor/data';
import { normalizeVulnerability } from '~/material_system/surfaces/Security/data';

const jsonResponse = (value) => ({ ok: true, status: 200, json: () => Promise.resolve(value) });

describe('operations surface production adapters', () => {
  it('normalizes Rails release fields without synthesizing release metadata', () => {
    expect(normalizeDeployCollection('releases', [{ id: 7, tag_name: 'v1.2.3', released_at: '2026-09-08T10:00:00Z' }])).toEqual([
      expect.objectContaining({ id: '7', name: 'v1.2.3', tagRef: 'v1.2.3', createdAt: '2026-09-08T10:00:00Z' }),
    ]);
  });

  it('uses actual environment, cluster, and Terraform response fields', async () => {
    const pageInfo = { hasNextPage: false, endCursor: null };
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse({ environments: [{ id: 1, name: 'production', state: 'available', updated_at: '2026-09-08T10:00:00Z' }] }))
      .mockResolvedValueOnce(jsonResponse({ data: { project: { clusterAgents: { nodes: [{ id: 'agent-2', name: 'cluster-a', webPath: '/project/-/cluster_agents/cluster-a' }], pageInfo } } } }))
      .mockResolvedValueOnce(jsonResponse({ data: { project: { terraformStates: { nodes: [{ id: 'state-3', name: 'state-a', lockedAt: '2026-09-08T10:00:00Z', latestVersion: { serial: 9 } }], pageInfo } } } }));
    const result = await fetchOperateData({ endpoints: { environments: '/environments', graphql: '/api/graphql', projectPath: 'group/project', kubernetes: true, terraform: true }, fetchImpl });
    expect(result.environments[0]).toMatchObject({ id: '1', name: 'production', status: 'available' });
    expect(result.clusters[0]).toMatchObject({ id: 'agent-2', name: 'cluster-a', href: '/project/-/cluster_agents/cluster-a' });
    expect(result.terraform[0]).toMatchObject({ status: 'locked', version: 9 });
    expect(fetchImpl.mock.calls[1][1].method).toBe('POST');
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).variables.projectPath).toBe('group/project');
  });

  it('normalizes each Monitor tab without hard-coded people or state labels', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse([{ iid: 12, title: 'A real incident', state: 'triggered', updated_at: '2026-09-08T10:00:00Z' }]))
      .mockResolvedValueOnce(jsonResponse({ data: { project: { alertManagementAlerts: { nodes: [{ id: 'alert-3', iid: 3, title: 'Alert from server', status: 'ACKNOWLEDGED' }], pageInfo: { hasNextPage: false } } } } }));
    const result = await fetchMonitorData({ endpoints: { incidents: '/i', alerts: '/api/graphql', projectPath: 'group/project', projectUrl: '/group/project' }, fetchImpl });
    expect(result.incidents[0]).toMatchObject({ id: '12', name: 'A real incident', status: 'triggered' });
    expect(result.alerts[0]).toMatchObject({ id: 'alert-3', status: 'acknowledged', href: '/group/project/-/alert_management/3/details' });
    expect(Object.keys(result)).toEqual(['incidents', 'alerts']);
  });

  it('maps vulnerability API state and identifiers without retaining API-specific nesting', () => {
    expect(normalizeVulnerability({ id: 12, severity: 'HIGH', title: 'Real finding', state: 'detected', report_type: 'sast', identifiers: [{ name: 'CWE-79' }], location: { file: 'app/x.rb' } })).toMatchObject({
      id: '12', severity: 'high', status: 'Needs triage', cve: 'CWE-79', location: 'app/x.rb', scanner: 'sast',
    });
  });
});
