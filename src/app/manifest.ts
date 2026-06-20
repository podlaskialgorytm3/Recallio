import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Recallio',
    short_name: 'Recallio',
    description: 'Inteligentne narzędzie edukacyjne oparte o AI',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#8b5cf6', // var(--accent-primary) w przybliżeniu
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
