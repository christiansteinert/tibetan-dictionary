import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useWylieInput from './useWylieInput';
import { Language } from '@/types';
import { useRef } from 'react';

// Wrapper component to provide a test seam
function TestInput({
  initialLanguage = 'tib',
  useUnicodeTibetan = true,
  onEnter = vi.fn(),
  onInputChange = vi.fn()
}: {
  initialLanguage?: Language;
  useUnicodeTibetan?: boolean;
  onEnter?: (v: string) => void;
  onInputChange?: (v: string) => void;
}) {
  const { inputRef } = useWylieInput({
    useUnicodeTibetan,
    lowercase: true,
    inputLang: initialLanguage,
    onInputChange,
    onEnter,
  });

  return <input ref={inputRef} data-testid="wylie-input" type="text" />;
}

describe('useWylieInput native Tibetan Regression', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    // We use a fake timer or just normal delay, but userEvent is asynchronous.
    user = userEvent.setup({ delay: null }); // disable artificial delays unless needed
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('Phase 1: Native Tibetan fast typing (སློབ་ཕྲུག)', async () => {
    const onInputChange = vi.fn();
    render(<TestInput onInputChange={onInputChange} initialLanguage="tib" useUnicodeTibetan={true} />);
    const input = screen.getByTestId('wylie-input') as HTMLInputElement;

    // Spy on setSelectionRange to detect IME interruption
    const spySetSelectionRange = vi.spyOn(input, 'setSelectionRange');
    
    // Mock rAF since the hook uses it for setSelectionRange
    const originalRAF = global.requestAnimationFrame;
    global.requestAnimationFrame = (cb) => { cb(Date.now()); return 0; };

    // userEvent triggers input and keyup
    await user.type(input, 'སློབ'); // Incomplete syllable without tseg

    expect(input.value).toBe('སློབ');
    
    // The core bug: Native input triggers setSelectionRange on keyup, which cancels Mac IME mid-composition
    // By typing an incomplete syllable without a tseg, it should NEVER call setSelectionRange 
    // previously it called it on every single character.
    expect(spySetSelectionRange).not.toHaveBeenCalled();

    global.requestAnimationFrame = originalRAF;
  });

  it('Phase 1: Native Tibetan slow typing with delays (སློབ་ཕྲུག)', async () => {
    const onInputChange = vi.fn();
    // Re-setup with delay to simulate human typing
    const slowUser = userEvent.setup({ delay: 50 });
    render(<TestInput onInputChange={onInputChange} initialLanguage="tib" useUnicodeTibetan={true} />);
    const input = screen.getByTestId('wylie-input') as HTMLInputElement;

    // Slow typing simulation
    await slowUser.type(input, 'སློབ་ཕྲུག');

    expect(input.value).toBe('སློབ་ཕྲུག');
  });

  it('Phase 1: IME-style composition ignoring partial native texts', async () => {
    const onInputChange = vi.fn();
    render(<TestInput onInputChange={onInputChange} initialLanguage="tib" useUnicodeTibetan={true} />);
    const input = screen.getByTestId('wylie-input') as HTMLInputElement;

    // Simulate IME composition
    input.focus();
    // @testing-library/user-event has limited IME support, we can use fireEvent if we need exact composition lifecycle.
    // However, modern userEvent.type does trigger some input events.
    // For exact IME testing, let's manually fire the lifecycle if needed,
    // but a standard replace via userEvent shouldn't corrupt Unicode.
    await user.type(input, 'སློབ་ཕྲུག');

    expect(input.value).toBe('སློབ་ཕྲུག');
  });

  it('Phase 1: Backspace edit logic on native input', async () => {
    const onInputChange = vi.fn();
    render(<TestInput onInputChange={onInputChange} initialLanguage="tib" useUnicodeTibetan={true} />);
    const input = screen.getByTestId('wylie-input') as HTMLInputElement;

    await user.type(input, 'སློབ་ཕྲུག{Backspace}{Backspace}{Backspace}');
    // 'སློབ་ཕྲུག' is: སློ བ ་ ཕྲུ ག 
    // Backspacing 3 times should be 'སློབ་' depending on precise char composition, 
    // but primarily evaluating that no garbled Wylie like 'slob' appears.
    expect(input.value).not.toMatch(/[a-zA-Z]/); // Should definitely not have reverted to english alphabet Wylie
  });

  it('Phase 1: Wylie non-regression', async () => {
    const onInputChange = vi.fn();
    render(<TestInput onInputChange={onInputChange} initialLanguage="tib" useUnicodeTibetan={true} />);
    const input = screen.getByTestId('wylie-input') as HTMLInputElement;

    await user.type(input, 'slob phrug ');
    // useWylieInput treats space as syllable boundary and converts the Wylie automatically.
    // Given 'slob phrug ', it converts to 'སློབ་ཕྲུག་ ' or 'སློབ་ཕྲུག ' depending on precise Wylie rules
    expect(input.value).toMatch(/སློབ་ཕྲུག/);
  });
});
