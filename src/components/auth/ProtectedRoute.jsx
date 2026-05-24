import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

const REDIRECT_GRACE_PERIOD = 3000 // 3 detik grace sebelum redirect

export default function ProtectedRoute({ children, requireOwner = false }) {
  const { isAuthenticated, isOwner, loading } = useAuth()
  const [redirect, setRedirect] = useState(null) // null = belum, 'login' atau 'pos'
  const [showRedirectMsg, setShowRedirectMsg] = useState(false)

  useEffect(() => {
    if (loading) return // masih loading

    if (!isAuthenticated) {
      // Grace period sebelum redirect
      const timer = setTimeout(() => {
        setRedirect('login')
        setShowRedirectMsg(true)
      }, REDIRECT_GRACE_PERIOD)
      return () => clearTimeout(timer)
    }

    if (requireOwner && !isOwner) {
      const timer = setTimeout(() => {
        setRedirect('pos')
      }, REDIRECT_GRACE_PERIOD)
      return () => clearTimeout(timer)
    }

    // Semua kondisi terpenuhi — reset
    setRedirect(null)
    setShowRedirectMsg(false)
  }, [loading, isAuthenticated, isOwner, requireOwner])

  if (loading) return <LoadingSpinner fullScreen message="Memuat..." />

  if (redirect === 'login') return <Navigate to="/login" replace />
  if (redirect === 'pos') return <Navigate to="/pos" replace />

  // Transient session loss — tampilkan pesan sambil menunggu recovery
  if (showRedirectMsg) {
    return <LoadingSpinner fullScreen message="Session terputus, mencoba koneksi kembali..." />
  }

  return children
}