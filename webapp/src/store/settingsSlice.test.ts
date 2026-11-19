import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('lastInputLang setting', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('is saved with the other settings when the user switches language', async () => {
    const { default: store } = await import('./store');
    const { setLastInputLang } = await import('./settingsSlice');
    expect(store.getState().settings.lastInputLang).toBe('tib');
    store.dispatch(setLastInputLang('en'));
    expect(JSON.parse(localStorage.getItem('settings') || '{}').lastInputLang).toBe('en');
  });

  it('is read back when the app starts again', async () => {
    localStorage.setItem('settings', JSON.stringify({ lastInputLang: 'skt' }));
    const { default: store } = await import('./store');
    expect(store.getState().settings.lastInputLang).toBe('skt');
  });

  it('falls back to Tibetan for an unknown saved value', async () => {
    localStorage.setItem('settings', JSON.stringify({ lastInputLang: 'fr' }));
    const { default: store } = await import('./store');
    expect(store.getState().settings.lastInputLang).toBe('tib');
  });
});
