import { axiosIns } from '@/plugins/axios'

export const seuilCarburantService = {
  // Récupérer tous les seuils
  getSeuils() {
    return axiosIns.get('/seuil-carburant')
  },

  // Récupérer un seuil par ID
  getSeuilById(id) {
    return axiosIns.get(`/seuil-carburant/${id}`)
  },

  // Récupérer le seuil d'une station
  getSeuilByStation(idStation) {
    return axiosIns.get(`/seuil-carburant/by-station/${idStation}`)
  },

  // Créer un seuil
  createSeuil(seuilData) {
    return axiosIns.post('/seuil-carburant', seuilData)
  },

  // Mettre à jour un seuil
  updateSeuil(id, seuilData) {
    return axiosIns.put(`/seuil-carburant/${id}`, seuilData)
  },

  // Créer ou mettre à jour le seuil d'une station (upsert)
  upsertSeuilByStation(idStation, seuilData) {
    return axiosIns.put(`/seuil-carburant/by-station/${idStation}`, seuilData)
  },

  // Supprimer un seuil
  deleteSeuil(id) {
    return axiosIns.delete(`/seuil-carburant/${id}`)
  }
}