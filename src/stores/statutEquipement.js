import { defineStore } from 'pinia'
import { statutEquipementService } from '@/services/statutEquipementService'

export const useStatutEquipementStore = defineStore('statutEquipement', {
  state: () => ({
    statuts: [],
    currentStatut: null,
    loading: false,
    error: null,
  }),

  getters: {
    allStatuts: (state) => state.statuts,
    getCurrentStatut: (state) => state.currentStatut,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    statutsCount: (state) => state.statuts.length,
  },

  actions: {
    // Charger tous les statuts d'équipement
    async fetchStatuts() {
      this.loading = true
      this.error = null
      try {
        const response = await statutEquipementService.getStatutsEquipement()
        this.statuts = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des statuts d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un statut d'équipement par ID
    async fetchStatutById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await statutEquipementService.getStatutEquipementById(id)
        this.currentStatut = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du statut d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un nouveau statut d'équipement
    async createStatut(statutData) {
      this.loading = true
      this.error = null
      try {
        const response = await statutEquipementService.createStatutEquipement(statutData)
        const newStatut = response.data
        this.statuts.push(newStatut)
        return newStatut
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création du statut d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un statut d'équipement
    async updateStatut(id, statutData) {
      this.loading = true
      this.error = null
      try {
        const response = await statutEquipementService.updateStatutEquipement(id, statutData)
        const updatedStatut = response.data
        const index = this.statuts.findIndex(s => s.idStatut === id)
        if (index !== -1) {
          this.statuts[index] = updatedStatut
        }
        if (this.currentStatut?.idStatut === id) {
          this.currentStatut = updatedStatut
        }
        return updatedStatut
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du statut d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un statut d'équipement
    async deleteStatut(id) {
      this.loading = true
      this.error = null
      try {
        await statutEquipementService.deleteStatutEquipement(id)
        this.statuts = this.statuts.filter(s => s.idStatut !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression du statut d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.statuts = []
      this.currentStatut = null
      this.error = null
      this.loading = false
    }
  }
})