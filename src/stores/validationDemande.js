import { defineStore } from 'pinia'
import { validationDemandeService } from '@/services/validationDemandeService'

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export const useValidationDemandeStore = defineStore('validationDemande', {
  state: () => ({
    loading: false,
    error: null
  }),

  actions: {
    // Approuver une demande
    // payload attendu : { idDemande, idUnite, niveauValidation, quantiteAccordee, commentaire }
    async validerDemande(payload) {
      this.loading = true
      this.error = null
      try {
        const data = {
          ...payload,
          clientOperationId: payload.clientOperationId || generateUUID()
        }
        const response = await validationDemandeService.valider(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors de la validation'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Refuser une demande
    // payload attendu : { idDemande, idUnite, niveauValidation, commentaire }
    async refuserDemande(payload) {
      this.loading = true
      this.error = null
      try {
        const data = {
          ...payload,
          clientOperationId: payload.clientOperationId || generateUUID()
        }
        const response = await validationDemandeService.refuser(data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Erreur lors du refus'
        throw error
      } finally {
        this.loading = false
      }
    },

    // Chaîne de validations d'une demande
    async fetchValidationsByDemande(idDemande) {
      this.loading = true
      this.error = null
      try {
        const response = await validationDemandeService.getByDemande(idDemande)
        return response.data || []
      } catch (error) {
        if (error.response?.status === 204) return []
        this.error = error.response?.data?.message || 'Erreur lors du chargement des validations'
        throw error
      } finally {
        this.loading = false
      }
    }
  }
})