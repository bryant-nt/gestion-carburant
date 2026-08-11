import { defineStore } from 'pinia'
import { demandeCarburantService } from '@/services/demandeCarburantService'

export const useDemandeCarburantStore = defineStore('demandeCarburant', {
  state: () => ({
    demandes: [],
    demandesAValider: [],
    demandeCourante: null,
    historique: [],
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
    allDemandes: (state) => state.demandes,
    getDemandesAValider: (state) => state.demandesAValider,
    getDemandeCourante: (state) => state.demandeCourante,
    getHistorique: (state) => state.historique,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getPagination: (state) => state.pagination,
  },

  actions: {
    // Uploader la photo
    async uploadPhoto(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.uploadPhoto(formData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'upload de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer une demande
    async createDemande(data) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.createDemande(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de la demande'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger toutes les demandes
    async fetchDemandes() {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.getDemandes()
        this.demandes = response.data || []
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des demandes'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les demandes à valider
    async fetchDemandesAValider(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.getDemandesAValider(params)
        const data = response.data
        this.demandesAValider = data.content || data || []
        this.pagination = {
          page: data.page || params.page || 0,
          size: data.size || params.size || 10,
          total: data.totalElements || this.demandesAValider.length || 0,
          totalPages: data.totalPages || 0
        }
        return data
      } catch (error) {
        if (error.response?.status === 204) {
          this.demandesAValider = []
          return []
        }
        this.error = error.response?.data?.message || 'Erreur lors du chargement des demandes à valider'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger une demande par ID
    async fetchDemandeById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.getDemandeById(id)
        this.demandeCourante = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de la demande'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Valider une demande
    async validerDemande(id, data = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.validerDemande(id, data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la validation'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Rejeter une demande
    async rejeterDemande(id, data = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.rejeterDemande(id, data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du rejet'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Annuler une demande
    async annulerDemande(id) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.annulerDemande(id)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'annulation'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger l'historique
    async fetchHistorique(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await demandeCarburantService.getHistorique(params)
        const data = response.data
        this.historique = data.content || data || []
        this.pagination = {
          page: data.page || params.page || 0,
          size: data.size || params.size || 10,
          total: data.totalElements || this.historique.length || 0,
          totalPages: data.totalPages || 0
        }
        return data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'historique'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.demandes = []
      this.demandesAValider = []
      this.demandeCourante = null
      this.historique = []
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