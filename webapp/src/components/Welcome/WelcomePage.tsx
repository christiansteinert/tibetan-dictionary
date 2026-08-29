/**
 * WelcomePage – the landing page shown when no search is active.
 *
 * Displays credits for the included dictionaries and a brief intro.
 */
import { useMemo } from 'react';
import styles from './WelcomePage.module.css';
import { DICTLIST } from '@/config/dictlist';
import { useSyncStateFromUrl } from '@/hooks/useSyncStateFromUrl';
import TopBarWrapper from '@/components/TopBar/TopBarWrapper';
import HelpDialog from '../TopBar/HelpDialog';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAllDictionaryIds } from '@/store/settingsSlice';
import type { RootState } from '../../store/store';

interface CreditEntry {
  id: string;
  title: string;
  description: string;
}

export default function WelcomePage() {
  useSyncStateFromUrl();
  const [helpOpen, setHelpOpen] = useState(false);
  const layout = useSelector((s: RootState) => s.settings.layout);
  const isLightMode = layout !== 'layout_black';


  // Build credits list from dictionaries that have listCredits: "true"
  const credits = useMemo<CreditEntry[]>(() => {
    const availableIds = selectAllDictionaryIds();

    return Object.entries(DICTLIST)
      .filter(([id, dictInfo]: [string, any]) => {
        return availableIds.includes(id) && dictInfo.listCredits;
      })
      .map(([id, info]: [string, any]) => {
        let title = '';
        let description = '';

        if (info.about && info.about.includes('|')) {
          const parts = info.about.split('|');
          title = parts[0];
          description = parts.slice(1).join('<br />');
        } else {
          title = info.label;
          description = info.about || '';
        }

        return { id, title, description };
      });
  }, []);

  return (
    <>
      <TopBarWrapper />
      <div className="page">
        <div className="contentArea">
          <div className="mainWrap">
            <div id="definitions">
              <h1 className="title">Welcome to the Tibetan-English-Sanskrit Dictionary!</h1>
              <p>
                <strong><em>Please enter a Tibetan term above.</em></strong>{' '}
                You can either type in Wylie transliteration or you can use a Tibetan keyboard layout. Use the menu in the top right corner to change the search language.
              </p>
              <p>
                After typing a term, click on one of the suggestions in the list or
                press the Enter key to open the result directly.
              </p>
              <p>
                If you are unfamiliar with Wylie transliteration, see{' '}
                <a onClick={() => setHelpOpen(true)} className="link">
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
                        <dt className={styles.creditTitle} dangerouslySetInnerHTML={{ __html: title }} />
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
      <HelpDialog
        open={helpOpen}
        isLightMode={isLightMode}
        onOpenChange={setHelpOpen}
      />
    </>
  );
}
