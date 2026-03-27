/**
 * WelcomePage – the landing page shown when no search is active.
 *
 * Displays credits for the included dictionaries and a brief intro.
 */
import { useCallback, useMemo } from 'react';
import styles from './WelcomePage.module.css';
import { DICTLIST } from '@/config/dictlist';
import { GLOBAL_SETTINGS } from '@/config/globalSettings';
import TopBar from '@/components/TopBar/TopBar';
import { useDictNavigation } from '@/hooks/useDictNavigation';
import { useSearchHandlers } from '@/hooks/useSearchHandlers';
import { useSyncStateFromUrl } from '@/hooks/useSyncStateFromUrl';

interface CreditEntry {
  id: string;
  title: string;
  description: string;
}

export default function WelcomePage() {
  useSyncStateFromUrl();
  
  const navigation = useDictNavigation();
  const handlers = useSearchHandlers();

  // Build credits list from dictionaries that have listCredits: "true"
  const credits = useMemo<CreditEntry[]>(() => {
    const isLocalhost = window.location?.hostname?.startsWith('localhost');
    const publicOnly = GLOBAL_SETTINGS.publicOnly && !isLocalhost;

    return Object.entries(DICTLIST)
      .filter(([, info]: [string, any]) => {
        if (publicOnly && info.public) return false;
        return info.listCredits;
      })
      .map(([id, info]: [string, any]) => {
        let title = '';
        let description = '';

        if (info.about) {
          title = info.about.replace(/[|].*/, '');
          description = info.about
            .replace(/^[^|]*[|]/, '')
            .replace(/[|]/g, '<br />');
        } else {
          title = info.label;
        }

        return { id, title, description };
      });
  }, []);

  return (
    <>
      <TopBar
              onInputChange={handlers.handleInputChange}
              onOpenExtendedSearch={handlers.handleOpenExtendedSearch}
              onCloseExtendedSearch={handlers.handleCloseExtendedSearch}
              onModeChange={handlers.handleModeChange}
              onLangChange={handlers.handleLangChange}
              onEnter={handlers.handleEnter}
            />
      <div className="page">
        <div className="contentArea">
          <div className="mainWrap">
            <div id="definitions">
              <h1 className="title">Welcome to the Tibetan-English Dictionary!</h1>
              <p>
                <strong><em>Please enter a Tibetan term above.</em></strong>{' '}
                You can either type in Wylie transliteration or you can use a Tibetan keyboard layout.
              </p>
              <p>
                After typing a term, click on one of the suggestions in the list or
                press the Enter key to open the result directly.
              </p>
              <p>
                If you are unfamiliar with Wylie transliteration, see{' '}
                <a href="https://resources.christian-steinert.de/download/WylieTransliteration.pdf" className="link">
                  this short summary
                </a>.
              </p>

              {credits.length > 0 && (
                <details className="mt-10">
                  <summary><span className="link">More information about this application...</span></summary>
                  <h2 className="subtitle">About this application</h2>
                  <p>
                    This application is available both as{' '}
                    <a href="https://dictionary.christian-steinert.de" className="link">online application</a> and as{' '}
                    <a href="https://www.christian-steinert.de/home/buddhist-apps/tibetan-dictionary" className="link">android app</a>.{' '}
                    <a href="https://github.com/christiansteinert/tibetan-dictionary" className="link">
                      The source code is available on github.
                    </a>
                  </p>

                  <h2 className="subtitle">Contained Dictionaries</h2>
                  <p>
                    This application contains dictionaries and glossaries by the following
                    authors. The copyright of the included material remains with the
                    original authors:
                  </p>
                  <dl className={styles.credits}>
                    {credits.map(({ id, title, description }) => (
                      <div key={id}>
                        <dt className={styles.creditTitle}>{title}</dt>
                        <dd className={styles.creditDescription} dangerouslySetInnerHTML={{ __html: description }} />
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
