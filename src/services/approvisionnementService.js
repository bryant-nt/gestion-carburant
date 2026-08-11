import { axiosIns } from '@/plugins/axios'

export const approvisionnementService = {
  // Uploader photo tableau de bord après plein
  uploadPhotoApres(formData) {
    return axiosIns.post('/approvisionnement/photoApres', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Uploader capture / preuve pompe
  uploadScreenshot(formData) {
    return axiosIns.post('/approvisionnement/screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Enregistrer un approvisionnement
  createApprovisionnement(data) {
    return axiosIns.post('/approvisionnement', data)
  },

  // Liste de tous les approvisionnements
  getApprovisionnements() {
    return axiosIns.get('/approvisionnement')
  },

  // Approvisionnements paginés
  getApprovisionnementsPaged(params = {}) {
    return axiosIns.get('/approvisionnement/paged', { params })
  },

  // Détail d'un approvisionnement
  getApprovisionnementById(id) {
    return axiosIns.get(`/approvisionnement/${id}`)
  },

  // Approvisionnement lié à une demande
  getApprovisionnementByDemande(idDemande) {
    return axiosIns.get(`/approvisionnement/by-demande/${idDemande}`)
  },

  // Mettre à jour les photos d'un approvisionnement
  updatePhotos(id, data) {
    return axiosIns.patch(`/approvisionnement/${id}/photos`, data)
  }
}