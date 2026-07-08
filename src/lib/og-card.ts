/**
 * Build-time OG share cards (1200x630) in the plate aesthetic: ink ground,
 * double hairline frame, mono eyebrow, Fraunces title, a glyph ornament.
 * Raw SVG rendered to PNG with resvg — no satori, no HTML emulation, and
 * the result matches the site because it uses the same tokens and glyphs.
 */
import { Resvg } from '@resvg/resvg-js';
import path from 'node:path';

// Palette tokens mirrored from src/styles/global.css (:root).
const INK = '#0a0c0f';
const HAIR = '#262b35';
const HAIR_BRIGHT = '#39414f';
const SILVER = '#d6dbe1';
const MID = '#7d8593';
const SIGNAL = '#d2823e';

const FONTS = [
  path.resolve('node_modules/@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf'),
  path.resolve('node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
];

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Greedy word-wrap tuned to Fraunces at the chosen size. */
function wrapTitle(title: string): { lines: string[]; size: number } {
  const fit = (perLine: number) => {
    const lines: string[] = [];
    let line = '';
    for (const word of title.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > perLine && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  let size = 76;
  let lines = fit(26);
  if (lines.length > 2) {
    size = 60;
    lines = fit(34);
  }
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
    lines[2] = lines[2].replace(/\s*\S*$/, ' …');
  }
  return { lines, size };
}

/** The Glyph.astro ornaments, redrawn from the same data (46x24 box). */
function glyphSvg(name: string): string {
  switch (name) {
    case 'waveform': {
      const hs = [3, 5, 7, 4, 9, 11, 8, 12, 6, 10, 7, 5, 9, 4, 6, 3];
      const bars = hs
        .map((v, i) => `<line x1="${2 + i * 2.8}" y1="${12 - v}" x2="${2 + i * 2.8}" y2="${12 + v}"/>`)
        .join('');
      return `<line x1="1" y1="12" x2="45" y2="12" stroke-width="0.4" opacity="0.5"/>${bars}`;
    }
    case 'spectrum': {
      const hs = [6, 10, 8, 14, 11, 17, 13, 9, 15, 7, 12, 5];
      const bars = hs
        .map((v, i) => `<line x1="${3 + i * 3.6}" y1="22" x2="${3 + i * 3.6}" y2="${22 - v}" stroke-width="2"/>`)
        .join('');
      return `<line x1="1" y1="22" x2="45" y2="22" stroke-width="0.4" opacity="0.5"/>${bars}`;
    }
    case 'contour':
      return `<path d="M23 4c8 0 14 4 14 8s-6 8-14 8-14-4-14-8 6-8 14-8z"/>
        <path d="M23 7c5 0 9 2.5 9 5s-4 5-9 5-9-2.5-9-5 4-5 9-5z"/>
        <path d="M23 10c2.6 0 4.5 1 4.5 2s-1.9 2-4.5 2-4.5-1-4.5-2 1.9-2 4.5-2z"/>`;
    case 'polar':
      return `<path d="M3 21a20 20 0 0 1 40 0"/>
        <path d="M9 21a14 14 0 0 1 28 0" opacity="0.7"/>
        <path d="M15 21a8 8 0 0 1 16 0" opacity="0.5"/>
        <line x1="23" y1="21" x2="23" y2="1" stroke-width="0.5"/>
        <line x1="23" y1="21" x2="6" y2="11" stroke-width="0.5"/>
        <line x1="23" y1="21" x2="40" y2="11" stroke-width="0.5"/>
        <path d="M23 21c-7-3-9-9-6-13 4 5 9 4 12 0 3 4 1 10-6 13z" fill="${MID}" opacity="0.18" stroke="none"/>`;
    case 'phases':
      return `<circle cx="6" cy="12" r="4" opacity="0.5"/>
        <path d="M16 8a4 4 0 0 1 0 8z" fill="${MID}" stroke="none"/>
        <circle cx="16" cy="12" r="4"/>
        <circle cx="26" cy="12" r="4" fill="${MID}" stroke="none"/>
        <path d="M36 8a4 4 0 0 0 0 8z" fill="${MID}" stroke="none"/>
        <circle cx="36" cy="12" r="4"/>`;
    default:
      return '';
  }
}

export interface OgCard {
  eyebrow: string;
  title: string;
  footerRight: string;
  glyph: string;
}

export function renderOgPng({ eyebrow, title, footerRight, glyph }: OgCard): Buffer {
  const { lines, size } = wrapTitle(title);
  const lineHeight = Math.round(size * 1.14);
  // Vertically center the title block between the eyebrow rule and footer rule.
  const blockTop = 342 - Math.round(((lines.length - 1) * lineHeight) / 2);
  const titleText = lines
    .map((l, i) => `<tspan x="84" y="${blockTop + i * lineHeight}">${esc(l)}</tspan>`)
    .join('');

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="20.5" y="20.5" width="1159" height="589" fill="none" stroke="${HAIR}" stroke-width="1"/>
  <rect x="28.5" y="28.5" width="1143" height="573" fill="none" stroke="${HAIR}" stroke-width="0.5" opacity="0.6"/>
  <g transform="translate(880, 92) scale(5.2)" stroke="${MID}" stroke-width="0.55" fill="none" stroke-linecap="round">
    ${glyphSvg(glyph)}
  </g>
  <text x="84" y="152" font-family="JetBrains Mono" font-size="26" letter-spacing="4" fill="${SIGNAL}">${esc(eyebrow.toUpperCase())}</text>
  <line x1="84" y1="180" x2="330" y2="180" stroke="${HAIR_BRIGHT}" stroke-width="1"/>
  <text font-family="Fraunces SemiBold, Fraunces" font-size="${size}" fill="${SILVER}">${titleText}</text>
  <line x1="84" y1="524" x2="1116" y2="524" stroke="${HAIR}" stroke-width="1"/>
  <text x="84" y="566" font-family="JetBrains Mono" font-size="23" letter-spacing="3" fill="${MID}">DRISHAN.COM</text>
  <text x="1116" y="566" text-anchor="end" font-family="JetBrains Mono" font-size="23" letter-spacing="3" fill="${MID}">${esc(footerRight.toUpperCase())}</text>
</svg>`;

  const resvg = new Resvg(svg, {
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Fraunces SemiBold' },
  });
  return Buffer.from(resvg.render().asPng());
}
