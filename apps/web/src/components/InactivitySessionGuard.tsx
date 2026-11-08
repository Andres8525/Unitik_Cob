import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { refreshSession } from '../api/http';
import { useAuthStore } from '../stores/auth';
import InactivityModal from './InactivityModal';
import { createInactivityTimers } from './inactivityTimers';

export default function InactivitySessionGuard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const timers = useRef<ReturnType<typeof createInactivityTimers> | null>(null);
  const warningActive = useRef(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extensionError, setExtensionError] = useState<string>();

  useEffect(() => {
    if (!user || !['ADMIN', 'TECHNICIAN'].includes(user.role)) return;

    warningActive.current = false;
    const inactivityTimers = createInactivityTimers(
      () => {
        warningActive.current = true;
        setWarningVisible(true);
        setExtensionError(undefined);
      },
    );
    timers.current = inactivityTimers;

    const resetWhileActive = () => {
      if (!warningActive.current) inactivityTimers.reset();
    };
    const activityEvents: Array<keyof WindowEventMap> = [
      'keydown',
      'click',
      'mousemove',
      'pointerdown',
      'scroll',
      'touchstart',
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetWhileActive, { passive: true });
    }

    return () => {
      inactivityTimers.dispose();
      timers.current = null;
      warningActive.current = false;
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetWhileActive);
      }
    };
  }, [user, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleExtendSession = async () => {
    setExtending(true);
    setExtensionError(undefined);
    try {
      const refreshed = await refreshSession();
      if (!refreshed) {
        handleLogout();
        return;
      }

      warningActive.current = false;
      timers.current?.reset();
      setWarningVisible(false);
    } catch {
      setExtensionError(
        'No fue posible renovar su sesión. Verifique su conexión e inténtelo de nuevo.',
      );
    } finally {
      setExtending(false);
    }
  };

  if (!warningVisible) return null;

  return (
    <InactivityModal
      errorMessage={extensionError}
      isExtending={extending}
      onExtendSession={handleExtendSession}
      onLogout={handleLogout}
    />
  );
}
