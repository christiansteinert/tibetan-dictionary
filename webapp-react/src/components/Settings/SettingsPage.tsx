/**
 * SettingsPage – user preferences screen.
 *
 * Allows configuring:
 *   - Unicode Tibetan mode
 *   - Lowercase Wylie input
 *   - Results per page
 *   - Active/inactive dictionaries (with drag reordering)
 *   - Color theme
 */
import { useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useSettings from '@/hooks/useSettings';
import DictionarySelector from './DictionarySelector';
import { RootState } from '@/store/store';

export default function SettingsPage() {
  const navigate = useNavigate();
  const {
    unicode,
    lowercase,
    listSize,
    layout,
    activeDictionaries,
    inactiveDictionaries,
    updateUnicode,
    updateLowercase,
    updateListSize,
    updateLayout,
    updateDictionaries,
    restoreSettings,
    resetSettings,
  } = useSettings();

  // Snapshot settings on mount so we can restore them on cancel
  const currentSettings = useSelector((s: RootState) => s.settings);
  const snapshot = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    // Capture only once when the page mounts
    if (!snapshot.current) {
      snapshot.current = { ...currentSettings };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- handlers ---------------------------------------------------------

  const handleSave = useCallback(() => {
    navigate(-1); // go back
  }, [navigate]);

  const handleCancel = useCallback(() => {
    if (snapshot.current) {
      restoreSettings(snapshot.current);
    }
    navigate(-1);
  }, [navigate, restoreSettings]);

  const handleReset = useCallback(() => {
    resetSettings();
    navigate(-1);
  }, [resetSettings, navigate]);

  const handleDictionaryChange = useCallback(
    (active: string[], inactive: string[]) => {
      updateDictionaries(active, inactive);
    },
    [updateDictionaries]
  );

  // --- derived values ---------------------------------------------------

  // Map unicode value to select option
  let unicodeValue = 'false';
  if (unicode === true) unicodeValue = 'true';
  else if (unicode === 'output') unicodeValue = 'output';

  return (
    <div className="mainWrap">
      <div id="settingsScreen">
        <form className="settings">
          <h2 className="heading">Settings</h2>

          {/* Unicode Tibetan */}
          <div>
            <strong><label htmlFor="setting_unicode">Show Tibetan Text:</label></strong>
            <span>
              <select
                id="setting_unicode"
                value={unicodeValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'true') updateUnicode(true);
                  else if (v === 'output') updateUnicode('output');
                  else updateUnicode(false);
                }}
              >
                <option value="true">Show Tibetan text in Tibetan script</option>
                <option value="output">Show Tibetan text in Tibetan script but leave input in Wylie transliteration</option>
                <option value="false">Show all Tibetan text in Wylie transliteration</option>
              </select>
            </span>
          </div>

          {/* Lowercase */}
          <div>
            <strong><label htmlFor="setting_lowercase">Convert all text to lower case?</label></strong>
            <span>
              <select
                id="setting_lowercase"
                value={lowercase ? 'true' : 'false'}
                onChange={(e) => updateLowercase(e.target.value === 'true')}
              >
                <option value="false">Allow typing of upper case Wylie</option>
                <option value="true">Convert all Wylie input to lower case</option>
              </select>
              <br />
              <div className="settingsinfo">
                (Mobile devices often have auto-capitalization features that
                interfere with Wylie input — in such cases it can be convenient
                if the app converts all Wylie input to lower case.)
              </div>
            </span>
          </div>

          {/* List size */}
          <div>
            <strong><label htmlFor="setting_list_size">Number of results:</label></strong>
            <span>
              <select
                id="setting_list_size"
                value={String(listSize)}
                onChange={(e) => updateListSize(parseInt(e.target.value, 10))}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="250">250</option>
              </select>
            </span>
          </div>

          {/* Dictionary list */}
          <div>
            <span className="label">
              <strong>Active Dictionaries</strong> (select and change the order
              of the dictionaries that you want to use):
            </span>
            <DictionarySelector
              activeDictionaries={activeDictionaries}
              inactiveDictionaries={inactiveDictionaries}
              onChange={handleDictionaryChange}
            />
          </div>

          {/* Layout / theme */}
          <div>
            <strong><label htmlFor="setting_layout">Color Scheme:</label></strong>
            <span>
              <select
                id="setting_layout"
                value={layout}
                onChange={(e) => updateLayout(e.target.value)}
              >
                <option value="layout_white">light (black text, white background)</option>
                <option value="layout_black">dark (white text, black background)</option>
              </select>
            </span>
          </div>

          {/* Action buttons */}
          <div className="buttons">
            <span></span>
            <span>
              <input type="button" value="Cancel" onClick={handleCancel} />
              <input type="button" value="Reset to Default" title="Reset these settings to the default values." onClick={handleReset} />
              <input type="button" value="Save" onClick={handleSave} />
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
