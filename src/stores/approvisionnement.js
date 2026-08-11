import { defineStore } from 'pinia'
import { approvisionnementService } from '@/services/approvisionnementService'

export const useApprovisionnementStore = defineStore('approvisionnement', {
  state: () => ({
    approvisionnements: [],
    currentApprovisionnement: null,
    loading: false,
    error: null,
    pagination: {
      page: 0,
      size: 10,
      total: 0,
      totalPages: 0
    }
  }),

  getters: {
    allApprovisionnements: (state) => state.approvisionnements,
    getCurrentApprovisionnement: (state) => state.currentApprovisionnement,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getPagination: (state) => state.pagination,
  },

  actions: {
    // Uploader photo tableau de bord après plein
    async uploadPhotoApres(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.uploadPhotoApres(formData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'upload de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Uploader capture / preuve pompe
    async uploadScreenshot(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.uploadScreenshot(formData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'upload du screenshot'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Enregistrer un approvisionnement
    async createApprovisionnement(data) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.createApprovisionnement(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'enregistrement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger tous les approvisionnements
    async fetchApprovisionnements() {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.getApprovisionnements()
        this.approvisionnements = response.data || []
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les approvisionnements paginés
    async fetchApprovisionnementsPaged(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.getApprovisionnementsPaged(params)
        const data = response.data
        this.approvisionnements = data.content || data || []
        this.pagination = {
          page: data.page || params.page || 0,
          size: data.size || params.size || 10,
          total: data.totalElements || this.approvisionnements.length || 0,
          totalPages: data.totalPages || 0
        }
        return data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger un approvisionnement par ID
    async fetchApprovisionnementById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.getApprovisionnementById(id)
        this.currentApprovisionnement = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger l'approvisionnement lié à une demande
    async fetchApprovisionnementByDemande(idDemande) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.getApprovisionnementByDemande(idDemande)
        this.currentApprovisionnement = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour les photos
    async updatePhotos(id, data) {
      this.loading = true
      this.error = null
      try {
        const response = await approvisionnementService.updatePhotos(id, data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour des photos'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.approvisionnements = []
      this.currentApprovisionnement = null
      this.error = null
      this.loading = false
      this.pagination = {
        page: 0,
        size: 10,
        total: 0,
        totalPages: 0
      }
    }
  }
})