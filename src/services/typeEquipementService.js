import { axiosIns } from '@/plugins/axios'

export const typeEquipementService = {
  // Récupérer tous les types d'équipement
  getTypesEquipement() {
    return axiosIns.get('/type-equipement')
  },

  // Récupérer un type d'équipement par ID
  getTypeEquipementById(id) {
    return axiosIns.get(`/type-equipement/${id}`)
  },

  // Créer un nouveau type d'équipement
  createTypeEquipement(typeData) {
    return axiosIns.post('/type-equipement', typeData)
  },

  // Mettre à jour un type d'équipement
  updateTypeEquipement(id, typeData) {
    return axiosIns.put(`/type-equipement/${id}`, typeData)
  },

  // Supprimer un type d'équipement
  deleteTypeEquipement(id) {
    return axiosIns.delete(`/type-equipement/${id}`)
  }
}