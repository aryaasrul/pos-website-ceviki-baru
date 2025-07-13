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
      smartPreload([POS, Products]).then(() => {
        // Setelah POS & Products loaded, preload sisanya
        smartPreload([Dashboard, Reports, Statistics, Employees, Settings])
      })
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <Router>
      <AuthProvider>
        <PrinterProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/pos" element={
                <ProtectedRoute>
                  <POS />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requireOwner>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requireOwner>
                  <Products />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requireOwner>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/statistics" element={
                <ProtectedRoute requireOwner>
                  <Statistics />
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute requireOwner>
                  <Employees />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requireOwner>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/" element={<Navigate to="/pos" replace />} />
            </Routes>
          </Suspense>
          <Toaster />
        </PrinterProvider>
      </AuthProvider>
    </Router>
  )
}

export default App