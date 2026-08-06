import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isPublic = to.matched.some(record => record.meta.public)

  if (!isPublic && !authStore.isAuthenticated) {
    // Route protégée + pas connecté → redirection login
    next({ path: '/login', query: { redirect: to.fullPath } })
  }
  else if (to.path === '/login' && authStore.isAuthenticated) {
    // Déjà connecté → pas besoin de revoir le login
    next({ path: '/dashboard' })
  }
  else {
    next()
  }
})

export default function (app) {
  app.use(router)
}
export { router }