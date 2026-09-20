import { NextResponse } from 'next/server';

/**
 * Stand-in imagery for demo mode.
 *
 * Real deployments store photos in Notion and never hit this route, but the
 * gallery, reports and job pages all need something to render before the first
 * real upload — and a generated SVG keeps the repo free of binary fixtures.
 */

const TONES: Record<string, [string, string]> = {
  rust: ['#4a2418', '#a6521f'],
  amber: ['#43310c', '#d79a22'],
  slate: ['#1a2432', '#3d5573'],
  blue: ['#12273f', '#2f6fa8'],
  green: ['#12321f', '#2f8a52'],
  thermal: ['#2a0a3d', '#ff6a2b'],
  upload: ['#1b2433', '#4a6690'],
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const label = url.searchParams.get('label') ?? 'Job photo';
  const tone = url.searchParams.get('tone') ?? 'slate';
  const [dark, light] = TONES[tone] ?? TONES.slate;

  const lines = wrap(label, 26).slice(0, 2);
  const text = lines
    .map((line, i) => `<tspan x="400" dy="${i === 0 ? 0 : 32}">${escapeXml(line)}</tspan>`)
    .join('');

  // Text sits at the top: the gallery draws its own caption across the bottom.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${escapeXml(label)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${dark}"/>
      <stop offset="100%" stop-color="${light}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <rect width="800" height="600" fill="url(#grid)"/>
  <text x="400" y="72" font-family="ui-sans-serif,system-ui,sans-serif" font-size="30" font-weight="600"
        fill="rgba(255,255,255,0.95)" text-anchor="middle">${text}</text>
  <text x="400" y="140" font-family="ui-monospace,monospace" font-size="15" letter-spacing="2"
        fill="rgba(255,255,255,0.45)" text-anchor="middle">VOLTFLOW SAMPLE IMAGE</text>
  <g fill="none" stroke="rgba(255,255,255,0.32)" stroke-width="3">
    <rect x="300" y="215" width="200" height="230" rx="8"/>
    <path d="M336 258h128M336 298h128M336 338h128M336 378h128"/>
    <circle cx="400" cy="470" r="6"/>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > width) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);
}
