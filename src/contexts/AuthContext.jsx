import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/auth'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

const AUTH_CHECK_INTERVAL = 5 * 60 * 1000 // 5 menit

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const prevSessionRef = useRef(null) // track session before transient error

  useEffect(() => {
    let mounted = true
    let reloadTimer

    const initializeAuth = async () => {
      try {
        const data = await authService.getCurrentUser()
        if (!mounted) return
        if (data?.user && data?.employee) {
          setUser(data.user)
          setEmployee(data.employee)
          prevSessionRef.current = { user: data.user, employee: data.employee }
        } else {
          // Tidak ada session — normal kalau first visit
          setUser(null)
          setEmployee(null)
          prevSessionRef.current = null
        }
      } catch (err) {
        console.warn('Auth init error (non-critical):', err?.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Safety net in case Supabase hangs
    const timeoutId = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 5000)

    initializeAuth()

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      /**
       * SIGNED_OUT — hanya proses kalau benar-benar ada session expired
       * Jangan langsung reset user karena bisa transient error dari refresh token timeout
       */
      if (event === 'SIGNED_OUT') {
        // Cek apakah session benar-benar expired, bukan transient
        try {
          const currentSession = await authService.checkSessionExists()
          if (!mounted) return
          if (!currentSession) {
            setUser(null)
            setEmployee(null)
            prevSessionRef.current = null
          }
          // Kalau session masih ada, ini false positive — abaikan
        } catch {
          // Gagal cek session — restore dari cache kalau ada
          if (prevSessionRef.current && mounted) {
            console.warn('SIGNED_OUT detected but session check failed — restoring cached state')
            setUser(prevSessionRef.current.user)
            setEmployee(prevSessionRef.current.employee)
          } else {
            setUser(null)
            setEmployee(null)
          }
        }
        return
      }

      // INITIAL_SESSION dan SIGNED_IN: fetch user data
      if (!session) {
        // Session null tapi event bukan SIGNED_OUT — sesi memang tidak ada
        if (!prevSessionRef.current) {
          setUser(null)
          setEmployee(null)
        }
        return
      }

      if (['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED'].includes(event)) {
        try {
          const data = await authService.getCurrentUser()
          if (!mounted) return
          if (data?.user && data?.employee) {
            setUser(data.user)
            setEmployee(data.employee)
            prevSessionRef.current = { user: data.user, employee: data.employee }
          } else {
            // Data tidak ditemukan tapi ada session — jangan reset langsung
            // Bisa jadi race condition employee query gagal sementara
            if (!prevSessionRef.current) {
              setUser(null)
              setEmployee(null)
            }
            // Kalau sudah pernah login, cache masih valid — biarkan
          }
        } catch (err) {
          // Transient error — restore dari cache jika ada
          console.warn('Auth state change error (transient):', err?.message)
          if (prevSessionRef.current && mounted) {
            // Biarkan state seperti sebelumnya, jangan reset
          }
        }
      }
    })

    // Periodic session health check — detect silent logout
    const checkSession = async () => {
      if (!mounted || !prevSessionRef.current) return
      try {
        const data = await authService.getCurrentUser()
        if (!mounted) return
        if (!data?.user || !data?.employee) {
          // Session benar-benar hilang
          setUser(null)
          setEmployee(null)
          prevSessionRef.current = null
        } else {
          // Refresh cache
          prevSessionRef.current = { user: data.user, employee: data.employee }
        }
      } catch {
        // Network glitch — skip, coba lagi di interval berikutnya
      }
    }

    reloadTimer = setInterval(checkSession, AUTH_CHECK_INTERVAL)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      clearInterval(reloadTimer)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password)
      setUser(data.user)
      setEmployee(data.employee)
      prevSessionRef.current = { user: data.user, employee: data.employee }
      toast.success('Login berhasil')
      return data
    } catch (error) {
      toast.error(error.message || 'Login gagal')
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setEmployee(null)
      prevSessionRef.current = null
    }
  }, [])

  const value = {
    user,
    employee,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!employee,
    isOwner: employee?.role === 'owner',
    isKasir: employee?.role === 'kasir',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}