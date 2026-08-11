import { defineStore } from 'pinia'
import { axiosIns } from '@/plugins/axios'

// ⚠️ Pas d'endpoint de "notifications" dédié côté backend.
// On agrège deux sources documentées :
// 1) /demandeCarburant/scope/a-valider  -> déjà filtré sur l'utilisateur connecté (= "c'est son tour de valider")
// 2) /equipement-utilisateur/mes-equipements-affectes -> équipements actuellement affectés au chauffeur connecté
// Il n'y a pas de notion de "lu / non lu" côté backend : le badge reflète simplement les éléments en attente
// actuellement renvoyés par ces deux endpoints.

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    demandesAValider: [],
    equipementsAffectes: [],
    loading: false,
    error: null,
    lastFetchedAt: null
  }),

  getters: {
    countValidations: (state) => state.demandesAValider.length,
    countAffectations: (state) => state.equipementsAffectes.length,
    totalCount: (state) => state.demandesAValider.length + state.equipementsAffectes.length,
    hasNotifications: (state) => (state.demandesAValider.length + state.equipementsAffectes.length) > 0
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error = null
      try {
        const [demandesRes, affectationsRes] = await Promise.allSettled([
          axiosIns.get('/demandeCarburant/scope/a-valider', { params: { page: 0, size: 5 } }),
          axiosIns.get('/equipement-utilisateur/mes-equipements-affectes')
        ])

        if (demandesRes.status === 'fulfilled') {
          const data = demandesRes.value.data
          this.demandesAValider = data?.content || data || []
        } else if (demandesRes.reason?.response?.status !== 204) {
          console.error('Erreur chargement demandes à valider (notifications):', demandesRes.reason)
        }

        if (affectationsRes.status === 'fulfilled') {
          this.equipementsAffectes = affectationsRes.value.data || []
        } else if (affectationsRes.reason?.response?.status !== 204) {
          console.error('Erreur chargement équipements affectés (notifications):', affectationsRes.reason)
        }

        this.lastFetchedAt = new Date()
      } catch (error) {
        this.error = 'Erreur lors du chargement des notifications'
        console.error(error)
      } finally {
        this.loading = false
      }
    }
  }
})