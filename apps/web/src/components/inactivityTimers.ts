export const INACTIVITY_WARNING_DELAY_MS = 14 * 60 * 1000;
export const INACTIVITY_LOGOUT_DELAY_MS = 60 * 1000;

export function createInactivityTimers(
  onWarning: () => void,
  onLogout: () => void,
  warningDelay = INACTIVITY_WARNING_DELAY_MS,
  logoutDelay = INACTIVITY_LOGOUT_DELAY_MS,
) {
  let warningTimer: ReturnType<typeof setTimeout>;
  let logoutTimer: ReturnType<typeof setTimeout> | undefined;

  const reset = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    logoutTimer = undefined;

    warningTimer = setTimeout(() => {
      onWarning();
      logoutTimer = setTimeout(onLogout, logoutDelay);
    }, warningDelay);
  };

  const dispose = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
  };

  reset();
  return { reset, dispose };
}
