import { axiosIns } from '@/plugins/axios'

export const stockCarburantService = {
  // Enregistrer un achat
  createAchat(achatData) {
    return axiosIns.post('/stock/achats', achatData)
  },

  // Mettre à jour un achat
  updateAchat(id, achatData) {
    return axiosIns.put(`/stock/achats/${id}`, achatData)
  },

  // Incrémenter le stock (alias)
  incrementStock(achatData) {
    return axiosIns.post('/stock/achats/increment', achatData)
  },

  // Liste des stocks courants
  getStocks() {
    return axiosIns.get('/stock/achats')
  },

  // Stocks paginés et filtrés
  getStocksPaged(params = {}) {
    return axiosIns.get('/stock/achats/paged', { params })
  },

  // Historique d'achats
  getHistorique(params = {}) {
    return axiosIns.get('/stock/historique', { params })
  },

  // Historique d'achats paginé
  getHistoriquePaged(params = {}) {
    return axiosIns.get('/stock/historique/paged', { params })
  },

  // Synthèse stock actuel
  getCurrentStock() {
    return axiosIns.get('/stock/current')
  }
}