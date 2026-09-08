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
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonResponse([{ id: 1, name: 'production', state: 'available', updated_at: '2026-09-08T10:00:00Z' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 2, name: 'cluster-a', namespace: 'production', status: 'connected' }]))
      .mockResolvedValueOnce(jsonResponse([{ id: 3, name: 'state-a', locked: true, serial: 9, updated_at: '2026-09-08T10:00:00Z' }]));
    const result = await fetchOperateData({ endpoints: { environments: '/environments', kubernetes: '/clusters', terraform: '/terraform' }, fetchImpl });
    expect(result.environments[0]).toMatchObject({ id: '1', name: 'production', status: 'available' });
    expect(result.clusters[0]).toMatchObject({ detail: 'production' });
    expect(result.terraform[0]).toMatchObject({ status: 'locked', version: 9 });
  });

  it('normalizes each Monitor tab without hard-coded people or state labels', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(jsonResponse([{ iid: 12, title: 'A real incident', state: 'triggered', updated_at: '2026-09-08T10:00:00Z' }])));
    const result = await fetchMonitorData({ endpoints: { incidents: '/i', alerts: '/a', errors: '/e', oncall: '/o', tickets: '/t' }, fetchImpl });
    expect(result.incidents[0]).toMatchObject({ id: '12', name: 'A real incident', status: 'triggered' });
  });

  it('maps vulnerability API state and identifiers without retaining API-specific nesting', () => {
    expect(normalizeVulnerability({ id: 12, severity: 'HIGH', title: 'Real finding', state: 'detected', report_type: 'sast', identifiers: [{ name: 'CWE-79' }], location: { file: 'app/x.rb' } })).toMatchObject({
      id: '12', severity: 'high', status: 'Needs triage', cve: 'CWE-79', location: 'app/x.rb', scanner: 'sast',
    });
  });
});
