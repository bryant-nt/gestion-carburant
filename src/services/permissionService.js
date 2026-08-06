import { axiosIns } from '@/plugins/axios'

export const permissionService = {
  // Récupérer toutes les permissions
  getPermissions() {
    return axiosIns.get('/permissions')
  },

  // Récupérer une permission par ID
  getPermissionById(id) {
    return axiosIns.get(`/permissions/${id}`)
  },

  // Créer une nouvelle permission
  createPermission(permissionData) {
    return axiosIns.post('/permissions', permissionData)
  },

  // Mettre à jour une permission
  updatePermission(id, permissionData) {
    return axiosIns.put(`/permissions/${id}`, permissionData)
  },

  // Supprimer une permission
  deletePermission(id) {
    return axiosIns.delete(`/permissions/${id}`)
  }
}