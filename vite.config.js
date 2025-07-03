import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Optimasi untuk production build
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          // Chart libraries (heavy)
          'charts': ['recharts', 'chart.js', 'react-chartjs-2'],
          // Supabase
          'supabase': ['@supabase/supabase-js'],
          // UI Components
          'ui-libs': ['react-hot-toast'],
        }
      }
    },
    
    // Tingkatkan chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Optimize untuk production
    minify: 'esbuild',
    target: 'es2015',
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Sourcemap hanya untuk development
    sourcemap: false
  },

  // Optimasi dependencies
  optimizeDeps: {
    include: [
      // Core dependencies yang selalu dibutuhkan
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast',
      '@supabase/supabase-js'
    ]
  },

  // Server configuration untuk development
  server: {
    port: 3000,
    open: false,
    cors: true
  },

  // Preview server
  preview: {
    port: 4173,
    open: false
  }
})