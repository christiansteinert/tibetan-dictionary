/**
 * useSettings – convenience hook for reading / writing settings.
 *
 * Wraps Redux dispatch calls so components don't need to import
 * individual action creators.
 */
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setUnicode,
  setLowercase,
  setListSize,
  setLayout,
  setDictionaries,
  resetSettings,
  restoreSettings,
} from '@/store/settingsSlice';

interface UseSettingsReturn {
  unicode: boolean | string;
  lowercase: boolean;
  listSize: number;
  layout: string;
  activeDictionaries: string[];
  inactiveDictionaries: string[];
  updateUnicode: (v: boolean | string) => void;
  updateLowercase: (v: boolean) => void;
  updateListSize: (v: number) => void;
  updateLayout: (v: string) => void;
  updateDictionaries: (active: string[], inactive: string[]) => void;
  resetSettings: () => void;
  restoreSettings: (snap: any) => void;
}

export default function useSettings(): UseSettingsReturn {
  const dispatch = useDispatch();
  const { settings } = useSelector((s: any) => s);

  const updateUnicode = useCallback((v: boolean | string) => dispatch(setUnicode(v)), [dispatch]);
  const updateLowercase = useCallback((v: boolean) => dispatch(setLowercase(v)), [dispatch]);
  const updateListSize = useCallback((v: number) => dispatch(setListSize(v)), [dispatch]);
  const updateLayout = useCallback((v: string) => dispatch(setLayout(v)), [dispatch]);
  const updateDictionaries = useCallback(
    (active: string[], inactive: string[]) => dispatch(setDictionaries({ active, inactive })),
    [dispatch]
  );
  const reset = useCallback(() => dispatch(resetSettings()), [dispatch]);
  const restore = useCallback((snap: any) => dispatch(restoreSettings(snap)), [dispatch]);

  return {
    ...settings,
    updateUnicode,
    updateLowercase,
    updateListSize,
    updateLayout,
    updateDictionaries,
    resetSettings: reset,
    restoreSettings: restore,
  };
}
