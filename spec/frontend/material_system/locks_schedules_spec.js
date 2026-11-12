import { mount } from '@vue/test-utils';
import {
  totp,
  verifyTotp,
  base32Encode,
  base32Decode,
  generateSecret,
} from '~/material_system/features/totp';
import { encodeQr } from '~/material_system/features/qr';
import {
  createLockStore,
  makeChallenge,
  waitSecondsAfter,
  LOCK_MIXES,
} from '~/material_system/features/locks';
import { createScheduleStore } from '~/material_system/features/schedules';
import { createFeatureState } from '~/material_system/features/state';
import LocksPanel from '~/material_system/surfaces/FeatureLayer/LocksPanel.vue';
import UnlockPanel from '~/material_system/surfaces/FeatureLayer/UnlockPanel.vue';
import SchedulesPanel from '~/material_system/surfaces/FeatureLayer/SchedulesPanel.vue';
import Sidebar from '~/material_system/surfaces/Sidebar/Sidebar.vue';

const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    m,
  };
};
const tid = (w, id) => w.find(`[data-testid="${id}"]`);
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
};
const mkFeature = (storage = mem()) =>
  createFeatureState({ storage, root: document.createElement('html'), target: new EventTarget() });

describe('TOTP', () => {
  it('matches the RFC 6238 SHA-1 vectors', async () => {
    const secret = base32Encode(new TextEncoder().encode('12345678901234567890'));
    expect(await totp(secret, 59, 8)).toBe('94287082');
    expect(await totp(secret, 1111111109, 8)).toBe('07081804');
    expect(await totp(secret, 2000000000, 8)).toBe('69279037');
    expect([...base32Decode(secret)].length).toBe(20);
  });
  it('verifies within one step of drift and rejects others', async () => {
    const secret = generateSecret();
    const now = 1_700_000_000;
    expect(await verifyTotp(secret, await totp(secret, now - 30), now)).toBe(true);
    expect(await verifyTotp(secret, await totp(secret, now - 120), now)).toBe(false);
    expect(await verifyTotp(secret, 'abc', now)).toBe(false);
  });
});

describe('QR encoder', () => {
  it('builds version-sized matrices with finder patterns', () => {
    const m = encodeQr('otpauth://totp/x?secret=JBSWY3DPEHPK3PXP');
    expect(m.length % 4).toBe(1);
    expect(m[0].slice(0, 7).every(Boolean)).toBe(true);
    expect(m[1][1]).toBe(false);
    expect(() => encodeQr('x'.repeat(400))).toThrow();
  });
});

describe('lock store', () => {
  it('offers exactly the six mixes and validates inputs', async () => {
    expect(LOCK_MIXES).toHaveLength(6);
    const store = createLockStore({ storage: mem() });
    expect((await store.lock('tab:a', { label: 'A', methods: ['pin'], pin: '12' })).ok).toBe(false);
    expect((await store.lock('tab:a', { label: 'A', methods: ['totp'] })).ok).toBe(false);
    expect(
      (
        await store.lock('tab:a', {
          label: 'A',
          methods: ['pin', 'password'],
          pin: '1234',
          password: 'secret1',
        })
      ).ok,
    ).toBe(true);
    expect(store.isLocked('tab:a')).toBe(true);
  });
  it('escalates the wait after two tries and the ladder only skips the wait', async () => {
    let time = 1_000_000;
    const storage = mem();
    const store = createLockStore({ storage, now: () => time });
    await store.lock('hub:color', { label: 'Color', methods: ['pin'], pin: '2468' });
    expect((await store.unlock('hub:color', { pin: '0000' })).triesLeft).toBe(1);
    const second = await store.unlock('hub:color', { pin: '0000' });
    expect(second.wait).toBe(30);
    expect((await store.unlock('hub:color', { pin: '2468' })).status).toBe('waiting');
    expect(store.skipWait('hub:color')).toBe(true);
    expect(store.isLocked('hub:color')).toBe(true);
    const third = await store.unlock('hub:color', { pin: '1111' });
    expect(third.wait).toBe(60);
    store.skipWait('hub:color');
    store.skipWait('hub:color');
    expect(store.climbsLeft()).toBe(0);
    expect(store.skipWait('hub:color')).toBe(false);
    time += 61_000;
    expect((await store.unlock('hub:color', { pin: '2468' })).ok).toBe(true);
    expect(store.isLocked('hub:color')).toBe(false);
    expect(waitSecondsAfter(1)).toBe(0);
  });
  it('makes all four ladder rungs with working checks', () => {
    let n = 0;
    const random = () => (n += 0.37) % 1;
    const dim = makeChallenge('dimsum', { random, dishes: ['a', 'b', 'c', 'd', 'e'] });
    expect(dim.check(dim.answer)).toBe(true);
    const sums = makeChallenge('sums', { random });
    expect(sums.check(sums.questions.map(([a, b]) => a + b))).toBe(true);
    expect(sums.check(sums.questions.map(() => 0))).toBe(false);
    expect(makeChallenge('moles', { random }).check(15)).toBe(true);
    const clock = makeChallenge('clock', { random });
    expect(clock.check(`${clock.hours}:${String(clock.minutes).padStart(2, '0')}`)).toBe(true);
    expect(clock.choices).toHaveLength(4);
  });
  it('files and resolves Support Tickets', () => {
    const store = createLockStore({ storage: mem() });
    expect(store.fileTicket('  ')).toBeNull();
    const ticket = store.fileTicket('Forgot my PIN');
    store.resolveTicket(ticket.id);
    expect(store.tickets()[0].status).toBe('resolved');
  });
});

