import { axiosIns } from '@/plugins/axios'

export const equipementService = {
  // Récupérer tous les équipements
  getEquipements() {
    return axiosIns.get('/equipements')
  },

  // Récupérer un équipement par ID
  getEquipementById(id) {
    return axiosIns.get(`/equipements/${id}`)
  },

  // Créer un équipement
  createEquipement(equipementData) {
    return axiosIns.post('/equipements', equipementData)
  },

  // Mettre à jour un équipement
  updateEquipement(id, equipementData) {
    return axiosIns.put(`/equipements/${id}`, equipementData)
  },

  // Supprimer un équipement
  deleteEquipement(id) {
    return axiosIns.delete(`/equipements/${id}`)
  },

  // Uploader une photo d'équipement
  uploadPhoto(formData) {
    return axiosIns.post('/equipements/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}