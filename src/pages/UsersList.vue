<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useUsersStore } from '@/stores/users'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

// --- Gestion des photos protégées (JWT via Axios) -----------------------
const photoUrlCache = reactive(new Map())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return

  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
    console.log('✅ Photo protégée chargée pour ID', id)
  } catch (error) {
    console.error('❌ Impossible de charger la photo protégée pour ID', id, error)
    brokenPhotos.value.add(id)
  }
}

const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}

const loadPhotosInBatches = async (items, batchSize = 3) => {
  const tasks = []
  for (const item of items) {
    if (item.photoUtilisateur) {
      tasks.push(loadAuthenticatedPhoto(`user-${item.utilisateurId}`, item.photoUtilisateur))
    }
  }

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    await Promise.all(batch)
  }
}

const brokenPhotos = ref(new Set())
const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}
// -----------------------------------------------------------------------

// Initialisation des stores
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  utilisateurId: null,
  nomUtilisateur: '',
  prenomUtilisateur: '',
  emailUtilisateur: '',
  telephoneUtilisateur: '',
  adresseUtilisateur: '',
  statutUtilisateur: 'actif',
  idRole: null,
  motDePasse: '',
  photoUtilisateur: null,
  photoFile: null
})
const formErrors = ref({})
const isSubmitting = ref(false)
const photoPreview = ref(null)

// État du dialogue de confirmation
const showConfirmDialog = ref(false)
const confirmAction = ref(null)
const userToConfirm = ref(null)

// État du snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const searchQuery = ref('')
const filterRole = ref(null)
const filterStatus = ref(null)

// Computed
const users = computed(() => usersStore.users)
const roles = computed(() => rolesStore.roles)
const loading = computed(() => usersStore.loading || rolesStore.loading)

// Options pour les roles
const roleOptions = computed(() => {
  return roles.value.map(role => ({
    title: role.libelleRole,
    value: role.idRole
  }))
})

const statusOptions = [
  { title: 'Actif', value: 'actif' },
  { title: 'Inactif', value: 'inactif' }
]

