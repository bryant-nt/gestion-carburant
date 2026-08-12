import { axiosIns } from '@/plugins/axios'

export const chefCharroiService = {
  // Vue d'ensemble agrégée (KPI + graphiques) — source principale du dashboard
  getWebDashboard() {
    return axiosIns.get('/chef-chaloi/web-dashboard')
  },

  // KPIs de stock par station (seuils min/max, alertes)
  getKpis() {
    return axiosIns.get('/chef-chaloi/kpis')
  },

  getChauffeurs() {
    return axiosIns.get('/chef-chaloi/chauffeurs')
  },

  getVehicules() {
    return axiosIns.get('/chef-chaloi/vehicules')
  },

  getStations() {
    return axiosIns.get('/chef-chaloi/stations')
  },

  getDemandes() {
    return axiosIns.get('/chef-chaloi/demandes')
  },

  getEquipements() {
    return axiosIns.get('/chef-chaloi/equipements')
  },

  getApprovisionnementsKpis() {
    return axiosIns.get('/chef-chaloi/approvisionnements-kpis')
  }
}