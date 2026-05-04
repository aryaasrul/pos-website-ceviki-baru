import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ProtectedRoute({ children, requireOwner = false }) {
  const { isAuthenticated, isOwner, loading } = useAuth()

  if (loading) return <LoadingSpinner fullScreen message="Memuat..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requireOwner && !isOwner) return <Navigate to="/pos" replace />

  return children
}
