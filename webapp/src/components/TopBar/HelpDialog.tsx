/**
 * HelpDialog – modal explaining all search operators.
 * Uses @radix-ui/react-dialog for accessible, focus-trapped overlay.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons';
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

              {/* ── Tibetan Input ── */}
              <section>
                <h3 className={styles.sectionTitle}>Tibetan Input</h3>
                <p className={styles.intro}>
                  When the language selector is set to <strong>Tibetan</strong> and Unicode output is enabled,
                  you can type search terms using the Wylie (<a href="https://texts.mandala.library.virginia.edu/text/thl-extended-wylie-transliteration-scheme" target="_blank">EWTS</a>) transliteration scheme. As you type,
                  each syllable is automatically converted to the corresponding Tibetan Unicode character after you press <code className={styles.op}>space</code>.
                  (e.g.&nbsp;typing <code className={styles.op}>ka</code> produces <code className={`${styles.example} ${styles.tibExample} tib`}>ཀ</code>).
                  You can also use a Tibetan keyboard layout or paste Tibetan letters directly — they will be kept as-is.
                </p>

                <h4 className={styles.subSectionTitle}>Vowels</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>a</code></td><td className={`${styles.tibExample} tib`}>ཨ</td>
                      <td><code className={styles.op}>i</code></td><td className={`${styles.tibExample} tib`}>ཨི</td>
                      <td><code className={styles.op}>u</code></td><td className={`${styles.tibExample} tib`}>ཨུ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>e</code></td><td className={`${styles.tibExample} tib`}>ཨེ</td>
                      <td><code className={styles.op}>o</code></td><td className={`${styles.tibExample} tib`}>ཨོ</td>
                      <td></td><td></td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Consonants</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>ka</code></td><td className={`${styles.tibExample} tib`}>ཀ</td>
                      <td><code className={styles.op}>kha</code></td><td className={`${styles.tibExample} tib`}>ཁ</td>
                      <td><code className={styles.op}>ga</code></td><td className={`${styles.tibExample} tib`}>ག</td>
                      <td><code className={styles.op}>nga</code></td><td className={`${styles.tibExample} tib`}>ང</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>ca</code></td><td className={`${styles.tibExample} tib`}>ཅ</td>
                      <td><code className={styles.op}>cha</code></td><td className={`${styles.tibExample} tib`}>ཆ</td>
                      <td><code className={styles.op}>ja</code></td><td className={`${styles.tibExample} tib`}>ཇ</td>
                      <td><code className={styles.op}>nya</code></td><td className={`${styles.tibExample} tib`}>ཉ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>ta</code></td><td className={`${styles.tibExample} tib`}>ཏ</td>
                      <td><code className={styles.op}>tha</code></td><td className={`${styles.tibExample} tib`}>ཐ</td>
                      <td><code className={styles.op}>da</code></td><td className={`${styles.tibExample} tib`}>ད</td>
                      <td><code className={styles.op}>na</code></td><td className={`${styles.tibExample} tib`}>ན</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>pa</code></td><td className={`${styles.tibExample} tib`}>པ</td>
                      <td><code className={styles.op}>pha</code></td><td className={`${styles.tibExample} tib`}>ཕ</td>
                      <td><code className={styles.op}>ba</code></td><td className={`${styles.tibExample} tib`}>བ</td>
                      <td><code className={styles.op}>ma</code></td><td className={`${styles.tibExample} tib`}>མ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>tsa</code></td><td className={`${styles.tibExample} tib`}>ཙ</td>
                      <td><code className={styles.op}>tsha</code></td><td className={`${styles.tibExample} tib`}>ཚ</td>
                      <td><code className={styles.op}>dza</code></td><td className={`${styles.tibExample} tib`}>ཛ</td>
                      <td><code className={styles.op}>wa</code></td><td className={`${styles.tibExample} tib`}>ཝ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>zha</code></td><td className={`${styles.tibExample} tib`}>ཞ</td>
                      <td><code className={styles.op}>za</code></td><td className={`${styles.tibExample} tib`}>ཟ</td>
                      <td><code className={styles.op}>&#39;a</code></td><td className={`${styles.tibExample} tib`}>འ</td>
                      <td><code className={styles.op}>ya</code></td><td className={`${styles.tibExample} tib`}>ཡ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>ra</code></td><td className={`${styles.tibExample} tib`}>ར</td>
                      <td><code className={styles.op}>la</code></td><td className={`${styles.tibExample} tib`}>ལ</td>
                      <td><code className={styles.op}>sha</code></td><td className={`${styles.tibExample} tib`}>ཤ</td>
                      <td><code className={styles.op}>sa</code></td><td className={`${styles.tibExample} tib`}>ས</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>ha</code></td><td className={`${styles.tibExample} tib`}>ཧ</td>
                      <td><code className={styles.op}>a</code></td><td className={`${styles.tibExample} tib`}>ཨ</td>
                      <td></td><td></td>
                      <td></td><td></td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Stacking &amp; Special Sequences</h4>
                <p className={styles.intro}>
                  Consonants are stacked automatically based on Tibetan stacking rules. Two special characters can override the default stacking behavior:
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ope&shy;rator</th><th>Mea&shy;ning</th><th>Exam&shy;ple</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>.</code></td>
                      <td>Prevents stacking — keeps adjacent consonants separate</td>
                      <td><code className={styles.op}>g.yag</code></td>
                      <td className={`${styles.tibExample} tib`}>གཡག་</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>+</code></td>
                      <td>Forces stacking — stacks consonants that would not normally stack</td>
                      <td><code className={styles.op}>b+ha</code></td>
                      <td className={`${styles.tibExample} tib`}>བྷ་</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Examples</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Tibetan</th><th>Type</th><th>Tibetan</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>bde ba</code></td><td className={`${styles.tibExample} tib`}>བདེ་བ་</td>
                      <td><code className={styles.op}>sangs rgyas</code></td><td className={`${styles.tibExample} tib`}>སངས་རྒྱས་</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>bsgrubs</code></td><td className={`${styles.tibExample} tib`}>བསྒྲུབས་</td>
                      <td><code className={styles.op}>po'i</code></td><td className={`${styles.tibExample} tib`}>པོའི་</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* ── Sanskrit Input ── */}
              <section>
                <h3 className={styles.sectionTitle}>Sanskrit Input</h3>
                <p className={styles.intro}>
                  When the language selector is set to <strong>Sanskrit</strong>, you can type search terms using the
                  Harvard-Kyoto (HK) transliteration scheme. In many cases, you may alternatively also use many ITRANS sequences.
                  As you type, each sequence is automatically converted to the corresponding IAST character with
                  diacritics (e.g.&nbsp;typing <code className={styles.op}>z</code> produces <code className={styles.sktExample}>ś</code>).
                  You can also paste text that already contains IAST diacritics — it will be kept as-is.
                </p>

                <h4 className={styles.subSectionTitle}>Vowels</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>a</code></td><td className={styles.sktExample}>a</td>
                      <td><code className={styles.op}>A</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>aa</code></td><td className={styles.sktExample}>ā</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>i</code></td><td className={styles.sktExample}>i</td>
                      <td><code className={styles.op}>I</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>ii</code></td><td className={styles.sktExample}>ī</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>u</code></td><td className={styles.sktExample}>u</td>
                      <td><code className={styles.op}>U</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>uu</code></td><td className={styles.sktExample}>ū</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>R</code></td><td className={styles.sktExample}>ṛ</td>
                      <td><code className={styles.op}>RR</code></td><td className={styles.sktExample}>ṝ</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>lR</code></td><td className={styles.sktExample}>ḷ</td>
                      <td><code className={styles.op}>lRR</code></td><td className={styles.sktExample}>ḹ</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Consonants</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th></th><th>un&shy;voiced</th><th>unvcd. asp.</th><th>voiced</th><th>voiced asp.</th><th>nasal</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><em>Gutturals</em></td>
                      <td><code className={styles.op}>ka</code> <span className={styles.sktExample}>ka</span></td>
                      <td><code className={styles.op}>kha</code> <span className={styles.sktExample}>kha</span></td>
                      <td><code className={styles.op}>ga</code> <span className={styles.sktExample}>ga</span></td>
                      <td><code className={styles.op}>gha</code> <span className={styles.sktExample}>gha</span></td>
                      <td><code className={styles.op}>Ga</code> <span className={styles.sktExample}>ṅa</span></td>
                    </tr>
                    <tr>
                      <td><em>Palatals</em></td>
                      <td><code className={styles.op}>ca</code> <span className={styles.sktExample}>ca</span></td>
                      <td><code className={styles.op}>cha</code> <span className={styles.sktExample}>cha</span></td>
                      <td><code className={styles.op}>ja</code> <span className={styles.sktExample}>ja</span></td>
                      <td><code className={styles.op}>jha</code> <span className={styles.sktExample}>jha</span></td>
                      <td><code className={styles.op}>Ja</code> <span className={styles.sktExample}>ña</span></td>
                    </tr>
                    <tr>
                      <td><em>Retroflexes</em></td>
                      <td><code className={styles.op}>Ta</code> <span className={styles.sktExample}>ṭa</span></td>
                      <td><code className={styles.op}>Tha</code> <span className={styles.sktExample}>ṭha</span></td>
                      <td><code className={styles.op}>Da</code> <span className={styles.sktExample}>ḍa</span></td>
                      <td><code className={styles.op}>Dha</code> <span className={styles.sktExample}>ḍha</span></td>
                      <td><code className={styles.op}>Na</code> <span className={styles.sktExample}>ṇa</span></td>
                    </tr>
                    <tr>
                      <td><em>Dentals</em></td>
                      <td><code className={styles.op}>ta</code> <span className={styles.sktExample}>ta</span></td>
                      <td><code className={styles.op}>tha</code> <span className={styles.sktExample}>tha</span></td>
                      <td><code className={styles.op}>da</code> <span className={styles.sktExample}>da</span></td>
                      <td><code className={styles.op}>dha</code> <span className={styles.sktExample}>dha</span></td>
                      <td><code className={styles.op}>na</code> <span className={styles.sktExample}>na</span></td>
                    </tr>
                    <tr>
                      <td><em>Labials</em></td>
                      <td><code className={styles.op}>pa</code> <span className={styles.sktExample}>pa</span></td>
                      <td><code className={styles.op}>pha</code> <span className={styles.sktExample}>pha</span></td>
                      <td><code className={styles.op}>ba</code> <span className={styles.sktExample}>ba</span></td>
                      <td><code className={styles.op}>bha</code> <span className={styles.sktExample}>bha</span></td>
                      <td><code className={styles.op}>ma</code> <span className={styles.sktExample}>ma</span></td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Semivowels, Sibilants &amp; Special</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>ya</code></td><td className={styles.sktExample}>ya</td>
                      <td><code className={styles.op}>ra</code></td><td className={styles.sktExample}>ra</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>la</code></td><td className={styles.sktExample}>la</td>
                      <td><code className={styles.op}>va</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>wa</code></td><td className={styles.sktExample}>va</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>za</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>sha</code></td><td className={styles.sktExample}>śa</td>
                      <td><code className={styles.op}>Sa</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>Sha</code></td><td className={styles.sktExample}>ṣa</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>sa</code></td><td className={styles.sktExample}>sa</td>
                      <td><code className={styles.op}>ha</code></td><td className={styles.sktExample}>ha</td>
                    </tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Anusvāra, Visarga &amp; Nasals</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><code className={styles.op}>M</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>.m</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>.n</code></td><td className={styles.sktExample}>ṃ</td><td>anusvāra</td></tr>
                    <tr><td><code className={styles.op}>H</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>.h</code></td><td className={styles.sktExample}>ḥ</td><td>visarga</td></tr>
                    <tr><td><code className={styles.op}>G</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>~N</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>N^</code></td><td className={styles.sktExample}>ṅ</td><td>velar nasal</td></tr>
                    <tr><td><code className={styles.op}>J</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>~n</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>JN</code></td><td className={styles.sktExample}>ñ</td><td>palatal nasal</td></tr>
                  </tbody>
                </table>

                <h4 className={styles.subSectionTitle}>Examples</h4>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Type</th><th>Re&shy;sult</th><th>Type</th><th>Re&shy;sult</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code className={styles.op}>tRSNA</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>tRSh~Naa</code></td><td className={styles.sktExample}>tṛṣṇā</td>
                      <td><code className={styles.op}>shAstra</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>zaastra</code></td><td className={styles.sktExample}>śāstra</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>saMskRta</code></td><td className={styles.sktExample}>saṃskṛta</td>
                      <td><code className={styles.op}>prajJA</code> <span className={styles.altLabel}>or</span> <code className={styles.op}>praj~nA</code></td><td className={styles.sktExample}>prajñā</td>
                    </tr>
                  </tbody>
                </table>

                <p className={styles.note}>
                  <strong>Note:</strong> You can also paste text that already contains IAST diacritics directly into the search field.
                </p>
              </section>

              {/* ── Term Search ── */}
              <section>
                <h3 className={styles.sectionTitle}>Term Search</h3>
                <p className={styles.intro}>
                  The term search searches inside the dictionary headwords. In addition to typing the term that you are looking for, two wildcard characters are supported in this search mode: <code className={styles.example}>*</code> and <code className={styles.example}>?</code>
                </p>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ope&shy;rator</th>
                      <th>Mea&shy;ning</th>
                      <th>Exam&shy;ple</th>
                      <th>Mat&shy;ches</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td rowSpan={2}><code className={styles.op}>*</code></td>
                      <td rowSpan={2}>Any number of characters, syllables, or words (including zero)</td>
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
              <p className={styles.note}>
                <strong>Note:</strong> The search internally works with Wylie transliteration. If you type incomplete syllables in Tibetan script, then vowels will be added automatically. For example, if you search for <code className={styles.op}>ས*</code> then this will trigger a search for <code className={styles.example}>sa*</code>.
              </p>

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
                      <th>Ope&shy;rator</th>
                      <th>Mea&shy;ning</th>
                      <th>Exam&shy;ple</th>
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
                      <td rowSpan={2}>Suffix wildcard – matches zero or more characters at the end of a word. <code className={styles.op}>~</code> may only be placed at the <em>end</em> of a word (e.g. <code className={styles.example}>buddh~</code> / <code className={`${styles.example} ${styles.tibExample} tib`}>སངས་རྒྱ~</code>), not in the middle or at the start.</td>
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
                  <strong>Note: </strong> 
                  The search initernally works with Wylie transliteration. If you type incomplete syllables in Tibetan script, then vowels will be added automatically. For example, if you search for <code className={styles.op}>ས~</code> then this will trigger a search for <code className={styles.example}>sa~</code>.
                </p>  

              </section>

              {/* ── Keyboard Navigation ── */}
              <section>
                <h3 className={styles.sectionTitle}>Keyboard Navigation</h3>
                <p className={styles.intro}>
                  There is a simple keyboard navigation mode that allows you to search and look at different Re&shy;sults
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
                      <td><code className={styles.op}><ArrowUpIcon className={styles.keyIcon} /></code> / <code className={styles.op}><ArrowDownIcon className={styles.keyIcon} /></code></td>
                      <td>Move one position up / down in the Re&shy;sult list</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>Shift + <ArrowUpIcon className={styles.keyIcon} /></code> / <code className={styles.op}>Shift + <ArrowDownIcon className={styles.keyIcon} /></code></td>
                      <td>Move one page up / down in the Re&shy;sult list</td>
                    </tr>
                    <tr>
                      <td><code className={styles.op}>Page Up</code> / <code className={styles.op}>Page Down</code></td>
                      <td>Scroll up / down inside the definition (if the definition is longer than the visible area.)</td>
                    </tr>
                  </tbody>
                </table>
                <p className={styles.note}>
                  <strong>Note:</strong> These keys only change the selected term in the Re&shy;sult list.
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
