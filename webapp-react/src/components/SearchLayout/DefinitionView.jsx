/**
 * DefinitionView – displays the formatted definitions for the active term.
 *
 * Renders the HTML produced by definitionFormatter, binds a custom tooltip
 * system (matching the original jQuery tooltip behaviour), and activates
 * inline Tibetan sections as clickable links once the async check confirms
 * they exist in the dictionary.
 */
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { bindTooltips } from '../../utils/tooltip';

export default function DefinitionView({ onTermClick, onScanClick }) {
  const containerRef = useRef(null);
  const definitionHtml = useSelector((s) => s.search.definitions);
  const inlineSections = useSelector((s) => s.search.inlineSections);
  const activeTerm = useSelector((s) => s.search.activeTerm);
  const isLoading = useSelector((s) => s.search.isLoadingDefinition);

  /**
   * After HTML is injected, attach click handlers for:
   * - Inline Tibetan sections (data-wylie attribute)
   * - Scan links (data-scan-dict attribute)
   * - External links (open in system browser on Cordova)
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !definitionHtml) return;

    // Click handler delegation
    const handleClick = (e) => {
      // Inline Tibetan link (data-wylie) — takes priority over tooltip click
      const target = e.target.closest('[data-wylie]');
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        onTermClick?.(target.dataset.wylie, 'tib');
        return;
      }

      // Scan link
      const scanTarget = e.target.closest('[data-scan-dict]');
      if (scanTarget) {
        e.preventDefault();
        const { scanDict, scanTerm, scanPages } = scanTarget.dataset;
        if (scanDict && scanPages) {
          try {
            onScanClick?.(scanDict, scanTerm, JSON.parse(scanPages));
          } catch (err) {
            console.error('Error parsing scan data:', err);
          }
        }
        return;
      }

      // External links: open in system browser on Cordova
      const link = e.target.closest('a[href^="http"]');
      if (link && window.cordova) {
        e.preventDefault();
        const handle = cordova.InAppBrowser.open(link.href, '_system', 'location=yes');
        handle?.close();
      }
    };

    // Use capture phase for our handler so [data-wylie] gets checked
    // before the tooltip's bubble-phase click handler fires
    el.addEventListener('click', handleClick, true);

    // Bind tooltip handlers (hover + click-to-popup) to .tooltip elements
    const cleanupTooltips = bindTooltips(el);

    return () => {
      el.removeEventListener('click', handleClick, true);
      cleanupTooltips();
    };
  }, [definitionHtml, onTermClick, onScanClick]);

  /**
   * Activate inline Tibetan sections as links once the backend confirms
   * they exist in the dictionary. Adds the .link class and data-wylie
   * attribute so the click delegation above picks them up.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !inlineSections || Object.keys(inlineSections).length === 0) return;

    for (const sectionId of Object.keys(inlineSections)) {
      const sectionWylie = inlineSections[sectionId].wylie || '';
      // Don't make the currently-displayed term clickable
      if (sectionWylie && sectionWylie !== activeTerm) {
        const span = el.querySelector('#' + sectionId);
        if (span) {
          span.classList.add('link');
          span.dataset.wylie = sectionWylie;
        }
      }
    }
  }, [inlineSections, definitionHtml, activeTerm]);

  if (isLoading) {
    return (
      <div id="definitions" className="definitions">
        <div className="loading">Loading…</div>
      </div>
    );
  }

  if (!definitionHtml) {
    return <div id="definitions" className="definitions" />;
  }

  return (
    <div
      id="definitions"
      className="definitions"
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: definitionHtml }}
    />
  );
}
