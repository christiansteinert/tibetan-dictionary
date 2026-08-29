/**
 * DictionarySelector – the sortable list of dictionaries in Settings.
 *
 * Uses Sortable.js for drag-and-drop reordering and checkboxes for
 * enabling/disabling individual dictionaries.
 */
import { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { GROUPED_DICTLIST, DICTLIST } from '../../config/dictlist';
import { bindTooltips } from '@/utils/tooltip';
import { selectAllDictionaryIds } from '@/store/settingsSlice';

/**
 * Build language tag HTML for a dictionary entry.
 */
function getLangTags(dictInfo) {
  const tooltipMap = {
    tib: 'Tibetan',
    skt: 'Sanskrit',
    en: 'English',
    mn: 'Mongolian',
    '->': '→',
    '<->': '↔',
  };

  if (!dictInfo.language) return { langTagHtml: '', tooltipText: '' };

  let tooltipText = '';
  let langTagHtml = '';

  for (let i = 0; i < dictInfo.language.length; i++) {
    const languages = dictInfo.language[i].split(',');
    if (i > 0) tooltipText += ' ';

    for (let j = 0; j < languages.length; j++) {
      const lang = languages[j].trim();
      if (j > 0) tooltipText += ', ';

      if (dictInfo.language.length === 1 && languages.length === 1) {
        tooltipText = tooltipMap[lang] + ' -> ' + tooltipMap[lang];
      } else {
        tooltipText += tooltipMap[lang] || lang;
      }

      if (lang === '->' || lang === '<->') {
        langTagHtml += `<span class="langtag-arrow">${tooltipMap[lang]}</span>`;
      } else {
        langTagHtml += `<span class="langtag langtag-${lang}">${lang}</span>`;
      }
    }
  }

  return { langTagHtml, tooltipText };
}

/**
 * Determine whether any dictionary in a group is active.
 */
function isAnyInGroupActive(groupId, activeDicts) {
  const group = GROUPED_DICTLIST[groupId];
  if (!group?.items) return false;
  return Object.keys(group.items).some((id) => activeDicts.includes(id));
}

export default function DictionarySelector({
  activeDictionaries,
  inactiveDictionaries,
  onChange,
}) {
  const listRef = useRef(null);
  const sortableRef = useRef(null);

  // Build the ordered list of dictionary entries (groups + standalone)
  // Active first (in user order), then inactive
  const entries = buildOrderedEntries(activeDictionaries, inactiveDictionaries);

  // Bind custom tooltips to the list container
  useEffect(() => {
    return bindTooltips(listRef.current);
  }, [entries.length]);

  // Init Sortable.js on the container
  useEffect(() => {
    if (!listRef.current) return;

    if (sortableRef.current) {
      sortableRef.current.destroy();
    }

    sortableRef.current = new Sortable(listRef.current, {
      animation: 150,
      handle: '.drag-handle',
      scroll: true,
      scrollSensitivity: 45,
      scrollSpeed: 10,
      bubbleScroll: true,
      forceAutoScrollFallback: true,
      onEnd: () => collectStateFromDom(),
    });

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [entries.length]);

  /**
   * Read current state from the DOM and call onChange.
   * Defined as a ref-stable function so Sortable's onEnd can use it.
   */
  const collectStateRef = useRef(null);
  collectStateRef.current = () => {
    if (!listRef.current) return;

    const active = [];
    const inactive = [];
    const availableDictIds = selectAllDictionaryIds();

    listRef.current.querySelectorAll('.dictsettings-line').forEach((el) => {
      const dictId = el.id.replace('dict_wrap_', '');
      const checkbox = el.querySelector('input[type="checkbox"]');
      const isChecked = checkbox?.checked;

      const dictInfo = GROUPED_DICTLIST[dictId];

      if (dictInfo?.type === 'group' && dictInfo.items) {
        const itemIds = Object.keys(dictInfo.items).filter((id) => availableDictIds.includes(id));
        if (isChecked) {
          active.push(...itemIds);
        } else {
          inactive.push(...itemIds);
        }
      } else {
        if (isChecked) {
          active.push(dictId);
        } else {
          inactive.push(dictId);
        }
      }
    });

    onChange(active, inactive);
  };
  function collectStateFromDom() {
    collectStateRef.current?.();
  }

    let now = new Date().toISOString();
          

  return (
    <div id="select-dict" ref={listRef}>
      {entries.map(({ id, info, isActive }) => {
        const { langTagHtml, tooltipText } = getLangTags(info);

        return (
          <div
            className="dictsettings-line"
            id={`dict_wrap_${id}`}
            key={id}
          >
            <span className="drag-handle" title="Drag to reorder" />

            <span className="dictsettings-checkbox">
              <input
                type="checkbox"
                name={`dict_${id}`}
                id={`dict_${id}`}
                checked={isActive}
                onChange={collectStateFromDom}
              />
            </span>

            <span className="dictsettings-label">
              <label htmlFor={`dict_${id}`} dangerouslySetInnerHTML={{ __html: info.label }} />
              <span className="dictionaryTagsBlock">
                {langTagHtml && (
                  <span
                    className="langtags"
                    title={tooltipText}
                    dangerouslySetInnerHTML={{ __html: langTagHtml }}
                  />
                )}
                {info.about && (
                  <span
                    className="dict-info tooltip"
                    title={info.about}
                  />
                )}
              </span>
            </span>
            <span className="drag-handle" title="Drag to reorder" />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an ordered list of dictionary entries for display.
 * Active dictionaries first (in user order), then inactive ones.
 */
function buildOrderedEntries(activeDictionaries, inactiveDictionaries) {
  const processedGroups = new Set();
  const activeEntries = [];
  const inactiveEntries = [];
  const availableDictIds = selectAllDictionaryIds();

  // Process active dictionaries in order
  for (const dictId of activeDictionaries) {
    if (!availableDictIds.includes(dictId)) {
      continue; // Skip if the dictionary is unavailable
    }
    let info = GROUPED_DICTLIST[dictId];
    if (!info) {
      info = DICTLIST[dictId];
      if (!info) {
        continue;
      }
    }

    const groupId = info.groupId;
    if (groupId && !processedGroups.has(groupId)) {
      const groupInfo = GROUPED_DICTLIST[groupId];
      if (groupInfo) {
        activeEntries.push({ id: groupId, info: groupInfo, isActive: true });
        processedGroups.add(groupId);
      }
    } else if (!groupId && !processedGroups.has(dictId)) {
      activeEntries.push({ id: dictId, info, isActive: true });
      processedGroups.add(dictId);
    }
  }

  // Process remaining entries from GROUPED_DICTLIST that weren't in active
  for (const [dictId, dictInfo] of Object.entries(GROUPED_DICTLIST)) {
    if (processedGroups.has(dictId)) continue;
    const isAvailable = dictInfo.type === 'group' 
      ? Object.keys(dictInfo.items || {}).some(id => availableDictIds.includes(id))
      : availableDictIds.includes(dictId);
    if (!isAvailable) {
      continue; // Skip if the dictionary is unavailable
    }

    if (dictInfo.type === 'group') {
      const isActive = isAnyInGroupActive(dictId, activeDictionaries);
      if (isActive) {
        activeEntries.push({ id: dictId, info: dictInfo, isActive: true });
      } else {
        inactiveEntries.push({ id: dictId, info: dictInfo, isActive: false });
      }
    } else {
      const isActive = activeDictionaries.includes(dictId);
      if (isActive) {
        activeEntries.push({ id: dictId, info: dictInfo, isActive: true });
      } else {
        inactiveEntries.push({ id: dictId, info: dictInfo, isActive: false });
      }
    }
    processedGroups.add(dictId);
  }

  return [...activeEntries, ...inactiveEntries];
}
