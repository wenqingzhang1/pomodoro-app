import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'

const sharedElectronBuild = {
  outDir: 'dist-electron',
  rollupOptions: {
    external: ['electron'],
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: { build: sharedElectronBuild },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload()
        },
        vite: { build: sharedElectronBuild },
      },
    ]),
  ],
  clearScreen: false,
  build: {
    outDir: 'dist',
  },
})
