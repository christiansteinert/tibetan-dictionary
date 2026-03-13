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
} from '../store/settingsSlice';

export default function useSettings() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.settings);

  const updateUnicode = useCallback((v) => dispatch(setUnicode(v)), [dispatch]);
  const updateLowercase = useCallback((v) => dispatch(setLowercase(v)), [dispatch]);
  const updateListSize = useCallback((v) => dispatch(setListSize(v)), [dispatch]);
  const updateLayout = useCallback((v) => dispatch(setLayout(v)), [dispatch]);
  const updateDictionaries = useCallback(
    (active, inactive) => dispatch(setDictionaries({ active, inactive })),
    [dispatch]
  );
  const reset = useCallback(() => dispatch(resetSettings()), [dispatch]);
  const restore = useCallback((snap) => dispatch(restoreSettings(snap)), [dispatch]);

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
