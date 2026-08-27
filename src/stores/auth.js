import { defineStore } from 'pinia'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'   // ⬅️ Importer userService

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

    // ⬇️ NOUVELLES ACTIONS POUR LE PROFIL

    // Mettre à jour mon profil
    async updateProfile(profileData) {
      try {
        const response = await userService.updateProfile(profileData)
        // Mettre à jour l'utilisateur dans le store
        if (response.data?.user) {
          this.user = response.data.user
        } else if (response.data) {
          // Si la réponse est directement l'utilisateur
          this.user = response.data
        }
        return response.data
      } catch (error) {
        throw error
      }
    },

    // Uploader ma photo de profil
    async uploadProfilePhoto(formData) {
      try {
        const response = await userService.uploadPhoto(formData)
        // Mettre à jour la photo dans le store
        if (response.data?.photoUtilisateur) {
          this.user.photoUtilisateur = response.data.photoUtilisateur
        }
        return response.data
      } catch (error) {
        throw error
      }
    },

    // Changer le mot de passe
    async changePassword(passwordData) {
      try {
        const response = await userService.changePassword(passwordData)
        return response.data
      } catch (error) {
        throw error
      }
    }
  },
})