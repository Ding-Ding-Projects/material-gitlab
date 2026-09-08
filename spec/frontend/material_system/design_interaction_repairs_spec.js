import { mount, shallowMount } from '@vue/test-utils';
import waitForPromises from 'helpers/wait_for_promises';
import { authenticate } from '~/material_system/surfaces/Login/data';
import LiveCollectionSurface from '~/material_system/surfaces/LiveCollectionSurface.vue';
import CommandPalette from '~/material_system/surfaces/CommandPalette/CommandPalette.vue';
import PipelinesSurface from '~/material_system/surfaces/Pipelines/Pipelines.vue';

jest.mock('~/material_system/surfaces/Pipelines/data', () => ({
  fetchPipelines: jest.fn(),
  fetchPipelineDetail: jest.fn(),
  fetchJobTrace: jest.fn(() => Promise.resolve('test trace')),
  createManualPipeline: jest.fn(),
  retriedPipeline: jest.fn(),
  canceledPipeline: jest.fn(),
  retriedJob: jest.fn(),
  buildJobLog: jest.fn(() => []),
}));

jest.mock('~/material_system/surfaces/gitlabApi', () => ({ createGitLabClient: jest.fn() }));
jest.mock('~/material_system/settings', () => ({
  loadSettings: () => ({ theme: 'light' }),
  updateSettings: jest.fn(() => ({ ok: true, value: { theme: 'light' } })),
  subscribeSettings: () => jest.fn(),
}));
jest.mock('~/material_system/notifications', () => ({ notificationCenter: { notify: jest.fn() } }));

describe('design interaction repairs', () => {
  it('does not authenticate nonempty credentials without host authentication', async () => {
    await expect(authenticate({ username: 'alex', password: 'password' })).resolves.toEqual({
      ok: false,
      error: 'Sign-in is unavailable because no authentication service is configured.',
    });
  });

  it('keeps invalid regular expressions from matching every live row', async () => {
    const wrapper = mount(LiveCollectionSurface, {
      propsData: {
        surfaceId: 'monitor',
        title: 'Monitor',
        tabs: ['Incidents'],
        rowsByTab: { Incidents: [{ id: 1, name: 'Incident one' }] },
      },
    });

    await wrapper.find('button[title="Toggle regex mode"]').trigger('click');
    await wrapper.find('input').setValue('[');

    expect(wrapper.vm.visibleRows).toEqual([]);
    expect(wrapper.find('[role="alert"]').text()).toContain('valid regular expression');
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });

  it('keeps palette focus inside the dialog and exposes the active command', async () => {
    const firstRun = jest.fn();
    const secondRun = jest.fn();
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      propsData: { actions: [{ id: 'first', label: 'First', run: firstRun }, { id: 'second', label: 'Second', run: secondRun }] },
    });
    const input = wrapper.find('input');
    const options = wrapper.findAll('[role="option"]');

    expect(input.attributes('aria-activedescendant')).toBe(options.at(0).attributes('id'));
    expect(wrapper.find('[role="dialog"]').attributes('aria-labelledby')).toBe(wrapper.find('h2').attributes('id'));
    await input.trigger('keydown', { key: 'ArrowDown' });
    expect(input.attributes('aria-activedescendant')).toBe(options.at(1).attributes('id'));

    options.at(1).element.focus();
    await wrapper.vm.$nextTick();
    await options.at(1).trigger('keydown', { key: 'Enter' });
    expect(firstRun).not.toHaveBeenCalled();
    expect(secondRun).toHaveBeenCalled();
    await options.at(1).trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(input.element);

    wrapper.destroy();
  });

  it('keeps the palette selection valid when a search has no results', async () => {
    const wrapper = mount(CommandPalette, { propsData: { actions: [{ id: 'first', label: 'First' }] } });
    const input = wrapper.find('input');

    await input.setValue('missing');
    await input.trigger('keydown', { key: 'ArrowDown' });
    await input.trigger('keydown', { key: 'ArrowUp' });

    expect(wrapper.vm.activeIndex).toBe(0);
    expect(input.attributes('aria-activedescendant')).toBeUndefined();
  });

  it('updates only the selected stage-local job trace when job keys repeat', async () => {
    const pipeline = {
      id: 10,
      stages: [
        { name: 'build', jobs: [{ id: 1, key: 'same' }] },
        { name: 'test', jobs: [{ id: 2, key: 'same' }] },
      ],
    };
    const updatePipeline = jest.fn((_id, transform) => transform(pipeline));
    const vm = {
      activeJob: pipeline.stages[1].jobs[0],
      detail: pipeline,
      api: { getJobTrace: jest.fn().mockResolvedValue('test trace') },
      projectPath: 'group/project',
      updatePipeline,
    };

    await PipelinesSurface.methods.loadJobTrace.call(vm, 'test:same');

    const updated = updatePipeline.mock.results[0].value;
    expect(updated.stages[0].jobs[0].trace).toBeUndefined();
    expect(updated.stages[1].jobs[0].trace).toBe('test trace');
  });

  it('shows a rejected pipeline load, then retries into the successful list', async () => {
    const { fetchPipelines } = require('~/material_system/surfaces/Pipelines/data');
    const { createGitLabClient } = require('~/material_system/surfaces/gitlabApi');
    createGitLabClient.mockReturnValue({});
    fetchPipelines.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([
      { id: 10, title: 'Retry succeeded', branch: 'main', sha: 'abc', status: 'running' },
    ]);

    const wrapper = shallowMount(PipelinesSurface, { propsData: { projectPath: 'group/project' } });
    await waitForPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="alert"]').text()).toContain('Offline');
    await wrapper.find('[role="alert"] button').trigger('click');
    await waitForPromises();
    await wrapper.vm.$nextTick();

    expect(fetchPipelines).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'PipelinesList' }).props('pipelines')).toEqual([
      expect.objectContaining({ id: 10, title: 'Retry succeeded' }),
    ]);
    wrapper.destroy();
  });

  it('retries the selected job by its raw id and updates only its stage-qualified identity', async () => {
    const pipeline = {
      id: 10,
      stages: [
        { name: 'build', jobs: [{ id: 1, key: 'same', status: 'failed' }] },
        { name: 'test', jobs: [{ id: 2, key: 'same', name: 'Test', status: 'failed' }] },
      ],
    };
    const updatePipeline = jest.fn((_id, transform) => transform(pipeline));
    let resolveRetry;
    const vm = {
      activeJobKey: 'test:same',
      activeJob: pipeline.stages[1].jobs[0],
      detail: pipeline,
      api: { retryJob: jest.fn(() => new Promise((resolve) => { resolveRetry = resolve; })) },
      updatePipeline,
    };

    const retry = PipelinesSurface.methods.retryJob.call(vm);
    vm.activeJobKey = 'build:same';
    resolveRetry({ id: 123, name: 'job', status: 'pending' });
    await retry;

    expect(vm.api.retryJob).toHaveBeenCalledWith(2);
    const updated = updatePipeline.mock.results[0].value;
    expect(updated.id).toBe(10);
    expect(updated.stages[0].jobs[0].status).toBe('failed');
    expect(updated.stages[1].jobs[0]).toMatchObject({ id: 123, key: 'same', name: 'job', status: 'pending', duration: '—' });
  });
});
