import { defineStore } from 'pinia'
import { uniteService } from '@/services/uniteService'

export const useUnitesStore = defineStore('unites', {
  state: () => ({
    unites: [],
    currentUnite: null,
    loading: false,
    error: null,
  }),

  getters: {
    allUnites: (state) => state.unites,
    getCurrentUnite: (state) => state.currentUnite,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    unitesCount: (state) => state.unites.length,
  },

  actions: {
    // Charger toutes les unités
    async fetchUnites() {
      this.loading = true
      this.error = null
      try {
        const response = await uniteService.getUnites()
        this.unites = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des unités'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger une unité par ID
    async fetchUniteById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await uniteService.getUniteById(id)
        this.currentUnite = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'unité'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer une nouvelle unité
    async createUnite(uniteData) {
      this.loading = true
      this.error = null
      try {
        const response = await uniteService.createUnite(uniteData)
        const newUnite = response.data
        this.unites.push(newUnite)
        return newUnite
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de l\'unité'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour une unité
    async updateUnite(id, uniteData) {
      this.loading = true
      this.error = null
      try {
        const response = await uniteService.updateUnite(id, uniteData)
        const updatedUnite = response.data
        const index = this.unites.findIndex(u => u.idUnite === id)
        if (index !== -1) {
          this.unites[index] = updatedUnite
        }
        if (this.currentUnite?.idUnite === id) {
          this.currentUnite = updatedUnite
        }
        return updatedUnite
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de l\'unité'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer une unité
    async deleteUnite(id) {
      this.loading = true
      this.error = null
      try {
        await uniteService.deleteUnite(id)
        this.unites = this.unites.filter(u => u.idUnite !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de l\'unité'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.unites = []
      this.currentUnite = null
      this.error = null
      this.loading = false
    }
  }
})