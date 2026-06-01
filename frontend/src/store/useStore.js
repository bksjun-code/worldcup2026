import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../api'

const useStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      theme: 'dark',
      setTheme: (theme) => set({ theme }),

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        set({ user: res.data.user, token: res.data.access_token })
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
        return res.data.user
      },

      register: async (email, nickname, password) => {
        const res = await api.post('/auth/register', { email, nickname, password })
        set({ user: res.data.user, token: res.data.access_token })
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
        return res.data.user
      },

      logout: () => {
        set({ user: null, token: null })
        delete api.defaults.headers.common['Authorization']
      },

      refreshUser: async () => {
        try {
          const res = await api.get('/auth/me')
          set({ user: res.data })
        } catch {
          get().logout()
        }
      },

      initAuth: () => {
        const { token } = get()
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        }
      },
    }),
    { name: 'wc2026-auth', partialize: (s) => ({ token: s.token, user: s.user, theme: s.theme }) }
  )
)

export default useStore
