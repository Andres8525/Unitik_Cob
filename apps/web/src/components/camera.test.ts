import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cameraErrorMessage,
  canUseInPageCamera,
  prefersNativeCamera,
  snapshotFileName,
  snapshotSize,
} from './camera';

const domError = (name: string) => Object.assign(new Error(name), { name });

describe('camera helpers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('explains permission, missing and busy camera errors in Spanish', () => {
    expect(cameraErrorMessage(domError('NotAllowedError'))).toContain('permiso');
    expect(cameraErrorMessage(domError('NotFoundError'))).toContain('No se encontró una cámara');
    expect(cameraErrorMessage(domError('NotReadableError'))).toContain('otra aplicación');
    expect(cameraErrorMessage('boom')).toContain('importar una imagen');
  });

  it('names snapshots with the capture date and time', () => {
    expect(snapshotFileName(new Date(2026, 10, 24, 9, 5, 7))).toBe('foto-20261124-090507.jpg');
  });

  it('scales large frames down keeping the aspect ratio', () => {
    expect(snapshotSize(3840, 2160)).toEqual({ width: 1920, height: 1080 });
    expect(snapshotSize(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(snapshotSize(0, 720)).toEqual({ width: 0, height: 0 });
  });

  it('detects touch-first devices to use the native camera app', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    expect(prefersNativeCamera()).toBe(true);
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(prefersNativeCamera()).toBe(false);
  });

  it('only offers the in-page camera when getUserMedia exists in a secure context', () => {
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } });
    expect(canUseInPageCamera()).toBe(true);
    vi.stubGlobal('navigator', {});
    expect(canUseInPageCamera()).toBe(false);
    vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => Promise.resolve() } });
    expect(canUseInPageCamera()).toBe(false);
  });
});
