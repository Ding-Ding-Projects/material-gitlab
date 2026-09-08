import { mount, shallowMount } from '@vue/test-utils';
import AgentMemory from '~/material_system/surfaces/AgentMemory/AgentMemory.vue';
import { notificationCenter } from '~/material_system/notifications';

jest.mock('~/material_system/settings', () => ({
  loadSettings: () => ({ theme: 'light' }),
  updateSettings: jest.fn(),
  subscribeSettings: () => jest.fn(),
}));

jest.mock('~/material_system/notifications', () => ({ notificationCenter: { notify: jest.fn(), subscribe: () => () => {} } }));

const readOnlyData = {
  skills: [{ id: 'skill-one', name: 'Skill one', icon: 'chip', removable: true, status: 'installed' }],
  sessions: [{ id: 1, agent: 'Agent one', task: 'Task', statusTone: 'good', minutesAgo: 0 }],
  history: [{ id: 'r1', icon: 'undo', title: 'Revision one', when: 'today' }],
  syncSteps: [],
  capabilities: {
    reinstallSkills: false,
    uninstallSkills: false,
    sendReply: false,
    archiveSessions: false,
    restoreHistory: false,
    sync: false,
  },
};

describe('AgentMemory read-only actions', () => {
  const createWrapper = (render = shallowMount) =>
    render(AgentMemory, { propsData: { initialData: readOnlyData } });

  it('keeps unsupported actions disabled and shows the provider limitation', async () => {
    const wrapper = createWrapper(mount);
    await wrapper.vm.$nextTick();

    wrapper.setData({ activeTab: 'skills', selection: { blocks: [], skills: ['skill-one'], sessions: [], history: [] } });
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('read-only Agent Memory provider');
    expect(wrapper.findComponent({ name: 'SkillsTab' }).props('canReinstall')).toBe(false);
    const reinstall = wrapper.findAll('button').wrappers.find((button) => button.text().includes('Reinstall selected'));
    expect(reinstall.element.disabled).toBe(true);

    wrapper.setData({ activeTab: 'sync' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'SyncTab' }).props('supported')).toBe(false);
    expect(wrapper.text()).toContain('Canonical sync is unavailable');
    expect(wrapper.findComponent({ name: 'SyncTab' }).find('button').exists()).toBe(false);
    wrapper.destroy();
  });

  it('does not simulate a mutation, a timer, or a success notification for unsupported operations', () => {
    const wrapper = createWrapper();
    const skillsBefore = JSON.parse(JSON.stringify(wrapper.vm.skills));
    const sessionsBefore = JSON.parse(JSON.stringify(wrapper.vm.sessions));
    const historyBefore = JSON.parse(JSON.stringify(wrapper.vm.history));
    const timer = jest.spyOn(window, 'setTimeout');

    wrapper.vm.bulkReinstallSkills();
    wrapper.vm.uninstallSkills();
    wrapper.vm.sendReply();
    wrapper.vm.bulkArchiveSessions();
    wrapper.vm.restoreEntry();
    wrapper.vm.bulkRestoreHistory();

    expect(wrapper.vm.skills).toEqual(skillsBefore);
    expect(wrapper.vm.sessions).toEqual(sessionsBefore);
    expect(wrapper.vm.history).toEqual(historyBefore);
    expect(timer).not.toHaveBeenCalled();
    expect(notificationCenter.notify).toHaveBeenCalledTimes(6);
    expect(
      notificationCenter.notify.mock.calls.every(([notice]) => notice.severity === 'warning'),
    ).toBe(true);
    expect(
      notificationCenter.notify.mock.calls.every(
        ([notice]) => notice.title === 'Operation unavailable',
      ),
    ).toBe(true);

    timer.mockRestore();
    wrapper.destroy();
  });

  it('does not enable absent mutation adapters from provider capability flags', () => {
    const wrapper = shallowMount(AgentMemory, { propsData: { initialData: {
      ...readOnlyData,
      capabilities: Object.fromEntries(Object.keys(readOnlyData.capabilities).map((name) => [name, true])),
    } } });
    expect(Object.values(wrapper.vm.capabilities).every((available) => available === false)).toBe(true);
    wrapper.destroy();
  });

  it('uses the existing read-only fetch path for a selected-session refresh', () => {
    const wrapper = createWrapper();
    const refreshNow = jest.spyOn(wrapper.vm, 'refreshNow');

    wrapper.vm.bulkRefreshSessions();

    expect(refreshNow).toHaveBeenCalledWith(false);
    wrapper.destroy();
  });
});
