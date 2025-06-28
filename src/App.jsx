import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PrinterProvider } from './contexts/PrinterContext'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Pages
import Login from './pages/Login'
import POS from './pages/POS'
import Products from './pages/Products'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Statistics from './pages/Statistics'
import Employees from './pages/Employees'
import Settings from './pages/Settings'


function App() {
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
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/pos" element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            } />
            
            <Route path="/products" element={
              <ProtectedRoute requireOwner>
                <Products />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute requireOwner>
                <Dashboard />
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

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/pos" replace />} />
          </Routes>
        </PrinterProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
