import { axiosIns } from '@/plugins/axios'

export const demandeCarburantService = {
  // Uploader la photo tableau de bord
  uploadPhoto(formData) {
    return axiosIns.post('/demandeCarburant/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // Créer une demande de carburant
  createDemande(data) {
    return axiosIns.post('/demandeCarburant', data)
  },

  // Liste de toutes les demandes (usage admin/exports)
  getDemandes() {
    return axiosIns.get('/demandeCarburant')
  },

  // File d'attente "à valider"
  getDemandesAValider(params = {}) {
    return axiosIns.get('/demandeCarburant/scope/a-valider', { params })
  },

  // Historique des demandes — ✅ corrigé : /scope/historique, pas /historique
  getHistorique(params = {}) {
    return axiosIns.get('/demandeCarburant/scope/historique', { params })
  },

  // Demandes prêtes pour approvisionnement (pompiste)
  getDemandesPourApprovisionnement(params = {}) {
    return axiosIns.get('/demandeCarburant/scope/pour-approvisionnement', { params })
  },

  // Compteur de tâches en attente (badge)
  getCompteurEnAttente() {
    return axiosIns.get('/demandeCarburant/scope/compteur-en-attente')
  },

  // Obtenir une demande par ID
  getDemandeById(id) {
    return axiosIns.get(`/demandeCarburant/${id}`)
  },

  // Mettre à jour la photo d'une demande existante
  updatePhoto(id, data) {
    return axiosIns.patch(`/demandeCarburant/${id}/photo`, data)
  },

  // Clôture administrative (cas exceptionnel, motif obligatoire)
  clotureAdministrative(id, motif) {
    return axiosIns.post(`/demandeCarburant/${id}/cloture-administrative`, { motif })
  },

  // Demandes d'un utilisateur donné
  getDemandesParUtilisateur(id) {
    return axiosIns.get(`/demandeCarburant/utilisateur/${id}`)
  },

  // Demandes par statut métier
  getDemandesParStatut(statut) {
    return axiosIns.get(`/demandeCarburant/statut/${statut}`)
  }

  // ⚠️ validerDemande / rejeterDemande / annulerDemande retirés :
  // aucun de ces 3 endpoints n'existe dans la doc fournie.
  // À réintégrer dès que vous confirmez les vraies routes backend.
}