// Filtrer les utilisateurs
const filteredUsers = computed(() => {
  let result = users.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(user => 
      user.nomUtilisateur?.toLowerCase().includes(query) ||
      user.prenomUtilisateur?.toLowerCase().includes(query) ||
      user.emailUtilisateur?.toLowerCase().includes(query)
    )
  }
  
  if (filterRole.value) {
    result = result.filter(user => user.role?.idRole === filterRole.value)
  }
  
  if (filterStatus.value) {
    result = result.filter(user => user.statutUtilisateur === filterStatus.value)
  }
  
  return result
})

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      usersStore.fetchUsers(),
      rolesStore.fetchRoles()
    ])

    // Charger les photos des utilisateurs
    await loadPhotosInBatches(users.value, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur lors du chargement des données:', error)
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    utilisateurId: null,
    nomUtilisateur: '',
    prenomUtilisateur: '',
    emailUtilisateur: '',
    telephoneUtilisateur: '',
    adresseUtilisateur: '',
    statutUtilisateur: 'actif',
    idRole: null,
    motDePasse: '',
    photoUtilisateur: null,
    photoFile: null
  }
  photoPreview.value = null
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = async (user) => {
  isEditing.value = true
  formData.value = {
    utilisateurId: user.utilisateurId,
    nomUtilisateur: user.nomUtilisateur || '',
    prenomUtilisateur: user.prenomUtilisateur || '',
    emailUtilisateur: user.emailUtilisateur || '',
    telephoneUtilisateur: user.telephoneUtilisateur || '',
    adresseUtilisateur: user.adresseUtilisateur || '',
    statutUtilisateur: user.statutUtilisateur || 'actif',
    idRole: user.role?.idRole || null,
    motDePasse: '',
    photoUtilisateur: user.photoUtilisateur || null,
    photoFile: null
  }

  // Charger la photo existante pour l'aperçu
  if (user.photoUtilisateur) {
    const cacheKey = `user-${user.utilisateurId}`
    if (photoUrlCache.has(cacheKey)) {
      photoPreview.value = photoUrlCache.get(cacheKey)
    } else {
      photoPreview.value = null
      await loadAuthenticatedPhoto(cacheKey, user.photoUtilisateur)
        .then(() => {
          photoPreview.value = photoUrlCache.get(cacheKey) || null
        })
    }
  } else {
    photoPreview.value = null
  }

  formErrors.value = {}
  showDialog.value = true
}

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
    formData.value.photoFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  formData.value.photoFile = null
  photoPreview.value = null
  const fileInput = document.getElementById('photoInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

const validateForm = () => {
  const errors = {}
  
  if (!formData.value.nomUtilisateur || formData.value.nomUtilisateur.trim() === '') {
    errors.nomUtilisateur = 'Le nom est requis'
  }
  
  if (!formData.value.prenomUtilisateur || formData.value.prenomUtilisateur.trim() === '') {
    errors.prenomUtilisateur = 'Le prénom est requis'
  }
  
  if (!formData.value.emailUtilisateur || formData.value.emailUtilisateur.trim() === '') {
    errors.emailUtilisateur = 'L\'email est requis'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.emailUtilisateur)) {
    errors.emailUtilisateur = 'Email invalide'
  }
  
  if (!formData.value.idRole) {
    errors.idRole = 'Le rôle est requis'
  }
  
  if (!isEditing.value && (!formData.value.motDePasse || formData.value.motDePasse.length < 6)) {
    errors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveUser = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const userData = {
      nomUtilisateur: formData.value.nomUtilisateur.trim(),
      prenomUtilisateur: formData.value.prenomUtilisateur.trim(),
      emailUtilisateur: formData.value.emailUtilisateur.trim(),
      telephoneUtilisateur: formData.value.telephoneUtilisateur?.trim() || '',
      adresseUtilisateur: formData.value.adresseUtilisateur?.trim() || '',
      statutUtilisateur: formData.value.statutUtilisateur === 'actif',
      idRole: formData.value.idRole
    }
    
    // Upload de la photo si un fichier est sélectionné
    let photoPath = null
    if (formData.value.photoFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('file', formData.value.photoFile)
      try {
        const response = await usersStore.uploadPhoto(formDataPhoto)
        photoPath = response?.photoUtilisateur
      } catch (photoError) {
        console.error('Erreur lors de l\'upload de la photo:', photoError)
        showNotification('Erreur lors de l\'upload de la photo', 'error')
      }
    }

    if (!isEditing.value) {
      userData.motDePasse = formData.value.motDePasse
      const response = await usersStore.createUser(userData)
      // Si l'upload a réussi et que le user est créé, on met à jour la photo (selon l'API)
      if (photoPath && response.utilisateurId) {
        // Mettre à jour l'utilisateur avec le chemin de la photo
        await usersStore.updateUser(response.utilisateurId, { ...userData, photoUtilisateur: photoPath })
      }
      showNotification('Utilisateur créé avec succès ! ✅', 'success')
    } else {
      if (photoPath) {
        userData.photoUtilisateur = photoPath
      }
      await usersStore.updateUser(formData.value.utilisateurId, userData)
      showNotification('Utilisateur modifié avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadData()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.emailUtilisateur = 'Cet email est déjà utilisé'
      showNotification('Cet email est déjà utilisé !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'utilisateur', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDeactivate = (user) => {
  userToConfirm.value = user
  confirmAction.value = 'deactivate'
  showConfirmDialog.value = true
}

const confirmDelete = (user) => {
  userToConfirm.value = user
  confirmAction.value = 'delete'
  showConfirmDialog.value = true
}

const executeAction = async () => {
  if (!userToConfirm.value) return
  
  try {
    if (confirmAction.value === 'deactivate') {
      await usersStore.deactivateUser(userToConfirm.value.utilisateurId)
      showNotification(`Utilisateur désactivé avec succès ! 🔒`, 'success')
    } else if (confirmAction.value === 'delete') {
      await usersStore.deleteUser(userToConfirm.value.utilisateurId)
      showNotification(`Utilisateur supprimé avec succès ! 🗑️`, 'success')
    }
    
    showConfirmDialog.value = false
    userToConfirm.value = null
    await loadData()
  } catch (error) {
    console.error('Erreur lors de l\'action:', error)
    showNotification('Erreur lors de l\'opération', 'error')
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  filterRole.value = null
  filterStatus.value = null
}

// Charger les données au montage
onMounted(() => {
  loadData()
})

// Libérer la mémoire des Object URLs au démontage
onUnmounted(() => {
  revokeAllPhotoUrls()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion des utilisateurs">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
          >
            Ajouter un utilisateur
          </VBtn>
        </template>

        <!-- Filtres -->
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Nom, prénom ou email"
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterRole"
                label="Rôle"
                :items="roleOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les rôles"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterStatus"
                label="Statut"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn
                color="secondary"
                variant="tonal"
                @click="resetFilters"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des utilisateurs -->
        <VTable>
          <thead>
            <tr>
              <th class="text-uppercase text-center">
                N°
              </th>
              <th>
                Photo
              </th>
              <th>
                Nom complet
              </th>
              <th>
                Email
              </th>
              <th>
                Téléphone
              </th>
              <th>
                Rôle
              </th>
              <th>
                Unité
              </th>
              <th class="text-center">
                Statut
              </th>
              <th class="text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="9" class="text-center pa-4 text-medium-emphasis">
                Aucun utilisateur trouvé
              </td>
            </tr>
            <tr
              v-for="(user, index) in filteredUsers"
              :key="user.utilisateurId"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="32"
                  :color="(!photoUrlCache.get('user-' + user.utilisateurId) || brokenPhotos.has('user-' + user.utilisateurId)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('user-' + user.utilisateurId) || brokenPhotos.has('user-' + user.utilisateurId)) ? 'tonal' : undefined"
                >
                  <VImg
                    v-if="photoUrlCache.get('user-' + user.utilisateurId) && !brokenPhotos.has('user-' + user.utilisateurId)"
                    :src="photoUrlCache.get('user-' + user.utilisateurId)"
                    cover
                    @error="onPhotoError('user-' + user.utilisateurId)"
                  />
                  <span v-else class="text-caption font-weight-medium">
                    {{ user.prenomUtilisateur?.[0] }}{{ user.nomUtilisateur?.[0] }}
                  </span>
                </VAvatar>
              </td>
              <td>
                <div>
                  <div class="font-weight-medium">
                    {{ user.prenomUtilisateur }} {{ user.nomUtilisateur }}
                  </div>
                </div>
              </td>
              <td>
                {{ user.emailUtilisateur }}
              </td>
              <td>
                {{ user.telephoneUtilisateur || '-' }}
              </td>
              <td>
                <VChip
                  size="small"
                  label
                  color="primary"
                >
                  {{ user.role?.libelleRole || '-' }}
                </VChip>
              </td>
              <td>
                {{ user.uniteOrganisationnelles?.libelleUnite || '-' }}
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="user.statutUtilisateur === 'actif' ? 'success' : 'error'"
                >
                  {{ user.statutUtilisateur === 'actif' ? 'Actif' : 'Inactif' }}
                </VChip>
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(user)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  v-if="user.statutUtilisateur === 'actif'"
                  icon
                  variant="text"
                  size="small"
                  color="warning"
                  @click="confirmDeactivate(user)"
                >
                  <VIcon size="20" icon="bx-pause-circle" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(user)"
                >
                  <VIcon size="20" icon="bx-trash" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <!-- Dialogue d'ajout/édition -->
    <VDialog
      v-model="showDialog"
      max-width="600"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle>
            {{ isEditing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'utilisateur' : 'Saisissez les informations du nouvel utilisateur' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveUser">
            <!-- Photo de profil -->
            <div class="d-flex align-center mb-4">
              <VAvatar
                size="80"
                :color="!photoPreview ? 'primary' : undefined"
                :variant="!photoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="photoPreview" :src="photoPreview" cover />
                <span v-else class="text-h4">
                  {{ formData.prenomUtilisateur?.[0] }}{{ formData.nomUtilisateur?.[0] }}
                </span>
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo de profil</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="$refs.fileInput.click()"
                  >
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn
                    v-if="photoPreview"
                    size="small"
                    variant="tonal"
                    color="error"
                    @click="removePhoto"
                  >
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input
                  ref="fileInput"
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="onFileChange"
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  JPG, PNG ou GIF (max 5MB)
                </div>
              </div>
            </div>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.nomUtilisateur"
                  label="Nom"
                  placeholder="Ex: Dupont"
                  :error-messages="formErrors.nomUtilisateur"
                  :loading="isSubmitting"
                  autofocus
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.prenomUtilisateur"
                  label="Prénom"
                  placeholder="Ex: Jean"
                  :error-messages="formErrors.prenomUtilisateur"
                  :loading="isSubmitting"
                />
              </VCol>
            </VRow>

            <VTextField
              v-model="formData.emailUtilisateur"
              label="Email"
              placeholder="Ex: jean.dupont@example.com"
              :error-messages="formErrors.emailUtilisateur"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VTextField
              v-model="formData.telephoneUtilisateur"
              label="Téléphone"
              placeholder="Ex: +243900000001"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VTextField
              v-model="formData.adresseUtilisateur"
              label="Adresse"
              placeholder="Ex: Kinshasa, Gombe"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idRole"
              label="Rôle"
              :items="roleOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un rôle"
              :error-messages="formErrors.idRole"
              :loading="loading"
              class="mt-4"
            />

            <VSelect
              v-model="formData.statutUtilisateur"
              label="Statut"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un statut"
              class="mt-4"
            />

            <VTextField
              v-if="!isEditing"
              v-model="formData.motDePasse"
              label="Mot de passe"
              placeholder="Minimum 6 caractères"
              type="password"
              :error-messages="formErrors.motDePasse"
              :loading="isSubmitting"
              class="mt-4"
            />

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="showDialog = false"
                :disabled="isSubmitting"
              >
                Annuler
              </VBtn>
              <VBtn
                type="submit"
                color="primary"
                :loading="isSubmitting"
                :disabled="isSubmitting"
              >
                {{ isEditing ? 'Modifier' : 'Ajouter' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de confirmation -->
    <VDialog
      v-model="showConfirmDialog"
      max-width="420"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle :class="confirmAction === 'delete' ? 'text-error' : 'text-warning'">
            {{ confirmAction === 'delete' ? 'Confirmer la suppression' : 'Confirmer la désactivation' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ confirmAction === 'delete' ? 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?' : 'Êtes-vous sûr de vouloir désactiver cet utilisateur ?' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de {{ confirmAction === 'delete' ? 'supprimer' : 'désactiver' }} l'utilisateur
            <strong class="text-high-emphasis">
              "{{ userToConfirm?.prenomUtilisateur }} {{ userToConfirm?.nomUtilisateur }}"
            </strong>.
          </p>
          <p v-if="confirmAction === 'delete'" class="text-error text-caption">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            Cette action est irréversible.
          </p>
          <p v-else class="text-warning text-caption">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            L'utilisateur ne pourra plus se connecter.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-end gap-2 pa-4">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="showConfirmDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            :color="confirmAction === 'delete' ? 'error' : 'warning'"
            @click="executeAction"
          >
            {{ confirmAction === 'delete' ? 'Supprimer' : 'Désactiver' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top end"
      variant="flat"
    >
      <VIcon
        :icon="snackbar.color === 'success' ? 'bx-check-circle' : snackbar.color === 'warning' ? 'bx-error-circle' : 'bx-x-circle'"
        size="24"
        class="me-2"
      />
      {{ snackbar.message }}
      
      <template #actions>
        <VBtn
          variant="text"
          icon="bx-x"
          @click="snackbar.show = false"
        />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
</style>