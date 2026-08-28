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

// Statistiques d'en-tête
const totalUsers = computed(() => users.value.length)
const activeUsersCount = computed(() => users.value.filter(u => u.statutUtilisateur === 'actif').length)
const inactiveUsersCount = computed(() => totalUsers.value - activeUsersCount.value)

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

const hasActiveFilters = computed(() =>
  !!searchQuery.value || !!filterRole.value || !!filterStatus.value
)

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

// Couleur de rôle stable (dérivée du libellé, pas aléatoire)
const roleColorPalette = ['primary', 'info', 'success', 'warning', 'secondary', 'error']
const roleColor = (roleLabel) => {
  if (!roleLabel) return 'secondary'
  let hash = 0
  for (let i = 0; i < roleLabel.length; i++) {
    hash = roleLabel.charCodeAt(i) + ((hash << 5) - hash)
  }
  return roleColorPalette[Math.abs(hash) % roleColorPalette.length]
}

const initials = (user) => `${user.prenomUtilisateur?.[0] || ''}${user.nomUtilisateur?.[0] || ''}`.toUpperCase()

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
    <!-- En-tête + statistiques -->
    <VCol cols="12">
      <VCard class="users-header-card" flat>
        <VCardText class="d-flex flex-wrap align-center justify-space-between gap-4">
          <div class="d-flex align-center gap-3">
            <VAvatar size="48" color="primary" variant="tonal" rounded="lg">
              <VIcon icon="bx-group" size="26" />
            </VAvatar>
            <div>
              <h5 class="text-h5 font-weight-medium mb-0">
                Gestion des utilisateurs
              </h5>
              <span class="text-body-2 text-medium-emphasis">
                Comptes, rôles et accès de la plateforme
              </span>
            </div>
          </div>

          <div class="d-flex flex-wrap align-center gap-3">
            <div class="stat-pill">
              <span class="stat-pill__value">{{ totalUsers }}</span>
              <span class="stat-pill__label">Total</span>
            </div>
            <div class="stat-pill stat-pill--success">
              <span class="stat-pill__value">{{ activeUsersCount }}</span>
              <span class="stat-pill__label">Actifs</span>
            </div>
            <div class="stat-pill stat-pill--error">
              <span class="stat-pill__value">{{ inactiveUsersCount }}</span>
              <span class="stat-pill__label">Inactifs</span>
            </div>

            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter un utilisateur
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Filtres -->
    <VCol cols="12">
      <VCard flat>
        <VCardText>
          <VRow align="center">
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Nom, prénom ou email"
                density="compact"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
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
                prepend-inner-icon="bx-shield-quarter"
                variant="outlined"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStatus"
                label="Statut"
                :items="statusOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les statuts"
                prepend-inner-icon="bx-toggle-left"
                variant="outlined"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2" class="d-flex justify-end">
              <VBtn
                color="secondary"
                variant="tonal"
                prepend-icon="bx-reset"
                :disabled="!hasActiveFilters"
                block
                @click="resetFilters"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <VDivider />

        <!-- Tableau des utilisateurs -->
        <VTable class="users-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center" style="width: 56px;">
                N°
              </th>
              <th style="width: 64px;">
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
              <th class="text-center" style="width: 140px;">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-8">
                <VProgressCircular indeterminate color="primary" size="32" />
                <div class="text-body-2 text-medium-emphasis mt-2">
                  Chargement des utilisateurs…
                </div>
              </td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="9" class="text-center pa-8">
                <VIcon icon="bx-user-x" size="40" class="text-disabled mb-2" />
                <div class="text-body-1 font-weight-medium">
                  Aucun utilisateur trouvé
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  Essayez d'ajuster votre recherche ou vos filtres
                </div>
              </td>
            </tr>
            <tr
              v-for="(user, index) in filteredUsers"
              :key="user.utilisateurId"
              class="users-table__row"
            >
              <td class="text-center text-medium-emphasis">
                {{ index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="36"
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
                    {{ initials(user) }}
                  </span>
                </VAvatar>
              </td>
              <td>
                <div class="font-weight-medium">
                  {{ user.prenomUtilisateur }} {{ user.nomUtilisateur }}
                </div>
              </td>
              <td class="text-medium-emphasis">
                {{ user.emailUtilisateur }}
              </td>
              <td class="text-medium-emphasis">
                {{ user.telephoneUtilisateur || '—' }}
              </td>
              <td>
                <VChip
                  size="small"
                  label
                  :color="roleColor(user.role?.libelleRole)"
                  variant="tonal"
                >
                  {{ user.role?.libelleRole || '—' }}
                </VChip>
              </td>
              <td class="text-medium-emphasis">
                {{ user.uniteOrganisationnelles?.libelleUnite || '—' }}
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="user.statutUtilisateur === 'actif' ? 'success' : 'error'"
                  variant="tonal"
                >
                  <VIcon
                    :icon="user.statutUtilisateur === 'actif' ? 'bx-check-circle' : 'bx-x-circle'"
                    size="14"
                    start
                  />
                  {{ user.statutUtilisateur === 'actif' ? 'Actif' : 'Inactif' }}
                </VChip>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <VTooltip text="Modifier">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="primary"
                        @click="openEditDialog(user)"
                      >
                        <VIcon size="20" icon="bx-edit" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip v-if="user.statutUtilisateur === 'actif'" text="Désactiver">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="warning"
                        @click="confirmDeactivate(user)"
                      >
                        <VIcon size="20" icon="bx-pause-circle" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip text="Supprimer">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click="confirmDelete(user)"
                      >
                        <VIcon size="20" icon="bx-trash" />
                      </VBtn>
                    </template>
                  </VTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>

        <VCardText v-if="!loading && filteredUsers.length > 0" class="text-body-2 text-medium-emphasis py-3">
          {{ filteredUsers.length }} utilisateur(s) affiché(s) sur {{ totalUsers }}
        </VCardText>
      </VCard>
    </VCol>

    <!-- Dialogue d'ajout/édition -->
    <VDialog
      v-model="showDialog"
      max-width="640"
      persistent
    >
      <VCard>
        <VCardItem class="dialog-header">
          <VCardTitle class="d-flex align-center gap-2">
            <VIcon :icon="isEditing ? 'bx-edit' : 'bx-user-plus'" size="20" />
            {{ isEditing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'utilisateur' : 'Saisissez les informations du nouvel utilisateur' }}
          </VCardSubtitle>
        </VCardItem>

        <VDivider />

        <VCardText class="pt-5">
          <VForm @submit.prevent="saveUser">
            <!-- Photo de profil -->
            <div class="d-flex align-center mb-6">
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
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                  Photo de profil
                </div>
                <div class="d-flex gap-2 mt-2">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="bx-upload"
                    @click="$refs.fileInput.click()"
                  >
                    Choisir
                  </VBtn>
                  <VBtn
                    v-if="photoPreview"
                    size="small"
                    variant="tonal"
                    color="error"
                    prepend-icon="bx-trash"
                    @click="removePhoto"
                  >
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

            <!-- Informations personnelles -->
            <div class="form-section-label">
              <VIcon icon="bx-id-card" size="16" />
              Informations personnelles
            </div>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.nomUtilisateur"
                  label="Nom"
                  placeholder="Ex: Dupont"
                  variant="outlined"
                  density="comfortable"
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
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.prenomUtilisateur"
                  :loading="isSubmitting"
                />
              </VCol>
            </VRow>

            <!-- Coordonnées -->
            <div class="form-section-label mt-2">
              <VIcon icon="bx-envelope" size="16" />
              Coordonnées
            </div>
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="formData.emailUtilisateur"
                  label="Email"
                  placeholder="Ex: jean.dupont@example.com"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.emailUtilisateur"
                  :loading="isSubmitting"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.telephoneUtilisateur"
                  label="Téléphone"
                  placeholder="Ex: +257 00 00 00 01"
                  variant="outlined"
                  density="comfortable"
                  :loading="isSubmitting"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.adresseUtilisateur"
                  label="Adresse"
                  placeholder="Ex: Bujumbura, Rohero"
                  variant="outlined"
                  density="comfortable"
                  :loading="isSubmitting"
                />
              </VCol>
            </VRow>

            <!-- Rôle et statut -->
            <div class="form-section-label mt-2">
              <VIcon icon="bx-shield-quarter" size="16" />
              Rôle et accès
            </div>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="formData.idRole"
                  label="Rôle"
                  :items="roleOptions"
                  item-title="title"
                  item-value="value"
                  placeholder="Sélectionner un rôle"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.idRole"
                  :loading="loading"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="formData.statutUtilisateur"
                  label="Statut"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  placeholder="Sélectionner un statut"
                  variant="outlined"
                  density="comfortable"
                />
              </VCol>
            </VRow>

            <!-- Sécurité -->
            <template v-if="!isEditing">
              <div class="form-section-label mt-2">
                <VIcon icon="bx-lock-alt" size="16" />
                Sécurité
              </div>
              <VTextField
                v-model="formData.motDePasse"
                label="Mot de passe"
                placeholder="Minimum 6 caractères"
                type="password"
                variant="outlined"
                density="comfortable"
                :error-messages="formErrors.motDePasse"
                :loading="isSubmitting"
              />
            </template>

            <VDivider class="mt-4 mb-4" />

            <div class="d-flex justify-end gap-2">
              <VBtn
                variant="tonal"
                color="secondary"
                :disabled="isSubmitting"
                @click="showDialog = false"
              >
                Annuler
              </VBtn>
              <VBtn
                type="submit"
                color="primary"
                :loading="isSubmitting"
                :disabled="isSubmitting"
              >
                {{ isEditing ? 'Enregistrer les modifications' : 'Ajouter l\'utilisateur' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de confirmation -->
    <VDialog
      v-model="showConfirmDialog"
      max-width="440"
      persistent
    >
      <VCard>
        <VCardText class="text-center pt-8">
          <VAvatar
            size="56"
            :color="confirmAction === 'delete' ? 'error' : 'warning'"
            variant="tonal"
            class="mb-4"
          >
            <VIcon
              :icon="confirmAction === 'delete' ? 'bx-trash' : 'bx-pause-circle'"
              size="28"
            />
          </VAvatar>

          <h6 class="text-h6 mb-1">
            {{ confirmAction === 'delete' ? 'Confirmer la suppression' : 'Confirmer la désactivation' }}
          </h6>

          <p class="text-medium-emphasis mb-1">
            Vous êtes sur le point de {{ confirmAction === 'delete' ? 'supprimer' : 'désactiver' }} l'utilisateur
            <strong class="text-high-emphasis">
              {{ userToConfirm?.prenomUtilisateur }} {{ userToConfirm?.nomUtilisateur }}
            </strong>.
          </p>

          <p v-if="confirmAction === 'delete'" class="text-error text-caption d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            Cette action est irréversible.
          </p>
          <p v-else class="text-warning text-caption d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            L'utilisateur ne pourra plus se connecter.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
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
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }

.users-header-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  padding: 6px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.08);
}

.stat-pill__value {
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
}

.stat-pill--success {
  background: rgba(var(--v-theme-success), 0.08);
}
.stat-pill--success .stat-pill__value {
  color: rgb(var(--v-theme-success));
}

.stat-pill--error {
  background: rgba(var(--v-theme-error), 0.08);
}
.stat-pill--error .stat-pill__value {
  color: rgb(var(--v-theme-error));
}

.stat-pill__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.users-table :deep(th) {
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.users-table__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.dialog-header {
  padding-bottom: 12px;
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.55);
  margin-bottom: 12px;
}
</style>