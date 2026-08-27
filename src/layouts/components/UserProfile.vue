<script setup>
import avatar1 from '@images/avatars/avatar-1.png'
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// --- Gestion des photos protégées (JWT via Axios) -----------------------
// Cache pour une seule photo (l'utilisateur courant)
const photoUrlCache = reactive(new Map())
const brokenPhotos = ref(new Set())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return

  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
    console.log('✅ Photo utilisateur chargée')
  } catch (error) {
    console.error('❌ Impossible de charger la photo utilisateur', error)
    brokenPhotos.value.add(id)
  }
}

const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}
// -----------------------------------------------------------------------

// On extrait les infos utilisateur depuis le store
const userDetails = computed(() => authStore.user?.user)

// Nom complet (Prénom + Nom)
const userFullName = computed(() => {
  if (!userDetails.value) return 'Utilisateur'
  return `${userDetails.value.prenomUtilisateur} ${userDetails.value.nomUtilisateur}`
})

// Rôle de l'utilisateur
const userRole = computed(() => userDetails.value?.role?.libelleRole || 'Utilisateur')

// URL de la photo (soit du cache, soit avatar par défaut)
const userPhotoUrl = ref(avatar1)

// Charger la photo quand l'utilisateur change
watch(userDetails, async (newUser) => {
  if (newUser?.photoUtilisateur) {
    const cacheKey = `user-${newUser.utilisateurId}`
    // Vérifier si déjà dans le cache
    if (photoUrlCache.has(cacheKey)) {
      userPhotoUrl.value = photoUrlCache.get(cacheKey)
    } else {
      // Charger via axios
      await loadAuthenticatedPhoto(cacheKey, newUser.photoUtilisateur)
      if (photoUrlCache.has(cacheKey)) {
        userPhotoUrl.value = photoUrlCache.get(cacheKey)
      } else {
        // En cas d'échec, fallback sur avatar1
        userPhotoUrl.value = avatar1
      }
    }
  } else {
    userPhotoUrl.value = avatar1
  }
}, { immediate: true })

// Nettoyer les URLs au démontage
onUnmounted(() => {
  revokeAllPhotoUrls()
})

// Gestion de la déconnexion
const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <VBadge
    dot
    location="bottom right"
    offset-x="3"
    offset-y="3"
    color="success"
    bordered
  >
    <VAvatar
      class="cursor-pointer"
      color="primary"
      variant="tonal"
    >
      <!-- Ici on utilise la photo dynamique depuis le cache -->
      <VImg :src="userPhotoUrl" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name -->
          <VListItem>
            <template #prepend>
              <VListItemAction start>
                <VBadge
                  dot
                  location="bottom right"
                  offset-x="3"
                  offset-y="3"
                  color="success"
                >
                  <VAvatar
                    color="primary"
                    variant="tonal"
                  >
                    <VImg :src="userPhotoUrl" />
                  </VAvatar>
                </VBadge>
              </VListItemAction>
            </template>

            <VListItemTitle class="font-weight-semibold">
              {{ userFullName }}
            </VListItemTitle>
            <VListItemSubtitle>{{ userRole }}</VListItemSubtitle>
          </VListItem>
          <VDivider class="my-2" />

          <!-- 👉 Profile -->
          <RouterLink to="/profile" style="text-decoration: none; color: inherit;">
            <VListItem>
              <template #prepend>
                <VIcon class="me-2" icon="bx-user" size="22" />
              </template>
              <VListItemTitle>Profile</VListItemTitle>
            </VListItem>
          </RouterLink>

          <!-- Divider -->
          <VDivider class="my-2" />

          <!-- 👉 Logout -->
          <VListItem @click="handleLogout">
            <template #prepend>
              <VIcon class="me-2" icon="bx-log-out" size="22" />
            </template>

            <VListItemTitle>Logout</VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
      <!-- !SECTION -->
    </VAvatar>
  </VBadge>
</template>