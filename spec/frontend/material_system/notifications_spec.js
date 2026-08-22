import { NotificationCenter } from '~/material_system';

describe('Material System notification centre', () => {
  let center;
  let clearTimeoutFn;
  let scheduled;

  beforeEach(() => {
    scheduled = new Map();
    clearTimeoutFn = jest.fn((timer) => scheduled.delete(timer));
    let timerSequence = 0;
    center = new NotificationCenter({
      setTimeoutFn: jest.fn((callback) => {
        const timer = ++timerSequence;
        scheduled.set(timer, callback);
        return timer;
      }),
      clearTimeoutFn,
    });
  });

  afterEach(() => center.dispose());

  it('publishes immutable snapshots and an immediate subscription snapshot', () => {
    const listener = jest.fn();
    const unsubscribe = center.subscribe(listener);
    const action = { id: 'retry', label: 'Retry', run: jest.fn() };
    const id = center.notify({ message: 'Build finished', actions: [action] });
    const snapshot = listener.mock.calls.at(-1)[0];

    expect(listener).toHaveBeenNthCalledWith(1, []);
    expect(snapshot[0]).toMatchObject({ id, message: 'Build finished', dismissed: false });

    snapshot[0].message = 'mutated';
    snapshot[0].actions[0].label = 'mutated';

    expect(center.snapshot()[0]).toMatchObject({ message: 'Build finished' });
    expect(center.snapshot()[0].actions[0]).toMatchObject({ label: 'Retry' });

    unsubscribe();
  });

  it.each(['error', 'warning'])('keeps %s notifications reviewable until dismissal', (severity) => {
    const id = center.notify({ message: `${severity} message`, severity });

    expect(center.snapshot()[0]).toMatchObject({ id, persistent: true, dismissed: false });
    expect(scheduled).toHaveProperty('size', 0);
  });

  it('auto-dismisses informational notifications and clears their timer', () => {
    const id = center.notify({ message: 'Saved', timeout: 100 });
    const [[timer, callback]] = scheduled.entries();

    callback();

    expect(center.snapshot()[0]).toMatchObject({ id, dismissed: true });
    expect(clearTimeoutFn).toHaveBeenCalledWith(timer);
  });

  it('invokes a real action and rejects unknown actions', () => {
    const run = jest.fn((value) => `retried:${value}`);
    const id = center.notify({ actions: [{ id: 'retry', label: 'Retry', run }] });

    expect(center.invokeAction(id, 'retry', 'now')).toBe('retried:now');
    expect(run).toHaveBeenCalledWith('now');
    expect(center.invokeAction(id, 'missing')).toBe(false);
  });
});
