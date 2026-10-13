import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  // dev lokal: kalau .env.local belum dibuat, pakai koneksi Supabase dari SEMAR di folder sebelah
  // (file env tidak pernah ikut ke git; build produksi memakai Variables di GitHub Actions)
  const here = import.meta.dirname
  const semarApp = resolve(here, '../erp-restoran/app')
  const useSemarEnv = command === 'serve' && !existsSync(resolve(here, '.env.local')) && existsSync(resolve(semarApp, '.env.local'))

  return {
    plugins: [react()],
    envDir: useSemarEnv ? semarApp : here,
    // GitHub Pages melayani aplikasi di /<nama-repo>/ ; diisi oleh workflow deploy
    base: process.env.BASE_PATH ?? '/',
  }
})
