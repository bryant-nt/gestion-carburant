import { axiosIns } from '@/plugins/axios'

export const authService = {
  login(emailUtilisateur, motDePasse) {
    console.log('BASE URL =', import.meta.env.VITE_API_BASE_URL)
    return axiosIns.post('/auth/login', { emailUtilisateur, motDePasse })
  },

  refreshToken(refreshToken) {
    return axiosIns.post('/auth/refresh-token', { refreshToken })
  },

  getConnectedUserData() {
    return axiosIns.get('/auth/get-connected-user-data')
  },

  forgotPassword(email) {
    return axiosIns.post('/auth/forgot-password', null, { params: { email } })
  },

  resetPassword(token, newPassword) {
    return axiosIns.post('/auth/reset-password', null, {
      params: { token, newPassword },
    })
  },
}