import { defineStore } from 'pinia'
import { affectationService } from '@/services/affectationService'

export const useAffectationsStore = defineStore('affectations', {
  state: () => ({
    equipementsAffectes: [],
    equipementsDisponibles: [],
    equipementsParEtat: [],
    historique: [],
    currentHistorique: null,
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
    getEquipementsAffectes: (state) => state.equipementsAffectes,
    getEquipementsDisponibles: (state) => state.equipementsDisponibles,
    getEquipementsParEtat: (state) => state.equipementsParEtat,
    getHistorique: (state) => state.historique,
    getCurrentHistorique: (state) => state.currentHistorique,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getPagination: (state) => state.pagination,
  },

  actions: {
    // Uploader photo tableau de bord
    async uploadPhoto(formData) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.uploadPhoto(formData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'upload de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Affecter un équipement
    async affecterEquipement(data) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.affecterEquipement(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'affectation'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Retour parking
    async retourParking(data) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.retourParking(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du retour parking'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Transfert parking → garage
    async transfertParkingVersGarage() {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.transfertParkingVersGarage()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du transfert parking → garage'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Transfert garage → parking
    async transfertGarageVersParking() {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.transfertGarageVersParking()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du transfert garage → parking'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger mes équipements affectés
    async fetchMesEquipementsAffectes() {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.getMesEquipementsAffectes()
        this.equipementsAffectes = response.data || []
        return response.data
      } catch (error) {
        if (error.response?.status === 204) {
          this.equipementsAffectes = []
          return []
        }
        this.error = error.response?.data?.message || 'Erreur lors du chargement des équipements affectés'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les équipements disponibles
    async fetchEquipementsDisponibles() {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.getEquipementsDisponibles()
        // Vérifier si la réponse a du contenu
        if (response.data && Array.isArray(response.data)) {
          this.equipementsDisponibles = response.data
        } else {
          this.equipementsDisponibles = []
        }
        return this.equipementsDisponibles
      } catch (error) {
        if (error.response?.status === 204) {
          this.equipementsDisponibles = []
          return []
        }
        this.error = error.response?.data?.message || 'Erreur lors du chargement des équipements disponibles'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les équipements par état
    async fetchEquipementsParEtat(statut) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.getEquipementsParEtat(statut)
        this.equipementsParEtat = response.data || []
        return response.data
      } catch (error) {
        if (error.response?.status === 204) {
          this.equipementsParEtat = []
          return []
        }
        this.error = error.response?.data?.message || 'Erreur lors du chargement des équipements par état'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger l'historique des affectations
    async fetchHistorique(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.getHistorique(params)
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

    // Charger le détail d'une opération d'historique
    async fetchHistoriqueDetail(id) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.getHistoriqueDetail(id)
        this.currentHistorique = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du détail'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour la photo d'un historique
    async updateHistoriquePhoto(id, data) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.updateHistoriquePhoto(id, data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour la photo via clientOperationId
    async updateHistoriquePhotoByClientId(data) {
      this.loading = true
      this.error = null
      try {
        const response = await affectationService.updateHistoriquePhotoByClientId(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de la photo'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.equipementsAffectes = []
      this.equipementsDisponibles = []
      this.equipementsParEtat = []
      this.historique = []
      this.currentHistorique = null
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