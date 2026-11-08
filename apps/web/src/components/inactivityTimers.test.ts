import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInactivityTimers } from './inactivityTimers';

describe('createInactivityTimers', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('warns after 30 minutes of inactivity and pauses until reset', () => {
    const onWarning = vi.fn();
    createInactivityTimers(onWarning, 30 * 60 * 1000);

    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(onWarning).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onWarning).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60_000);
    expect(onWarning).toHaveBeenCalledOnce();
  });

  it('resets the warning deadline after activity and cancels timers on cleanup', () => {
    const onWarning = vi.fn();
    const timers = createInactivityTimers(onWarning, 1000);

    vi.advanceTimersByTime(900);
    timers.reset();
    vi.advanceTimersByTime(999);
    expect(onWarning).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onWarning).toHaveBeenCalledOnce();

    timers.dispose();
    vi.advanceTimersByTime(60_000);
    expect(onWarning).toHaveBeenCalledOnce();
  });
});
