import { axiosIns } from '@/plugins/axios'

export const equipementEtatService = {
  // Récupérer tous les états d'équipement
  getEtats() {
    return axiosIns.get('/equipement-etat')
  },

  // Récupérer un état par ID
  getEtatById(id) {
    return axiosIns.get(`/equipement-etat/${id}`)
  },

  // Créer un nouvel état
  createEtat(etatData) {
    return axiosIns.post('/equipement-etat', etatData)
  },

  // Mettre à jour un état
  updateEtat(id, etatData) {
    return axiosIns.put(`/equipement-etat/${id}`, etatData)
  },

  // Supprimer un état
  deleteEtat(id) {
    return axiosIns.delete(`/equipement-etat/${id}`)
  }
}