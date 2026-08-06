import { axiosIns } from '@/plugins/axios'

export const uniteService = {
  // Récupérer toutes les unités
  getUnites() {
    return axiosIns.get('/unites')
  },

  // Récupérer une unité par ID
  getUniteById(id) {
    return axiosIns.get(`/unites/${id}`)
  },

  // Créer une nouvelle unité
  createUnite(uniteData) {
    return axiosIns.post('/unites', uniteData)
  },

  // Mettre à jour une unité
  updateUnite(id, uniteData) {
    return axiosIns.put(`/unites/${id}`, uniteData)
  },

  // Supprimer une unité
  deleteUnite(id) {
    return axiosIns.delete(`/unites/${id}`)
  }
}