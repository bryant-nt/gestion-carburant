import { axiosIns } from '@/plugins/axios'

export const statutEquipementService = {
  // Récupérer tous les statuts d'équipement
  getStatutsEquipement() {
    return axiosIns.get('/statut-equipement')
  },

  // Récupérer un statut d'équipement par ID
  getStatutEquipementById(id) {
    return axiosIns.get(`/statut-equipement/${id}`)
  },

  // Créer un nouveau statut d'équipement
  createStatutEquipement(statutData) {
    return axiosIns.post('/statut-equipement', statutData)
  },

  // Mettre à jour un statut d'équipement
  updateStatutEquipement(id, statutData) {
    return axiosIns.put(`/statut-equipement/${id}`, statutData)
  },

  // Supprimer un statut d'équipement
  deleteStatutEquipement(id) {
    return axiosIns.delete(`/statut-equipement/${id}`)
  }
}