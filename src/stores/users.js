import { defineStore } from 'pinia'
import { userService } from '@/services/userService'

export const useUsersStore = defineStore('users', {
  state: () => ({
    users: [],
    currentUser: null,
    loading: false,
    error: null,
  }),

  getters: {
    allUsers: (state) => state.users,
    getCurrentUser: (state) => state.currentUser,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
  },

  actions: {
    // Charger tous les utilisateurs
    async fetchUsers() {
      this.loading = true
      this.error = null
      try {
        const response = await userService.getUsers()
        this.users = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des utilisateurs'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un utilisateur par ID
    async fetchUserById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.getUserById(id)
        this.currentUser = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'utilisateur'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un utilisateur
    async createUser(userData) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.createUser(userData)
        const newUser = response.data
        this.users.push(newUser)
        return newUser
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de l\'utilisateur'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un utilisateur
    async updateUser(id, userData) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.updateUser(id, userData)
        const updatedUser = response.data
        const index = this.users.findIndex(u => u.utilisateurId === id)
        if (index !== -1) {
          this.users[index] = updatedUser
        }
        if (this.currentUser?.utilisateurId === id) {
          this.currentUser = updatedUser
        }
        return updatedUser
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de l\'utilisateur'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Désactiver un utilisateur
    async deactivateUser(id) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.deactivateUser(id)
        const updatedUser = response.data
        const index = this.users.findIndex(u => u.utilisateurId === id)
        if (index !== -1) {
          this.users[index] = updatedUser
        }
        return updatedUser
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la désactivation de l\'utilisateur'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un utilisateur
    async deleteUser(id) {
      this.loading = true
      this.error = null
      try {
        await userService.deleteUser(id)
        this.users = this.users.filter(u => u.utilisateurId !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour son profil
    async updateProfile(userData) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.updateProfile(userData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du profil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Uploader une photo de profil (simplifié)
    async uploadPhoto(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await userService.uploadPhoto(formData)
        // Recharger la liste des utilisateurs pour mettre à jour la photo
        await this.fetchUsers()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'upload de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.users = []
      this.currentUser = null
      this.error = null
      this.loading = false
    }
  }
})