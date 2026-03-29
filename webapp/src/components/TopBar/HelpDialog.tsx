/**
 * HelpDialog – modal explaining all search operators.
 * Uses @radix-ui/react-dialog for accessible, focus-trapped overlay.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import styles from './HelpDialog.module.css';

interface Props {
  open: boolean;
  isLightMode: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HelpDialog({ open, isLightMode, onOpenChange }: Props) {
  const theme = isLightMode ? styles.light : styles.dark;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={`${styles.content} ${theme}`}
          style={{ height: '95vh', width: 'min(95vw, 70rem)' }}
        >

          <div className={styles.header}>
            <Dialog.Title className={styles.title}>Search Help</Dialog.Title>
            <Dialog.Close asChild>
              <button className={`${styles.closeBtn} ${theme}`} aria-label="Close">
                <Cross2Icon width={18} height={18} />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description asChild>
            <div className={styles.body}>

              {/* ── Term Search ── */}
              <section>
                <h3 className={styles.sectionTitle}>Term Search</h3>
                <p className={styles.intro}>
                  The term search searches inside the dictionary headwords. In addition to typing the term that you are looking for, two wildcard characters are supported in this search mode: <code className={styles.example}>*</code> and <code className={styles.example}>?</code>
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Meaning</th>
                      <th>Example</th>
                      <th>Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td rowSpan={4}><code className={styles.op}>*</code></td>
                      <td rowSpan={2}>Any number of characters, syllables, or words</td>
                      <td><code className={styles.example}>sangs*</code></td>
                      <td>sangs, sangs rgyas, sangs rgyas kyi …</td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སངས་*</code></td>
                      <td className={`${styles.tibExample} tib`}>སངས་, སངས་རྒྱས་, སངས་རྒྱས་ཀྱི་ …</td>
                    </tr>

                    <tr>
                      <td rowSpan={2}>Also matches in the middle</td>
                      <td><code className={styles.example}>sangs * chos</code></td>
                      <td>sangs rgyas kyi chos, …</td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སངས་ * ཆོས་</code></td>
                      <td className={`${styles.tibExample} tib`}>སངས་རྒྱས་ཀྱི་ཆོས་, …</td>
                    </tr>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>?</code></td>
                      <td rowSpan={2}>Exactly one character</td>
                      <td><code className={styles.example}>cho?</code></td>
                      <td>chos, chog, chod, …</td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>ཆོ?</code></td>
                      <td className={`${styles.tibExample} tib`}>ཆོས་, ཆོག་, ཆོད་, …</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* ── Extended / Fulltext Search ── */}
              <section>
                <h3 className={styles.sectionTitle}>Fulltext Search</h3>
                <p className={styles.intro}>
                  The fulltext search searches inside headwords and definition texts. 
                  To use the fulltext search, open the extended search in the menu and then select "Fulltext".
                  In addition to typing the term you are looking for, you may use the following operators in this search mode:
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Meaning</th>
                      <th>Example</th>
                      <th>Finds entries …</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>&amp;</code></td>
                      <td rowSpan={2}>AND – both terms must appear</td>
                      <td><code className={styles.example}>sangs rgyas &amp; chos</code></td>
                      <td>containing <em>sangs rgyas</em> AND <em>chos</em></td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སངས་རྒྱས་ &amp; ཆོས་</code></td>
                      <td>containing <em className={`${styles.tibExample} tib`}>སངས་རྒྱས་</em> AND <em className={`${styles.tibExample} tib`}>ཆོས་</em></td>
                    </tr>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>|</code></td>
                      <td rowSpan={2}>OR – at least one term must appear</td>
                      <td><code className={styles.example}>sangs rgyas | chos</code></td>
                      <td>containing <em>sangs rgyas</em> OR <em>chos</em></td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སངས་རྒྱས་ | ཆོས་</code></td>
                      <td>containing <em className={`${styles.tibExample} tib`}>སངས་རྒྱས་</em> OR <em className={`${styles.tibExample} tib`}>ཆོས་</em></td>
                    </tr>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>!</code></td>
                      <td rowSpan={2}>NOT – term must <em>not</em> appear</td>
                      <td><code className={styles.example}>sangs rgyas ! chos</code></td>
                      <td>containing <em>sangs rgyas</em> but NOT <em>chos</em></td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སངས་རྒྱས་ ! ཆོས་</code></td>
                      <td>containing <em className={`${styles.tibExample} tib`}>སངས་རྒྱས་</em> but NOT <em className={`${styles.tibExample} tib`}>ཆོས་</em></td>
                    </tr>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>~</code></td>
                      <td rowSpan={2}>Suffix wildcard – matches zero or more characters at the end of a word</td>
                      <td><code className={styles.example}>sang~</code></td>
                      <td>containing any word starting with <em>sang</em></td>
                    </tr>
                    <tr>
                      <td><code className={`${styles.example} ${styles.tibExample} tib`}>སང~</code></td>
                      <td>containing any syllable starting with <em className={`${styles.tibExample} tib`}>སང་</em></td>
                    </tr>
                  </tbody>
                </table>
                <p className={styles.note}>
                  <strong>Note:</strong> <code className={styles.op}>~</code> may only be placed at the <em>end</em> of a word (e.g. <code className={styles.example}>buddh~</code> / <code className={`${styles.example} ${styles.tibExample} tib`}>སངས་རྒྱ~</code>), not in the middle or at the start.
                </p>
              </section>



              {/* ── Keyboard Navigation ── */}
              <section>
                <h3 className={styles.sectionTitle}>Keyboard Navigation</h3>
                <p className={styles.intro}>
                  There is a simple keyboard navigation mode that allows you to search and look at different results
                  by only using the keyboard.
                </p>
                <p className={styles.intro}>
                  Keyboard navigation is available only in <em>Terms Search</em> mode (not during Fulltext Search mode).
                  Furthermore, it is only available when the cursor is focused inside the search input field.
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Keys</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>Enter</code></td>
                      <td>Opens the definitions for the entered term while keeping the keyboard focus inside the input field.</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>Arrow Up</code> / <code className={styles.op}>Arrow Down</code></td>
                      <td>Move one position up / down in the result list</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>Shift + Arrow Up</code> / <code className={styles.op}>Shift + Arrow Down</code></td>
                      <td>Move one page up / down in the result list</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>Page Up</code> / <code className={styles.op}>Page Down</code></td>
                      <td>Scroll up / down inside the definition (if the definition is longer than the visible area.)</td>
                    </tr>
                  </tbody>
                </table>
                <p className={styles.note}>
                  <strong>Note:</strong> These keys only change the selected term in the result list.
                  The keyboard focus remains inside the input field so you can continue typing.
                </p>
              </section>

            </div>
          </Dialog.Description>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
