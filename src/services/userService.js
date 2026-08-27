import { axiosIns } from '@/plugins/axios'

export const userService = {

  getUsers() {
    return axiosIns.get('/users')
  },

  getUserById(id) {
    return axiosIns.get(`/users/${id}`)
  },

  createUser(userData) {
    return axiosIns.post('/users', userData)
  },

  updateUser(id, userData) {
    return axiosIns.put(`/users/${id}`, userData)
  },

  deactivateUser(id) {
    return axiosIns.post(`/users/${id}/deactivate`)
  },

  deleteUser(id) {
    return axiosIns.delete(`/users/${id}`)
  },

  updateProfile(userData) {
    return axiosIns.put('/users/update-profile', userData)
  },

  uploadPhoto(formData) {
    return axiosIns.post('/users/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // ⬇️ NOUVEAU : Changer le mot de passe
  changePassword(passwordData) {
    return axiosIns.post('/users/change-password', passwordData)
  }
}