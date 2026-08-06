import { axiosIns } from '@/plugins/axios'

export const typeCarburantService = {
  // Récupérer tous les types de carburant
  getTypesCarburant() {
    return axiosIns.get('/type-carburant')
  },

  // Récupérer un type de carburant par ID
  getTypeCarburantById(id) {
    return axiosIns.get(`/type-carburant/${id}`)
  },

  // Créer un nouveau type de carburant
  createTypeCarburant(typeData) {
    return axiosIns.post('/type-carburant', typeData)
  },

  // Mettre à jour un type de carburant
  updateTypeCarburant(id, typeData) {
    return axiosIns.put(`/type-carburant/${id}`, typeData)
  },

  // Supprimer un type de carburant
  deleteTypeCarburant(id) {
    return axiosIns.delete(`/type-carburant/${id}`)
  }
}