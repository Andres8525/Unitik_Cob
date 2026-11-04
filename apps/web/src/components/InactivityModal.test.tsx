import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import InactivityModal from './InactivityModal';

interface ElementWithChildren {
  children?: ReactNode;
  className?: string;
  role?: string;
  'aria-modal'?: boolean;
  onClick?: () => void;
}

function getElement(node: ReactNode): ReactElement<ElementWithChildren> {
  if (!isValidElement<ElementWithChildren>(node)) {
    throw new Error('Expected a React element');
  }
  return node;
}

describe('InactivityModal', () => {
  it('renders the inactivity alert with the requested layout and copy', () => {
    const modal = InactivityModal({ onLogout: vi.fn(), onExtendSession: vi.fn() });
    const overlay = getElement(modal);
    const dialog = getElement(Children.toArray(overlay.props.children)[0]);
    const dialogChildren = Children.toArray(dialog.props.children);
    const footer = getElement(dialogChildren[4]);
    const [logoutButton, extendButton] = Children.toArray(footer.props.children).map(getElement);

    expect(overlay.props.className).toContain('fixed inset-0');
    expect(dialog.props.role).toBe('dialog');
    expect(dialog.props['aria-modal']).toBe('true');
    expect(dialog.props.className).toContain('rounded-xl bg-white');
    expect(dialog.props.className).toContain('shadow-xl');
    expect(dialogChildren[1]).toMatchObject({
      props: { className: 'my-5 border-t border-slate-200' },
    });
    expect(dialogChildren[2]).toMatchObject({
      props: { children: 'Su sesión expirará en 1 minuto por inactividad.' },
    });
    expect(dialogChildren[3]).toMatchObject({
      props: {
        children:
          'Por motivos de seguridad, cerraremos su sesión automáticamente. Presione el botón de abajo para permanecer activo en el sistema.',
      },
    });
    expect(logoutButton.props.children).toBe('Salir');
    expect(extendButton.props.children).toBe('Extender sesión');
    expect(footer.props.className).toContain('justify-end');
  });

  it('calls the corresponding callback when each button is clicked', () => {
    const onLogout = vi.fn();
    const onExtendSession = vi.fn();
    const modal = InactivityModal({ onLogout, onExtendSession });
    const dialog = getElement(Children.toArray(getElement(modal).props.children)[0]);
    const footer = getElement(Children.toArray(dialog.props.children)[4]);
    const [logoutButton, extendButton] = Children.toArray(footer.props.children).map(getElement);

    logoutButton.props.onClick?.();
    expect(onLogout).toHaveBeenCalledOnce();
    expect(onExtendSession).not.toHaveBeenCalled();

    extendButton.props.onClick?.();
    expect(onExtendSession).toHaveBeenCalledOnce();
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
