import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MindDump',
    short_name: 'MindDump',
    description: "A calm place to dump what's in your head.",
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#13111C',
    theme_color: '#eabc70',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/api/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