describe('schedules', () => {
  it('applies a rule only inside its window', () => {
    const store = createScheduleStore({ storage: mem() });
    expect(
      store.add({
        label: 'Night',
        startTime: '22:00',
        endTime: '07:00',
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        values: { motion: 'reduced' },
      }).ok,
    ).toBe(true);
    expect(
      store.add({ label: '', startTime: '22:00', endTime: '07:00', weekdays: [1], values: {} }).ok,
    ).toBe(false);
    const base = { motion: 'full' };
    expect(store.resolve(base, new Date(2026, 10, 12, 23, 0)).value.motion).toBe('reduced');
    expect(store.resolve(base, new Date(2026, 10, 12, 12, 0)).value.motion).toBe('full');
  });
});

describe('lock panels', () => {
  it('locks a hub panel with a PIN through the wizard and unlocks it', async () => {
    const feature = mkFeature();
    const w = mount(LocksPanel, { propsData: { feature } });
    await tid(w, 'lock-begin').trigger('click');
    await tid(w, 'lock-target').setValue('hub:color');
    await tid(w, 'lock-next').trigger('click');
    await tid(w, 'lock-pin').setValue('2468');
    await tid(w, 'lock-save').trigger('click');
    await flush();
    expect(feature.isLocked('hub:color')).toBe(true);
    const u = mount(UnlockPanel, { propsData: { feature, target: 'hub:color' } });
    await tid(u, 'unlock-pin').setValue('2468');
    await tid(u, 'unlock-submit').trigger('submit');
    await flush();
    expect(feature.isLocked('hub:color')).toBe(false);
    expect(u.emitted('unlocked')).toHaveLength(1);
  });
  it('pairs an authenticator with a local QR and needs the current code', async () => {
    const feature = mkFeature();
    const w = mount(LocksPanel, { propsData: { feature } });
    await tid(w, 'lock-begin').trigger('click');
    await tid(w, 'lock-target').setValue('hub:export');
    await tid(w, 'lock-mix-3').setChecked();
    await tid(w, 'lock-next').trigger('click');
    expect(tid(w, 'lock-qr').exists()).toBe(true);
    const secret = tid(w, 'lock-secret').text();
    await tid(w, 'lock-password').setValue('hunter22');
    await tid(w, 'lock-code').setValue('000000');
    await tid(w, 'lock-save').trigger('click');
    await flush();
    expect(feature.isLocked('hub:export')).toBe(false);
    await tid(w, 'lock-code').setValue(await totp(secret));
    await tid(w, 'lock-save').trigger('click');
    await flush();
    expect(feature.isLocked('hub:export')).toBe(true);
  });
  it('a locked sidebar tab asks to unlock instead of navigating', async () => {
    const feature = mkFeature();
    const sections = [{ name: '', items: [{ id: 'issues', label: 'Issues', href: '/i' }] }];
    const s = mount(Sidebar, {
      propsData: { sections, storage: mem(), feature },
      stubs: { RegexBuilder: true },
    });
    expect(feature.state.tabTargets[0].id).toBe('issues');
    await feature.lockTarget('tab:issues', { label: 'Issues', methods: ['pin'], pin: '1234' });
    await s.vm.$nextTick();
    await s.find('[role="tab"]').trigger('click');
    expect(feature.state.unlockRequest).toEqual({ target: 'tab:issues', href: '/i' });
    expect(s.emitted('navigate')).toBeUndefined();
  });
  it('the ladder skips the wait after all four rungs', async () => {
    const feature = mkFeature();
    await feature.lockTarget('hub:name', { label: 'Name', methods: ['pin'], pin: '1234' });
    await feature.unlockTarget('hub:name', { pin: '0' });
    await feature.unlockTarget('hub:name', { pin: '0' });
    const u = mount(UnlockPanel, { propsData: { feature, target: 'hub:name' } });
    expect(tid(u, 'unlock-wait').exists()).toBe(true);
    await tid(u, 'ladder-start').trigger('click');
    const c1 = u.vm.challenge;
    u.vm.checkRung(c1.answer);
    await u.vm.$nextTick();
    const c2 = u.vm.challenge;
    u.vm.checkRung(c2.questions.map(([a, b]) => a + b));
    u.vm.hits = 14;
    u.vm.moleAt = 2;
    u.vm.whack(2);
    await u.vm.$nextTick();
    const c4 = u.vm.challenge;
    u.vm.checkRung(`${c4.hours}:${String(c4.minutes).padStart(2, '0')}`);
    await u.vm.$nextTick();
    expect(feature.waitRemaining('hub:name')).toBe(0);
    expect(feature.isLocked('hub:name')).toBe(true);
    expect(tid(u, 'unlock-message').text()).toContain('Wait skipped');
  });
  it('schedules panel adds a rule and shows its state', async () => {
    const feature = mkFeature();
    const w = mount(SchedulesPanel, { propsData: { feature } });
    await tid(w, 'rule-label').setValue('Always calm');
    await tid(w, 'rule-start').setValue('00:00');
    await tid(w, 'rule-end').setValue('00:00');
    await tid(w, 'rule-add').trigger('submit');
    expect(feature.state.rules).toHaveLength(1);
    expect(feature.state.effective.motion).toBe('reduced');
    expect(tid(w, 'rule-state-Always calm').text()).toBe('active now');
  });
});
