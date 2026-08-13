<script setup>
import avatar1 from '@images/avatars/avatar-1.png'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

// On extrait les infos utilisateur depuis le store
// La réponse JSON a une racine et une propriété "user" imbriquée
const userDetails = computed(() => authStore.user?.user)

// Nom complet (Prénom + Nom)
const userFullName = computed(() => {
  if (!userDetails.value) return 'Utilisateur'
  return `${userDetails.value.prenomUtilisateur} ${userDetails.value.nomUtilisateur}`
})

// Rôle de l'utilisateur
const userRole = computed(() => userDetails.value?.role?.libelleRole || 'Utilisateur')

// Photo de profil (avec gestion du chemin relatif)
const userPhoto = computed(() => {
  if (!userDetails.value?.photoUtilisateur) return avatar1
  // ⚠️ Remplacez 'http://localhost:8080' par l'URL de base de votre backend (ou utilisez une variable d'environnement)
  return `http://localhost:8080/${userDetails.value.photoUtilisateur}`
})

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
      <!-- Ici on utilise la photo dynamique -->
      <VImg :src="userPhoto" />

      <!-- SECTION Menu -->
      <VMenu
        activator="parent"
        width="230"
        location="bottom end"
        offset="14px"
      >
        <VList>
          <!-- 👉 User Avatar & Name (MAINTENANT DYNAMIQUE) -->
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
                    <VImg :src="userPhoto" />
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
          <VListItem link>
            <template #prepend>
              <VIcon
                class="me-2"
                icon="bx-user"
                size="22"
              />
            </template>

            <VListItemTitle>Profile</VListItemTitle>
          </VListItem>

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