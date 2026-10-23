import type { MetadataRoute } from 'next';

/**
 * Makes the field desk installable. On iOS, Share → Add to Home Screen gives a
 * full-screen app with the TE mark and no Safari chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tarango Electric — field desk',
    short_name: 'Tarango',
    description: 'New call, advance the ticket, closeout. We Show Up. We Do It Right. We Charge Fair.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0C0C0C',
    theme_color: '#0C0C0C',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New call', short_name: 'New call', url: '/new-call' },
      { name: 'Jobs', short_name: 'Jobs', url: '/jobs' },
      { name: 'Rate book', short_name: 'Rates', url: '/rates' },
    ],
  };
}
