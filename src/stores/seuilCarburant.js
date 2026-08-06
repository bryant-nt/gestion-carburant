import { defineStore } from 'pinia'
import { seuilCarburantService } from '@/services/seuilCarburantService'

export const useSeuilCarburantStore = defineStore('seuilCarburant', {
  state: () => ({
    seuils: [],
    currentSeuil: null,
    loading: false,
    error: null,
  }),

  getters: {
    allSeuils: (state) => state.seuils,
    getCurrentSeuil: (state) => state.currentSeuil,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    seuilsCount: (state) => state.seuils.length,
  },

  actions: {
    // Charger tous les seuils
    async fetchSeuils() {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.getSeuils()
        this.seuils = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des seuils'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un seuil par ID
    async fetchSeuilById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.getSeuilById(id)
        this.currentSeuil = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du seuil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger le seuil d'une station
    async fetchSeuilByStation(idStation) {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.getSeuilByStation(idStation)
        this.currentSeuil = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du seuil de la station'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer un seuil
    async createSeuil(seuilData) {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.createSeuil(seuilData)
        const newSeuil = response.data
        this.seuils.push(newSeuil)
        return newSeuil
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création du seuil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un seuil
    async updateSeuil(id, seuilData) {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.updateSeuil(id, seuilData)
        const updatedSeuil = response.data
        const index = this.seuils.findIndex(s => s.idSeuil === id)
        if (index !== -1) {
          this.seuils[index] = updatedSeuil
        }
        if (this.currentSeuil?.idSeuil === id) {
          this.currentSeuil = updatedSeuil
        }
        return updatedSeuil
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour du seuil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer ou mettre à jour le seuil d'une station (upsert)
    async upsertSeuilByStation(idStation, seuilData) {
      this.loading = true
      this.error = null
      try {
        const response = await seuilCarburantService.upsertSeuilByStation(idStation, seuilData)
        const updatedSeuil = response.data
        // Mettre à jour la liste si le seuil existe déjà
        const index = this.seuils.findIndex(s => s.idSeuil === updatedSeuil.idSeuil)
        if (index !== -1) {
          this.seuils[index] = updatedSeuil
        } else {
          this.seuils.push(updatedSeuil)
        }
        this.currentSeuil = updatedSeuil
        return updatedSeuil
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la sauvegarde du seuil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer un seuil
    async deleteSeuil(id) {
      this.loading = true
      this.error = null
      try {
        await seuilCarburantService.deleteSeuil(id)
        this.seuils = this.seuils.filter(s => s.idSeuil !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression du seuil'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.seuils = []
      this.currentSeuil = null
      this.error = null
      this.loading = false
    }
  }
})