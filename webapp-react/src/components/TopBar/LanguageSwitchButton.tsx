/**
 * LanguageSwitchButton – toggles between Tibetan↔English input.
 *
 * Displays tib→en or en→tib icon depending on current language.
 */
import tibEnImg from '../../assets/images/tib-en.png';
import enTibImg from '../../assets/images/en-tib.png';

interface Props {
  inputLang: string;
  onSwitch: () => void;
}

export default function LanguageSwitchButton({ inputLang, onSwitch }: Props) {
  const isTibetan = inputLang === 'tib';

  return (
    <a
      href="#"
      className="switchBtn"
      title={isTibetan ? 'Switch to English → Tibetan' : 'Switch to Tibetan → English'}
      onClick={(e) => {
        e.preventDefault();
        onSwitch();
      }}
    >
      {isTibetan ? (
        <img src={tibEnImg} id="switchBtnTibEn" alt="Tibetan to English" width="23" height="43" />
      ) : (
        <img src={enTibImg} id="switchBtnEnTib" alt="English to Tibetan" width="23" height="43" />
      )}
    </a>
  );
}
