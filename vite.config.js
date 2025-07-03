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
          // Pisahkan vendor chunks untuk caching yang lebih baik
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-hot-toast'],
          'chart-vendor': ['recharts', 'chart.js', 'react-chartjs-2'],
          'supabase': ['@supabase/supabase-js'],
        }
      }
    },
    
    // Tingkatkan chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps untuk debugging production (optional)
    sourcemap: false,
    
    // Optimize untuk production
    minify: 'esbuild',
    target: 'es2015'
  },

  // Optimasi dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hot-toast',
      '@supabase/supabase-js'
    ],
    exclude: [
      // Exclude heavy dependencies yang tidak perlu di-optimize
      'recharts',
      'chart.js'
    ]
  },

  // Server configuration untuk development
  server: {
    port: 3000,
    open: false, // Jangan auto-open browser
    cors: true
  },

  // Preview server untuk testing production build
  preview: {
    port: 4173,
    open: false
  }
})