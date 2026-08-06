import axios from 'axios'

export const axiosIns = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 👉 Intercepteur de requête : injecte le token
axiosIns.interceptors.request.use(
  config => {
    const accessToken = localStorage.getItem('accessToken')

    if (accessToken)
      config.headers.Authorization = `Bearer ${accessToken}`

    return config
  },
  error => Promise.reject(error),
)

// 👉 Gestion du refresh token en cas de 401
let isRefreshing = false
let pendingQueue = []

const processQueue = (error, token = null) => {
  pendingQueue.forEach(p => {
    if (error)
      p.reject(error)
    else
      p.resolve(token)
  })
  pendingQueue = []
}

axiosIns.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // On ne tente pas de refresh sur les endpoints d'auth eux-mêmes
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login')
      || originalRequest?.url?.includes('/auth/refresh-token')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Si un refresh est déjà en cours, on met la requête en attente
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`

          return axiosIns(originalRequest)
        }).catch(err => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        isRefreshing = false

        // Pas de refresh token disponible → on force la déconnexion
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'

        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
        )

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        axiosIns.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`

        processQueue(null, data.accessToken)

        return axiosIns(originalRequest)
      }
      catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
      finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default function (app) {
  app.config.globalProperties.$api = axiosIns
}