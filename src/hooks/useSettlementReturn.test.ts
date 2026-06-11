import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const listeners: Array<(state: { isActive: boolean }) => void> = [];
const removeMock = vi.fn();

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((_evt: string, cb: (s: { isActive: boolean }) => void) => {
      listeners.push(cb);
      return Promise.resolve({ remove: removeMock });
    }),
  },
}));

import { useSettlementReturn } from './useSettlementReturn';

beforeEach(() => {
  listeners.length = 0;
  removeMock.mockClear();
});

describe('useSettlementReturn — appStateChange path', () => {
  it('does not call onReturn before startWatching', () => {
    const cb = vi.fn();
    renderHook(() => useSettlementReturn(cb));
    listeners.forEach(l => l({ isActive: true }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('calls onReturn with the watched id on appStateChange→active', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('settle-1'));
    listeners.forEach(l => l({ isActive: true }));
    expect(cb).toHaveBeenCalledWith('settle-1');
  });

  it('does not fire when app becomes inactive', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('s'));
    listeners.forEach(l => l({ isActive: false }));
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires only once per startWatching call (pending id cleared)', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('s'));
    listeners.forEach(l => l({ isActive: true }));
    listeners.forEach(l => l({ isActive: true }));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('stopWatching cancels pending fire', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => {
      result.current.startWatching('s');
      result.current.stopWatching();
    });
    listeners.forEach(l => l({ isActive: true }));
    expect(cb).not.toHaveBeenCalled();
  });
});

// ---- Control-function + visibility path --------------------------------

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useSettlementReturn — startWatching/stopWatching + visibility', () => {
  it('startWatching arms the pending id (verified via visibilitychange)', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('settle-vis'));
    act(() => setVisibility('visible'));
    expect(cb).toHaveBeenCalledWith('settle-vis');
  });

  it('stopWatching clears the pending id (no fire on visibility)', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => {
      result.current.startWatching('settle-x');
      result.current.stopWatching();
    });
    act(() => setVisibility('visible'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not fire on visibility=hidden even when armed', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('s'));
    act(() => setVisibility('hidden'));
    expect(cb).not.toHaveBeenCalled();
  });

  it('visibility fire clears the pending id (only fires once)', () => {
    const cb = vi.fn();
    const { result } = renderHook(() => useSettlementReturn(cb));
    act(() => result.current.startWatching('s'));
    act(() => setVisibility('visible'));
    act(() => setVisibility('visible'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('startWatching exposes a stable callback identity across renders', () => {
    const cb = vi.fn();
    const { result, rerender } = renderHook(() => useSettlementReturn(cb));
    const first = result.current.startWatching;
    rerender();
    expect(result.current.startWatching).toBe(first);
  });
});
