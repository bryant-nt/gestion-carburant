<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

// Données du formulaire (on les initialise vides)
const formData = ref({
  nomUtilisateur: '',
  prenomUtilisateur: '',
  emailUtilisateur: '',
  telephoneUtilisateur: '',
  adresseUtilisateur: ''
})

const photoFile = ref(null)
const photoPreview = ref(null)

// Mot de passe
const showPasswordDialog = ref(false)
const passwordData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordErrors = ref({})

const loading = ref(false)
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Fonction pour charger les données utilisateur
const loadUserData = async () => {
  // Si l'utilisateur n'est pas encore dans le store, on le récupère
  if (!authStore.user) {
    try {
      console.log('🔍 Utilisateur non présent, appel à fetchConnectedUser...')
      await authStore.fetchConnectedUser()
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error)
      showNotification('Erreur lors du chargement de vos informations', 'error')
      return
    }
  }

  // Récupérer les données utilisateur (attention : elles peuvent être dans user.user)
  const rawUser = authStore.user
  console.log('📦 Données brutes du store auth :', rawUser)

  // On essaie d'extraire les données réelles
  let userData = rawUser
  if (rawUser && rawUser.user) {
    // Si la structure a un champ "user", on l'utilise
    userData = rawUser.user
    console.log('✅ Données utilisateur extraites de user.user :', userData)
  } else {
    console.log('✅ Données utilisateur directement dans authStore.user :', userData)
  }

  if (userData) {
    formData.value.nomUtilisateur = userData.nomUtilisateur || ''
    formData.value.prenomUtilisateur = userData.prenomUtilisateur || ''
    formData.value.emailUtilisateur = userData.emailUtilisateur || ''
    formData.value.telephoneUtilisateur = userData.telephoneUtilisateur || ''
    formData.value.adresseUtilisateur = userData.adresseUtilisateur || ''

    if (userData.photoUtilisateur) {
      photoPreview.value = `http://localhost:8080/${userData.photoUtilisateur}`
    }
  } else {
    console.warn('⚠️ Aucune donnée utilisateur trouvée')
    showNotification('Impossible de charger vos informations', 'error')
  }
}

onMounted(() => {
  loadUserData()
})

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Upload photo
const onFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      showNotification('Veuillez sélectionner une image', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('L\'image ne doit pas dépasser 5MB', 'error')
      return
    }
    photoFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const uploadPhoto = async () => {
  if (!photoFile.value) return
  loading.value = true
  try {
    const formDataPhoto = new FormData()
    formDataPhoto.append('file', photoFile.value)
    await authStore.uploadProfilePhoto(formDataPhoto)
    showNotification('Photo mise à jour avec succès ! ✅', 'success')
    photoFile.value = null
    // Recharger les données utilisateur
    await authStore.fetchConnectedUser()
    // Recharger l'affichage
    await loadUserData()
  } catch (error) {
    showNotification('Erreur lors de l\'upload', 'error')
  } finally {
    loading.value = false
  }
}

// Mettre à jour le profil
const updateProfile = async () => {
  loading.value = true
  try {
    const data = {
      nomUtilisateur: formData.value.nomUtilisateur,
      prenomUtilisateur: formData.value.prenomUtilisateur,
      emailUtilisateur: formData.value.emailUtilisateur,
      telephoneUtilisateur: formData.value.telephoneUtilisateur,
      adresseUtilisateur: formData.value.adresseUtilisateur
    }
    await authStore.updateProfile(data)
    showNotification('Profil mis à jour avec succès ! ✅', 'success')
    // Recharger les données utilisateur après mise à jour
    await authStore.fetchConnectedUser()
    await loadUserData()
  } catch (error) {
    showNotification('Erreur lors de la mise à jour', 'error')
  } finally {
    loading.value = false
  }
}

// Changer le mot de passe
const validatePassword = () => {
  const errors = {}
  if (!passwordData.value.currentPassword) errors.currentPassword = 'Ancien mot de passe requis'
  if (!passwordData.value.newPassword || passwordData.value.newPassword.length < 6) {
    errors.newPassword = 'Nouveau mot de passe (min 6 caractères)'
  }
  if (passwordData.value.newPassword !== passwordData.value.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas'
  }
  passwordErrors.value = errors
  return Object.keys(errors).length === 0
}

