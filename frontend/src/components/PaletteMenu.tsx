import { useEffect, useId, useRef, useState } from 'react';
import { Palette } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import './palette-menu.css';

/** Shared, keyboard accessible palette control for public and private layouts. */
export function PaletteMenu() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <div ref={container} className="palette-menu" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="palette-trigger" aria-label="Choose colour palette" title="Choose colour palette" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}><Palette size={20} aria-hidden="true"/></button>
    {open && <div id={id} role="region" aria-label="Colour palettes" className="palette-options"><ThemeSwitcher/></div>}
  </div>;
}

export function WorkspaceAppearance() {
  return <div className="workspace-appearance"><a href="/" className="workspace-home">Aintrix <span>Academy</span></a><PaletteMenu/></div>;
}
