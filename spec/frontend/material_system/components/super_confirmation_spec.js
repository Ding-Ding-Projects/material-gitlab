import { mount } from '@vue/test-utils';

import SC from '~/material_system/components/super_confirmation.vue';

const tid = (w, id) => w.find(`[data-testid="${id}"]`);
const slide = async (w, v) => {
  const s = tid(w, 'super-confirmation-slider');
  s.element.value = String(v);
  await s.trigger('input');
  await s.trigger('change');
};

describe('SuperConfirmation', () => {
  it('has no text input to type into', () => {
    const w = mount(SC, { propsData: { target: 'g/p' } });
    expect(w.findAll('input[type="text"]').length).toBe(0);
  });
  it('locks the slider until both keys are turned', async () => {
    const w = mount(SC, { propsData: { target: 'g/p' } });
    expect(tid(w, 'super-confirmation-slider').attributes('disabled')).toBeDefined();
    await tid(w, 'super-confirmation-key-1').trigger('click');
    expect(tid(w, 'super-confirmation-slider').attributes('disabled')).toBeDefined();
    await tid(w, 'super-confirmation-key-2').trigger('click');
    expect(tid(w, 'super-confirmation-slider').attributes('disabled')).toBeUndefined();
    expect(tid(w, 'super-confirmation-key-1').attributes('aria-checked')).toBe('true');
  });
  it('springs back below 100 and authorizes only at 100', async () => {
    const w = mount(SC, { propsData: { target: 'g/p' } });
    await tid(w, 'super-confirmation-key-1').trigger('click');
    await tid(w, 'super-confirmation-key-2').trigger('click');
    await slide(w, 80);
    expect(w.emitted('authorized')).toBeUndefined();
    expect(w.vm.progress).toBe(0);
    await slide(w, 100);
    expect(w.emitted('authorized')).toHaveLength(1);
    await slide(w, 100);
    expect(w.emitted('authorized')).toHaveLength(1);
  });
  it('turning a key off relocks and resets progress', async () => {
    const w = mount(SC, { propsData: { target: 'g/p' } });
    await tid(w, 'super-confirmation-key-1').trigger('click');
    await tid(w, 'super-confirmation-key-2').trigger('click');
    const s = tid(w, 'super-confirmation-slider');
    s.element.value = '50';
    await s.trigger('input');
    await tid(w, 'super-confirmation-key-2').trigger('click');
    expect(w.vm.progress).toBe(0);
    expect(s.attributes('disabled')).toBeDefined();
  });
  it('respects the host ready precondition', async () => {
    const w = mount(SC, { propsData: { target: 'g/p', ready: false, readyHint: 'Tick it' } });
    await tid(w, 'super-confirmation-key-1').trigger('click');
    await tid(w, 'super-confirmation-key-2').trigger('click');
    expect(tid(w, 'super-confirmation-slider').attributes('disabled')).toBeDefined();
    expect(w.text()).toContain('Tick it');
  });
  it('emergency exit and Escape cancel without authorizing', async () => {
    const w = mount(SC, { propsData: { target: 'g/p' } });
    await tid(w, 'super-confirmation-key-1').trigger('click');
    await tid(w, 'super-confirmation-exit').trigger('click');
    expect(w.emitted('exit')).toHaveLength(1);
    expect(w.vm.keyOne).toBe(false);
    await w.trigger('keydown', { key: 'Escape' });
    expect(w.emitted('exit')).toHaveLength(2);
    expect(w.emitted('authorized')).toBeUndefined();
  });
});
