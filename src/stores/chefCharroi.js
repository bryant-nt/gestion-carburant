import { defineStore } from 'pinia'
import { chefCharroiService } from '@/services/chefCharroiService'

export const useChefCharroiStore = defineStore('chefCharroi', {
  state: () => ({
    webDashboard: null,
    loading: false,
    error: null
  }),

  getters: {
    consommationMensuelle: (state) => state.webDashboard?.consommationMensuelle || null,
    consommationAnnuelle: (state) => state.webDashboard?.consommationAnnuelle || null,
    vehiculesEnService: (state) => state.webDashboard?.vehiculesEnService || null,
    demandesEnAttente: (state) => state.webDashboard?.demandesEnAttente || null,
    parc: (state) => state.webDashboard?.parc || null,
    stocksStations: (state) => state.webDashboard?.stocksStations || [],
    consommationParTypeEngin: (state) => state.webDashboard?.consommationParTypeEngin || [],
    consommationParMois: (state) => state.webDashboard?.consommationParMois || []
  },

  actions: {
    async fetchWebDashboard() {
      this.loading = true
      this.error = null
      try {
        const response = await chefCharroiService.getWebDashboard()
        this.webDashboard = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement du dashboard'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})