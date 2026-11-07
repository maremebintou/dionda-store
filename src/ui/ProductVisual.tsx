import { useId, useState, type ReactNode } from 'react';
import type { ProductVisual as PV, VisualMotif } from '../types';

const MOTIFS: Record<VisualMotif, (ink: string, light: string) => ReactNode> = {
  grain: (ink, light) => (
    <g>
      {[
        [0, 0, -20], [34, -14, 25], [-34, -10, -40], [16, 30, 10], [-18, 34, 35], [50, 24, -15], [-52, 26, 20], [0, -40, 5],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={200 + x} cy={205 + y} rx="13" ry="20" transform={`rotate(${r} ${200 + x} ${205 + y})`} fill={i % 2 ? ink : light} stroke={ink} strokeWidth="3" />
      ))}
    </g>
  ),
  goutte: (ink, light) => (
    <g>
      <path d="M200 110 C 240 170 262 205 262 238 a62 62 0 0 1 -124 0 C 138 205 160 170 200 110z" fill={ink} />
      <path d="M176 226 a30 30 0 0 0 22 38" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" />
    </g>
  ),
  feuille: (ink, light) => (
    <g>
      <path d="M128 280 C 128 170 200 120 282 118 C 282 210 230 282 128 280z" fill={ink} />
      <path d="M140 268 C 180 220 220 180 262 138" fill="none" stroke={light} strokeWidth="5" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${172 + i * 22} ${236 - i * 24} l ${14} ${18}`} stroke={light} strokeWidth="4" strokeLinecap="round" />
      ))}
    </g>
  ),
  pot: (ink, light) => (
    <g>
      <rect x="160" y="120" width="80" height="22" rx="6" fill={ink} />
      <path d="M150 150 h100 c12 0 18 10 18 22 v84 c0 22 -14 34 -34 34 h-68 c-20 0 -34 -12 -34 -34 v-84 c0 -12 6 -22 18 -22z" fill={ink} />
      <rect x="160" y="190" width="80" height="44" rx="4" fill={light} />
      <path d="M172 212 h56" stroke={ink} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),
  poisson: (ink, light) => (
    <g>
      <path d="M110 205 C 150 150 240 150 278 205 C 240 260 150 260 110 205z" fill={ink} />
      <path d="M278 205 l40 -34 v68z" fill={ink} />
      <circle cx="148" cy="196" r="7" fill={light} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${185 + i * 26} 180 q 10 25 0 50`} fill="none" stroke={light} strokeWidth="4" strokeLinecap="round" />
      ))}
    </g>
  ),
  fleur: (ink, light) => (
    <g>
      {[0, 72, 144, 216, 288].map((r) => (
        <ellipse key={r} cx="200" cy="158" rx="34" ry="52" fill={ink} transform={`rotate(${r} 200 205)`} />
      ))}
      <circle cx="200" cy="205" r="20" fill={light} />
      <circle cx="200" cy="205" r="8" fill={ink} />
    </g>
  ),
  racine: (ink) => (
    <g fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round">
      <path d="M200 110 v40" />
      {[-48, -24, 0, 24, 48].map((dx, i) => (
        <path key={i} d={`M200 150 C ${200 + dx} 190 ${200 - dx / 2} 230 ${200 + dx * 1.3} ${290 - (i % 2) * 14}`} />
      ))}
      <path d="M176 150 h48" strokeWidth="10" />
    </g>
  ),
  tissage: (ink, light) => (
    <g>
      <rect x="120" y="125" width="160" height="160" rx="10" fill={ink} />
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => (r + c) % 2 === 0 && <rect key={`${r}${c}`} x={132 + c * 36} y={137 + r * 36} width="28" height="28" rx="3" fill={light} />),
      )}
    </g>
  ),
  coquillage: (ink, light) => (
    <g>
      <path d="M120 250 C 120 160 280 160 280 250 z" fill={ink} />
      {[-60, -30, 0, 30, 60].map((dx) => (
        <path key={dx} d={`M200 250 L ${200 + dx * 1.2} ${178 + Math.abs(dx) * 0.5}`} stroke={light} strokeWidth="5" strokeLinecap="round" />
      ))}
      <rect x="180" y="250" width="40" height="22" rx="6" fill={ink} />
    </g>
  ),
  coffret: (ink, light) => (
    <g>
      <rect x="120" y="170" width="160" height="110" rx="8" fill={ink} />
      <rect x="110" y="145" width="180" height="34" rx="6" fill={ink} />
      <rect x="192" y="145" width="16" height="135" fill={light} />
      <path d="M200 145 c -30 -36 -62 -14 -40 0z M200 145 c 30 -36 62 -14 40 0z" fill={light} />
    </g>
  ),
};

