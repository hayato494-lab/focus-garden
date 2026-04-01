import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/focus-garden/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Focus Garden – 集中タイマー＆庭園育成',
        short_name: 'Focus Garden',
        description: '集中して、庭を育てよう。ポモドーロタイマー×庭園育成×BGM×統計',
        theme_color: '#0c1222',
        background_color: '#0c1222',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/focus-garden/',
        scope: '/focus-garden/',
        icons: [
          { src: '/focus-garden/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/focus-garden/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/focus-garden/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
})
