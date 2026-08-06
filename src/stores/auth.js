import { defineStore } from 'pinia'
import { authService } from '@/services/authService'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    user: null,
  }),

  getters: {
    isAuthenticated: state => !!state.accessToken,
    authorities: state => state.user?.authorities || [],
    isAdmin: state => state.user?.authorities?.includes('Administrateur') || false,
  },

  actions: {
    async login(emailUtilisateur, motDePasse) {
      const { data } = await authService.login(emailUtilisateur, motDePasse)

      this.setTokens(data.accessToken, data.refreshToken)
      await this.fetchConnectedUser()

      return data
    },

    async fetchConnectedUser() {
      const { data } = await authService.getConnectedUserData()

      this.user = data

      return data
    },

    setTokens(accessToken, refreshToken) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
    },

    logout() {
      this.accessToken = null
      this.refreshToken = null
      this.user = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
  },
})