/** "fonio.jpg" -> "photos/fonio.jpg" ; les URL et chemins explicites sont conservés. */
export function resolvePhoto(photo: string): string {
  // Version hébergée en un seul fichier : photos intégrées (data URI) déclarées par la page.
  const inlined = (globalThis as { __DIONDA_PHOTOS__?: Record<string, string> }).__DIONDA_PHOTOS__?.[photo];
  if (inlined) return inlined;
  return /^(https?:|data:|blob:|\/|\.)/.test(photo) || photo.includes('/') ? photo : `photos/${photo}`;
}

/**
 * Visuel produit : la photo si elle existe, sinon l'illustration générée
 * (motif inspiré des tissages et du bogolan). La photo n'apparaît qu'une fois chargée :
 * pas d'image cassée si le fichier manque.
 */
export function ProductVisual({ visual, label, className }: { visual: PV; label?: string; className?: string }) {
  const [state, setState] = useState<{ src: string; ok: boolean } | null>(null);
  const photo = visual.photo?.trim();
  if (!photo) return <Illustration visual={visual} label={label} className={className} />;
  const src = resolvePhoto(photo);
  const loaded = state?.src === src && state.ok;
  return (
    <span className={`pv-wrap ${className ?? ''}`}>
      <Illustration visual={visual} label={loaded ? undefined : label} />
      <img
        key={src}
        src={src}
        alt={label ?? ''}
        aria-hidden={label ? undefined : true}
        loading="lazy"
        className={`product-photo ${loaded ? 'is-loaded' : ''}`}
        onLoad={() => setState({ src, ok: true })}
        onError={() => setState({ src, ok: false })}
      />
    </span>
  );
}

function Illustration({ visual, label, className }: { visual: PV; label?: string; className?: string }) {
  const id = `pv${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const h = visual.hue;
  const bg1 = `hsl(${h} 42% 90%)`;
  const bg2 = `hsl(${h} 38% 79%)`;
  const ink = `hsl(${h} 46% 27%)`;
  const light = `hsl(${h} 50% 92%)`;
  const motif = MOTIFS[visual.motif] ?? MOTIFS.grain;
  return (
    <svg viewBox="0 0 400 400" className={`product-visual ${className ?? ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={bg1} />
          <stop offset="1" stopColor={bg2} />
        </linearGradient>
        <pattern id={`${id}p`} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 20 L10 10 L20 20 L30 10 L40 20" fill="none" stroke={ink} strokeWidth="1.6" opacity=".16" />
          <circle cx="20" cy="33" r="2.2" fill={ink} opacity=".14" />
        </pattern>
      </defs>
      <rect width="400" height="400" fill={`url(#${id}g)`} />
      <rect width="400" height="400" fill={`url(#${id}p)`} />
      <circle cx="200" cy="205" r="122" fill={light} opacity=".55" />
      <circle cx="200" cy="205" r="122" fill="none" stroke={ink} strokeWidth="2" strokeDasharray="2 9" opacity=".5" />
      {motif(ink, light)}
    </svg>
  );
}
