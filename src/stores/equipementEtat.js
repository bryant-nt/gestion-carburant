import { defineStore } from 'pinia'
import { equipementEtatService } from '@/services/equipementEtatService'

export const useEquipementEtatStore = defineStore('equipementEtat', {
  state: () => ({
    etats: [],
    currentEtat: null,
    loading: false,
    error: null,
  }),

  getters: {
    allEtats: (state) => state.etats,
    getCurrentEtat: (state) => state.currentEtat,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    etatsCount: (state) => state.etats.length,
  },

  actions: {
    // Charger tous les états
    async fetchEtats() {
      this.loading = true
      this.error = null
      try {
        const response = await equipementEtatService.getEtats()
        this.etats = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des états d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un état par ID
    async fetchEtatById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementEtatService.getEtatById(id)
        this.currentEtat = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'état'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un nouvel état
    async createEtat(etatData) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementEtatService.createEtat(etatData)
        const newEtat = response.data
        this.etats.push(newEtat)
        return newEtat
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de l\'état'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un état
    async updateEtat(id, etatData) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementEtatService.updateEtat(id, etatData)
        const updatedEtat = response.data
        const index = this.etats.findIndex(e => e.idEquipementEtat === id)
        if (index !== -1) {
          this.etats[index] = updatedEtat
        }
        if (this.currentEtat?.idEquipementEtat === id) {
          this.currentEtat = updatedEtat
        }
        return updatedEtat
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de l\'état'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un état
    async deleteEtat(id) {
      this.loading = true
      this.error = null
      try {
        await equipementEtatService.deleteEtat(id)
        this.etats = this.etats.filter(e => e.idEquipementEtat !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de l\'état'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.etats = []
      this.currentEtat = null
      this.error = null
      this.loading = false
    }
  }
})