const changePassword = async () => {
  if (!validatePassword()) return
  loading.value = true
  try {
    await authStore.changePassword({
      currentPassword: passwordData.value.currentPassword,
      newPassword: passwordData.value.newPassword
    })
    showNotification('Mot de passe modifié avec succès ! ✅', 'success')
    showPasswordDialog.value = false
    passwordData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (error) {
    showNotification(error.response?.data?.message || 'Erreur lors du changement', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Mon profil">
        <VCardSubtitle>Gérez vos informations personnelles</VCardSubtitle>

        <VCardText>
          <!-- Photo -->
          <div class="d-flex align-center mb-6">
            <VAvatar size="100" :image="photoPreview" color="primary" variant="tonal" class="me-4">
              <span v-if="!photoPreview" class="text-h3">
                {{ formData.prenomUtilisateur?.[0] }}{{ formData.nomUtilisateur?.[0] }}
              </span>
            </VAvatar>
            <div>
              <div class="text-caption text-medium-emphasis">Photo de profil</div>
              <div class="d-flex gap-2 mt-1">
                <VBtn size="small" variant="tonal" color="primary" @click="$refs.photoInput.click()">
                  <VIcon icon="bx-upload" size="16" class="me-1" />
                  Choisir
                </VBtn>
                <VBtn
                  v-if="photoFile"
                  size="small"
                  variant="tonal"
                  color="success"
                  :loading="loading"
                  @click="uploadPhoto"
                >
                  <VIcon icon="bx-check" size="16" class="me-1" />
                  Uploader
                </VBtn>
              </div>
              <input ref="photoInput" type="file" accept="image/*" class="d-none" @change="onFileChange" />
              <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
            </div>
          </div>

          <VForm @submit.prevent="updateProfile">
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.nomUtilisateur"
                  label="Nom"
                  placeholder="Votre nom"
                  :loading="loading"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.prenomUtilisateur"
                  label="Prénom"
                  placeholder="Votre prénom"
                  :loading="loading"
                />
              </VCol>
            </VRow>

            <VTextField
              v-model="formData.emailUtilisateur"
              label="Email"
              placeholder="Votre email"
              type="email"
              class="mt-4"
              :loading="loading"
            />

            <VTextField
              v-model="formData.telephoneUtilisateur"
              label="Téléphone"
              placeholder="Votre téléphone"
              class="mt-4"
              :loading="loading"
            />

            <VTextField
              v-model="formData.adresseUtilisateur"
              label="Adresse"
              placeholder="Votre adresse"
              class="mt-4"
              :loading="loading"
            />

            <div class="d-flex gap-2 mt-6">
              <VBtn type="submit" color="primary" :loading="loading">
                Enregistrer les modifications
              </VBtn>
              <VBtn color="secondary" variant="tonal" @click="$router.back()">
                Annuler
              </VBtn>
            </div>
          </VForm>

          <VDivider class="my-6" />

          <!-- Changer le mot de passe -->
          <div>
            <h4 class="text-h6 mb-2">Changer le mot de passe</h4>
            <VBtn color="warning" variant="tonal" @click="showPasswordDialog = true">
              <VIcon icon="bx-lock" size="16" class="me-1" />
              Modifier le mot de passe
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Dialogue de changement de mot de passe -->
    <VDialog v-model="showPasswordDialog" max-width="500" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Changer le mot de passe</VCardTitle>
          <VCardSubtitle>Saisissez vos mots de passe</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="changePassword">
            <VTextField
              v-model="passwordData.currentPassword"
              label="Ancien mot de passe"
              type="password"
              :error-messages="passwordErrors.currentPassword"
              :loading="loading"
              autofocus
            />
            <VTextField
              v-model="passwordData.newPassword"
              label="Nouveau mot de passe"
              type="password"
              :error-messages="passwordErrors.newPassword"
              :loading="loading"
              class="mt-4"
            />
            <VTextField
              v-model="passwordData.confirmPassword"
              label="Confirmer le nouveau mot de passe"
              type="password"
              :error-messages="passwordErrors.confirmPassword"
              :loading="loading"
              class="mt-4"
            />
            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showPasswordDialog = false" :disabled="loading">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="loading">
                Modifier
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top end" variant="flat">
      <VIcon :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'" size="24" class="me-2" />
      {{ snackbar.message }}
      <template #actions>
        <VBtn variant="text" icon="bx-x" @click="snackbar.show = false" />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>