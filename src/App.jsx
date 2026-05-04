import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PrinterProvider } from './contexts/PrinterContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { lazyPreload, smartPreload } from './utils/lazyPreload.jsx'
import { PageLoader } from './components/common/LoadingSpinner'
import Login from './pages/Login'

const POS = lazyPreload(() => import('./pages/POS'))
const Products = lazyPreload(() => import('./pages/Products'))
const Dashboard = lazyPreload(() => import('./pages/Dashboard'))
const Reports = lazyPreload(() => import('./pages/Reports'))
const Statistics = lazyPreload(() => import('./pages/Statistics'))
const Employees = lazyPreload(() => import('./pages/Employees'))
const Settings = lazyPreload(() => import('./pages/Settings'))
const Transactions = lazyPreload(() => import('./pages/Transactions'))

function App() {
  useEffect(() => {
    const timer = setTimeout(() => {
      smartPreload([POS, Products]).then(() => {
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
              <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute requireOwner><Dashboard /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute requireOwner><Products /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requireOwner><Reports /></ProtectedRoute>} />
              <Route path="/statistics" element={<ProtectedRoute requireOwner><Statistics /></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute requireOwner><Employees /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute requireOwner><Settings /></ProtectedRoute>} />
              <Route path="/transactions" element={<ProtectedRoute requireOwner><Transactions /></ProtectedRoute>} />
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
