import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInactivityTimers } from './inactivityTimers';

describe('createInactivityTimers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('warns after inactivity and logs out one minute later', () => {
    const onWarning = vi.fn();
    const onLogout = vi.fn();
    createInactivityTimers(onWarning, onLogout, 1000, 60_000);

    vi.advanceTimersByTime(999);
    expect(onWarning).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onWarning).toHaveBeenCalledOnce();
    expect(onLogout).not.toHaveBeenCalled();

    vi.advanceTimersByTime(59_999);
    expect(onLogout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLogout).toHaveBeenCalledOnce();
  });

  it('resets the warning deadline after activity and cancels timers on cleanup', () => {
    const onWarning = vi.fn();
    const onLogout = vi.fn();
    const timers = createInactivityTimers(onWarning, onLogout, 1000, 60_000);

    vi.advanceTimersByTime(900);
    timers.reset();
    vi.advanceTimersByTime(999);
    expect(onWarning).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onWarning).toHaveBeenCalledOnce();

    timers.dispose();
    vi.advanceTimersByTime(60_000);
    expect(onLogout).not.toHaveBeenCalled();
  });
});
