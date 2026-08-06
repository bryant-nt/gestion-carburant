import { axiosIns } from '@/plugins/axios'

export const roleService = {
  getRoles() {
    return axiosIns.get('/roles')
  },

  getRoleById(id) {
    return axiosIns.get(`/roles/${id}`)
  },

  createRole(roleData) {
    return axiosIns.post('/roles', roleData)
  },

  updateRole(id, roleData) {
    return axiosIns.put(`/roles/${id}`, roleData)
  },

  deleteRole(id) {
    return axiosIns.delete(`/roles/${id}`)
  }
}