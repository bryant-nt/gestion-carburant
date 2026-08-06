import { defineStore } from 'pinia'
import { equipementService } from '@/services/equipementService'

export const useEquipementsStore = defineStore('equipements', {
  state: () => ({
    equipements: [],
    currentEquipement: null,
    loading: false,
    error: null,
  }),

  getters: {
    allEquipements: (state) => state.equipements,
    getCurrentEquipement: (state) => state.currentEquipement,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
  },

  actions: {
    // Charger tous les équipements
    async fetchEquipements() {
      this.loading = true
      this.error = null
      try {
        const response = await equipementService.getEquipements()
        this.equipements = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des équipements'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un équipement par ID
    async fetchEquipementById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementService.getEquipementById(id)
        this.currentEquipement = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un équipement
    async createEquipement(equipementData) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementService.createEquipement(equipementData)
        const newEquipement = response.data
        this.equipements.push(newEquipement)
        return newEquipement
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de l\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un équipement
    async updateEquipement(id, equipementData) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementService.updateEquipement(id, equipementData)
        const updatedEquipement = response.data
        const index = this.equipements.findIndex(e => e.idEquipement === id)
        if (index !== -1) {
          this.equipements[index] = updatedEquipement
        }
        if (this.currentEquipement?.idEquipement === id) {
          this.currentEquipement = updatedEquipement
        }
        return updatedEquipement
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de l\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un équipement
    async deleteEquipement(id) {
      this.loading = true
      this.error = null
      try {
        await equipementService.deleteEquipement(id)
        this.equipements = this.equipements.filter(e => e.idEquipement !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de l\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Uploader une photo d'équipement
    async uploadPhoto(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await equipementService.uploadPhoto(formData)
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
      this.equipements = []
      this.currentEquipement = null
      this.error = null
      this.loading = false
    }
  }
})