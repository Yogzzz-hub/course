import { Link } from 'react-router-dom';
import { LogoMark } from '../../components/LogoMark';
import { PaletteMenu } from '../../components/PaletteMenu';
import { academy } from '../../config/academy';

/** Top bar for the standalone auth screens: the brand on the left, the colour-palette icon on the right. */
export function AuthBar() {
  const name = academy.name.replace(/\s+(Technical\s+)?Academy$/i, '');
  return (
    <header className="su-bar">
      <Link to="/" className="su-brand" aria-label={`${academy.name} home`}>
        <LogoMark size={40} surface="dark" />
        <span className="su-brand-text">
          <strong>{name} <span>Academy</span></strong>
          <small>{academy.tagline}</small>
        </span>
      </Link>
      <PaletteMenu />
    </header>
  );
}
