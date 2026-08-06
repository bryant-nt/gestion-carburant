import { defineStore } from 'pinia'
import { typeEquipementService } from '@/services/typeEquipementService'

export const useTypeEquipementStore = defineStore('typeEquipement', {
  state: () => ({
    types: [],
    currentType: null,
    loading: false,
    error: null,
  }),

  getters: {
    allTypes: (state) => state.types,
    getCurrentType: (state) => state.currentType,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    typesCount: (state) => state.types.length,
  },

  actions: {
    // Charger tous les types d'équipement
    async fetchTypes() {
      this.loading = true
      this.error = null
      try {
        const response = await typeEquipementService.getTypesEquipement()
        this.types = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des types d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un type d'équipement par ID
    async fetchTypeById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await typeEquipementService.getTypeEquipementById(id)
        this.currentType = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du type d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un nouveau type d'équipement
    async createType(typeData) {
      this.loading = true
      this.error = null
      try {
        const response = await typeEquipementService.createTypeEquipement(typeData)
        const newType = response.data
        this.types.push(newType)
        return newType
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création du type d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un type d'équipement
    async updateType(id, typeData) {
      this.loading = true
      this.error = null
      try {
        const response = await typeEquipementService.updateTypeEquipement(id, typeData)
        const updatedType = response.data
        const index = this.types.findIndex(t => t.idTypeEquipement === id)
        if (index !== -1) {
          this.types[index] = updatedType
        }
        if (this.currentType?.idTypeEquipement === id) {
          this.currentType = updatedType
        }
        return updatedType
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du type d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un type d'équipement
    async deleteType(id) {
      this.loading = true
      this.error = null
      try {
        await typeEquipementService.deleteTypeEquipement(id)
        this.types = this.types.filter(t => t.idTypeEquipement !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression du type d\'équipement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.types = []
      this.currentType = null
      this.error = null
      this.loading = false
    }
  }
})