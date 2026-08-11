import { axiosIns } from '@/plugins/axios'

export const validationDemandeService = {
  // Approuver une demande
  valider(data) {
    return axiosIns.post('/validationDemande/valider', data)
  },

  // Refuser une demande
  refuser(data) {
    return axiosIns.post('/validationDemande/refuser', data)
  },

  // Historique brut de toutes les validations (audit/admin)
  getAll() {
    return axiosIns.get('/validationDemande')
  },

  // Validations paginées / filtrées (grilles d'administration)
  getPaged(params = {}) {
    return axiosIns.get('/validationDemande/paged', { params })
  },

  // Chaîne de validations d'une demande précise
  getByDemande(idDemande) {
    return axiosIns.get(`/validationDemande/demande/${idDemande}`)
  }
}