import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PrinterProvider } from './contexts/PrinterContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { lazyPreload, smartPreload } from './utils/lazyPreload.jsx'

// Import hanya Login langsung (karena ini first page)
import Login from './pages/Login'

// Lazy load dengan preload capability
const POS = lazyPreload(() => import('./pages/POS'))
const Products = lazyPreload(() => import('./pages/Products'))
const Dashboard = lazyPreload(() => import('./pages/Dashboard'))
const Reports = lazyPreload(() => import('./pages/Reports'))
const Statistics = lazyPreload(() => import('./pages/Statistics'))
const Employees = lazyPreload(() => import('./pages/Employees'))
const Settings = lazyPreload(() => import('./pages/Settings'))

// Loading component yang bagus
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Loading...</p>
    </div>
  </div>
)

function App() {
  // Preload strategy - load components yang kemungkinan besar akan diakses
  useEffect(() => {
    // Tunggu initial load selesai, baru preload
    const timer = setTimeout(() => {
      // POS adalah page utama, preload duluan
      smartPreload([POS, Dashboard])
        .then(() => {
          // Setelah POS & Dashboard loaded, preload yang lain
          return smartPreload([Products, Reports, Settings])
        })
        .catch(err => {
          console.log('Preload failed:', err)
          // Gagal preload tidak masalah, user masih bisa navigate normal
        })
    }, 2000) // Delay 2 detik setelah app load

    return () => clearTimeout(timer)
  }, [])

  return (
    <Router>
      <AuthProvider>
        <PrinterProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                style: {
                  background: 'green',
                },
              },
              error: {
                style: {
                  background: 'red',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes - No lazy loading untuk login */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes - Semua dengan lazy loading */}
            <Route path="/pos" element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <POS />
                </Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Products />
                </Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Reports />
                </Suspense>
              </ProtectedRoute>
            } />

            <Route path="/statistics" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Statistics />
                </Suspense>
              </ProtectedRoute>
            } />

            <Route path="/employees" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Employees />
                </Suspense>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute requireOwner>
                <Suspense fallback={<PageLoader />}>
                  <Settings />
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/pos" replace />} />
          </Routes>
        </PrinterProvider>
      </AuthProvider>
    </Router>
  )
}

export default App