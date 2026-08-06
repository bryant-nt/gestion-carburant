import { defineStore } from 'pinia'
import { stockCarburantService } from '@/services/stockCarburantService'

export const useStockCarburantStore = defineStore('stockCarburant', {
  state: () => ({
    stocks: [],
    historique: [],
    currentStock: null,
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
    allStocks: (state) => state.stocks,
    allHistorique: (state) => state.historique,
    getCurrentStock: (state) => state.currentStock,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getPagination: (state) => state.pagination,
  },

  actions: {
    // Enregistrer un achat
    async createAchat(achatData) {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.createAchat(achatData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'enregistrement de l\'achat'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour un achat
    async updateAchat(id, achatData) {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.updateAchat(id, achatData)
        const updatedAchat = response.data
        // Mettre à jour dans la liste des achats
        const index = this.stocks.findIndex(s => s.idAchat === id)
        if (index !== -1) {
          this.stocks[index] = updatedAchat
        }
        return updatedAchat
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de l\'achat'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Incrémenter le stock
    async incrementStock(achatData) {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.incrementStock(achatData)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de l\'incrémentation du stock'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les achats
    async fetchAchats() {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.getStocks()
        this.stocks = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des achats'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger les achats paginés
    async fetchAchatsPaged(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.getStocksPaged(params)
        const data = response.data
        this.stocks = data.content || data
        this.pagination = {
          page: data.page || params.page || 0,
          size: data.size || params.size || 10,
          total: data.totalElements || this.stocks.length || 0,
          totalPages: data.totalPages || 0
        }
        return data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des achats'
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
        const response = await stockCarburantService.getHistorique(params)
        this.historique = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de l\'historique'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger l'historique paginé
    async fetchHistoriquePaged(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.getHistoriquePaged(params)
        const data = response.data
        this.historique = data.content || data
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

    // Charger le stock actuel
    async fetchCurrentStock() {
      this.loading = true
      this.error = null
      try {
        const response = await stockCarburantService.getCurrentStock()
        this.currentStock = response.data
        return response.data
      } catch (error) {
        if (error.response?.status === 204) {
          this.currentStock = []
          return []
        }
        this.error = error.response?.data?.message || 'Erreur lors du chargement de la synthèse'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.stocks = []
      this.historique = []
      this.currentStock = null
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