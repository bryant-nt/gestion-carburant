import { defineStore } from 'pinia'
import { typeCarburantService } from '@/services/typeCarburantService'

export const useTypeCarburantStore = defineStore('typeCarburant', {
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
    // Charger tous les types de carburant
    async fetchTypes() {
      this.loading = true
      this.error = null
      try {
        const response = await typeCarburantService.getTypesCarburant()
        this.types = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des types de carburant'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un type de carburant par ID
    async fetchTypeById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await typeCarburantService.getTypeCarburantById(id)
        this.currentType = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du type de carburant'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un nouveau type de carburant
    async createType(typeData) {
      this.loading = true
      this.error = null
      try {
        const response = await typeCarburantService.createTypeCarburant(typeData)
        const newType = response.data
        this.types.push(newType)
        return newType
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création du type de carburant'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un type de carburant
    async updateType(id, typeData) {
      this.loading = true
      this.error = null
      try {
        const response = await typeCarburantService.updateTypeCarburant(id, typeData)
        const updatedType = response.data
        const index = this.types.findIndex(t => t.idCarburant === id)
        if (index !== -1) {
          this.types[index] = updatedType
        }
        if (this.currentType?.idCarburant === id) {
          this.currentType = updatedType
        }
        return updatedType
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du type de carburant'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un type de carburant
    async deleteType(id) {
      this.loading = true
      this.error = null
      try {
        await typeCarburantService.deleteTypeCarburant(id)
        this.types = this.types.filter(t => t.idCarburant !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression du type de carburant'
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