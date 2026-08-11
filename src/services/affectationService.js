import { axiosIns } from '@/plugins/axios'

export const affectationService = {
  // Uploader photo tableau de bord
  uploadPhoto(formData) {
    return axiosIns.post('/equipement-utilisateur/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Affecter un équipement à un chauffeur
  affecterEquipement(data) {
    return axiosIns.post('/equipement-utilisateur/affecter', data)
  },

  // Remettre un équipement en parking
  retourParking(data) {
    return axiosIns.post('/equipement-utilisateur/parking', data)
  },

  // Transfert parking → garage
  transfertParkingVersGarage() {
    return axiosIns.post('/equipement-utilisateur/parking-vers-garage')
  },

  // Transfert garage → parking
  transfertGarageVersParking() {
    return axiosIns.post('/equipement-utilisateur/garage-vers-parking')
  },

  // Mes équipements affectés
  getMesEquipementsAffectes() {
    return axiosIns.get('/equipement-utilisateur/mes-equipements-affectes')
  },

  // Équipements disponibles (parking)
  getEquipementsDisponibles() {
    return axiosIns.get('/equipement-utilisateur/disponible')
  },

  // Équipements par état
  getEquipementsParEtat(statut) {
    return axiosIns.get(`/equipement-utilisateur/par-etat/${statut}`)
  },

  // Historique des affectations
  getHistorique(params = {}) {
    return axiosIns.get('/equipement-utilisateur/historique', { params })
  },

  // Détail d'une opération d'historique
  getHistoriqueDetail(id) {
    return axiosIns.get(`/equipement-utilisateur/historique/${id}`)
  },

  // Mettre à jour la photo d'un historique
  updateHistoriquePhoto(id, data) {
    return axiosIns.patch(`/equipement-utilisateur/historique/${id}/photo`, data)
  },

  // Mettre à jour la photo via clientOperationId
  updateHistoriquePhotoByClientId(data) {
    return axiosIns.patch('/equipement-utilisateur/historique/photo', data)
  }
}