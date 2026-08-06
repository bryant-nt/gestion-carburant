import { axiosIns } from '@/plugins/axios'

export const stationService = {
  // Récupérer toutes les stations
  getStations() {
    return axiosIns.get('/stationCarburant')
  },

  // Récupérer une station par ID
  getStationById(id) {
    return axiosIns.get(`/stationCarburant/${id}`)
  },

  // Créer une nouvelle station
  createStation(stationData) {
    return axiosIns.post('/stationCarburant', stationData)
  },

  // Mettre à jour une station
  updateStation(id, stationData) {
    return axiosIns.put(`/stationCarburant/${id}`, stationData)
  },

  // Supprimer une station
  deleteStation(id) {
    return axiosIns.delete(`/stationCarburant/${id}`)
  }
}