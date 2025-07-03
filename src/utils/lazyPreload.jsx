import { lazy } from 'react'

// Error Fallback Component
const ErrorFallback = () => (
  <div style={{ 
    padding: '20px', 
    textAlign: 'center', 
    color: '#666',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  }}>
    Failed to load component
  </div>
)

/**
 * Enhanced lazy loading dengan preloading capability
 * Ini memungkinkan kita preload components sebelum user navigate
 */
export function lazyPreload(importFunc) {
  const Component = lazy(() => {
    return importFunc().catch(error => {
      console.warn('Failed to load component:', error)
      // Return fallback component jika import gagal
      return { default: ErrorFallback }
    })
  })
  
  // Tambahkan method preload ke component
  Component.preload = () => {
    return importFunc().catch(error => {
      console.warn('Failed to preload component:', error)
      return null
    })
  }
  
  return Component
}

/**
 * Preload multiple components sekaligus
 * Berguna untuk preload components yang kemungkinan akan diakses user
 */
export function preloadComponents(components) {
  return Promise.all(
    components.map(component => {
      if (component.preload) {
        return component.preload()
      }
      return Promise.resolve()
    })
  )
}

/**
 * Hook untuk preload components berdasarkan user behavior
 */
export function usePreloader() {
  const preloadOnHover = (component) => {
    return () => {
      if (component && component.preload) {
        component.preload()
      }
    }
  }

  const preloadOnFocus = (component) => {
    return () => {
      if (component && component.preload) {
        component.preload()
      }
    }
  }

  const preloadWithDelay = (component, delay = 2000) => {
    setTimeout(() => {
      if (component && component.preload) {
        component.preload()
      }
    }, delay)
  }

  return {
    preloadOnHover,
    preloadOnFocus,
    preloadWithDelay
  }
}

/**
 * Preload strategy berdasarkan network connection
 */
export function smartPreload(components) {
  // Check network connection
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

  // Jika koneksi lambat, jangan preload
  if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    return Promise.resolve()
  }

  // Jika user dalam mode save data, jangan preload
  if (connection && connection.saveData) {
    return Promise.resolve()
  }

  // Preload dengan delay untuk tidak mengganggu initial load
  return new Promise((resolve) => {
    setTimeout(() => {
      preloadComponents(components).then(resolve)
    }, 1000)
  })
}