import { defineStore } from 'pinia'
import { stationService } from '@/services/stationService'

export const useStationsStore = defineStore('stations', {
  state: () => ({
    stations: [],
    currentStation: null,
    loading: false,
    error: null,
  }),

  getters: {
    allStations: (state) => state.stations,
    getCurrentStation: (state) => state.currentStation,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    stationsCount: (state) => state.stations.length,
  },

  actions: {
    // Charger toutes les stations
    async fetchStations() {
      this.loading = true
      this.error = null
      try {
        const response = await stationService.getStations()
        this.stations = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement des stations'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Charger une station par ID
    async fetchStationById(id) {
      this.loading = true
      this.error = null
      try {
        const response = await stationService.getStationById(id)
        this.currentStation = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du chargement de la station'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Créer une nouvelle station
    async createStation(stationData) {
      this.loading = true
      this.error = null
      try {
        const response = await stationService.createStation(stationData)
        const newStation = response.data
        this.stations.push(newStation)
        return newStation
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la création de la station'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Mettre à jour une station
    async updateStation(id, stationData) {
      this.loading = true
      this.error = null
      try {
        const response = await stationService.updateStation(id, stationData)
        const updatedStation = response.data
        const index = this.stations.findIndex(s => s.idStation === id)
        if (index !== -1) {
          this.stations[index] = updatedStation
        }
        if (this.currentStation?.idStation === id) {
          this.currentStation = updatedStation
        }
        return updatedStation
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la mise à jour de la station'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Supprimer une station
    async deleteStation(id) {
      this.loading = true
      this.error = null
      try {
        await stationService.deleteStation(id)
        this.stations = this.stations.filter(s => s.idStation !== id)
        return true
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la suppression de la station'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Réinitialiser l'état
    resetState() {
      this.stations = []
      this.currentStation = null
      this.error = null
      this.loading = false
    }
  }
})