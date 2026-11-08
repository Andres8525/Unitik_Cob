export const INACTIVITY_WARNING_DELAY_MS = 30 * 60 * 1000;

export function createInactivityTimers(
  onWarning: () => void,
  warningDelay = INACTIVITY_WARNING_DELAY_MS,
) {
  let warningTimer: ReturnType<typeof setTimeout>;

  const reset = () => {
    clearTimeout(warningTimer);
    warningTimer = setTimeout(onWarning, warningDelay);
  };

  const dispose = () => {
    clearTimeout(warningTimer);
  };

  reset();
  return { reset, dispose };
}
