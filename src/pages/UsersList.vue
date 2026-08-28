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

// Stores
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const authStore = useAuthStore()

// Dialog state
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

// Confirmation dialog
const showConfirmDialog = ref(false)
const confirmAction = ref(null)
const userToConfirm = ref(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filters
const searchQuery = ref('')
const filterRole = ref(null)
const filterStatus = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed
const users = computed(() => usersStore.users)
const roles = computed(() => rolesStore.roles)
const loading = computed(() => usersStore.loading || rolesStore.loading)

// Stats
const totalUsers = computed(() => users.value.length)
const activeUsersCount = computed(() => users.value.filter(u => u.statutUtilisateur === 'actif').length)
const inactiveUsersCount = computed(() => totalUsers.value - activeUsersCount.value)

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

// Filtered users
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

// Paginated users
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUsers.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage.value))

// Role color
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

// Methods
const loadData = async () => {
  try {
    await Promise.all([
      usersStore.fetchUsers(),
      rolesStore.fetchRoles()
    ])
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
  currentPage.value = 1
}

const changePage = (page) => {
  currentPage.value = page
}

// Lifecycle
onMounted(() => {
  loadData()
})

onUnmounted(() => {
  revokeAllPhotoUrls()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des utilisateurs</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Gérez les comptes, rôles et accès de la plateforme
          </p>
        </div>
        <VBtn color="primary" size="large" prepend-icon="bx-plus" @click="openCreateDialog" elevation="2">
          Ajouter un utilisateur
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-group" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total utilisateurs
                </div>
                <div class="text-h4 font-weight-bold">{{ totalUsers }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-check-circle" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Actifs
                </div>
                <div class="text-h4 font-weight-bold">{{ activeUsersCount }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="error" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-error-light pa-3 me-4">
                <VIcon icon="bx-x-circle" size="28" color="error" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Inactifs
                </div>
                <div class="text-h4 font-weight-bold">{{ inactiveUsersCount }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <VCardItem class="border-bottom">
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 w-100">
            <VCardTitle class="text-h6 font-weight-semibold">
              Liste des utilisateurs
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredUsers.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn variant="text" icon="bx-refresh" size="small" @click="loadData" :loading="loading" />
            </div>
          </div>
        </VCardItem>

        <!-- Filters -->
        <VCardText class="pt-4 pb-2">
          <VRow>
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Nom, prénom ou email"
                density="comfortable"
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
                clearable
                density="comfortable"
                variant="outlined"
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
                clearable
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="3" class="d-flex align-center gap-2">
              <VBtn
                color="primary"
                variant="flat"
                @click="resetFilters"
                class="flex-grow-1"
                :disabled="!hasActiveFilters"
              >
                <VIcon icon="bx-undo" size="20" class="me-1" />
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Table -->
        <VTable class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width: 60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width: 60px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Nom complet</th>
              <th class="text-uppercase text-caption font-weight-bold">Email</th>
              <th class="text-uppercase text-caption font-weight-bold">Téléphone</th>
              <th class="text-uppercase text-caption font-weight-bold">Rôle</th>
              <th class="text-uppercase text-caption font-weight-bold">Unité</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Statut</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des utilisateurs…</div>
              </td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="9" class="text-center pa-8">
                <VIcon icon="bx-user-x" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">Aucun utilisateur trouvé</div>
                <p class="text-caption text-medium-emphasis">Ajustez vos filtres ou ajoutez un nouvel utilisateur</p>
              </td>
            </tr>
            <tr v-for="(user, index) in paginatedUsers" :key="user.utilisateurId" class="table-row">
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
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
                  <span v-else class="text-caption font-weight-medium">{{ initials(user) }}</span>
                </VAvatar>
              </td>
              <td>
                <div class="font-weight-medium">{{ user.prenomUtilisateur }} {{ user.nomUtilisateur }}</div>
              </td>
              <td class="text-medium-emphasis">{{ user.emailUtilisateur }}</td>
              <td class="text-medium-emphasis">{{ user.telephoneUtilisateur || '—' }}</td>
              <td>
                <VChip size="small" label :color="roleColor(user.role?.libelleRole)" variant="tonal">
                  {{ user.role?.libelleRole || '—' }}
                </VChip>
              </td>
              <td class="text-medium-emphasis">{{ user.uniteOrganisationnelles?.libelleUnite || '—' }}</td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="user.statutUtilisateur === 'actif' ? 'success' : 'error'"
                  variant="tonal"
                >
                  <VIcon :icon="user.statutUtilisateur === 'actif' ? 'bx-check-circle' : 'bx-x-circle'" size="14" start />
                  {{ user.statutUtilisateur === 'actif' ? 'Actif' : 'Inactif' }}
                </VChip>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <VTooltip text="Modifier">
                    <template #activator="{ props }">
                      <VBtn v-bind="props" icon variant="text" size="small" color="primary" @click="openEditDialog(user)">
                        <VIcon size="20" icon="bx-edit" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip v-if="user.statutUtilisateur === 'actif'" text="Désactiver">
                    <template #activator="{ props }">
                      <VBtn v-bind="props" icon variant="text" size="small" color="warning" @click="confirmDeactivate(user)">
                        <VIcon size="20" icon="bx-pause-circle" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip text="Supprimer">
                    <template #activator="{ props }">
                      <VBtn v-bind="props" icon variant="text" size="small" color="error" @click="confirmDelete(user)">
                        <VIcon size="20" icon="bx-trash" />
                      </VBtn>
                    </template>
                  </VTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
          v-if="filteredUsers.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredUsers.length }} utilisateur(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
          </span>
          <VPagination
            v-model="currentPage"
            :length="totalPages || 1"
            :total-visible="5"
            @update:model-value="changePage"
            color="primary"
            variant="tonal"
            size="small"
          />
        </div>
      </VCard>
    </VCol>

    <!-- Dialog: Ajouter / Modifier -->
    <VDialog v-model="showDialog" max-width="640" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon :icon="isEditing ? 'bx-edit' : 'bx-user-plus'" color="primary" size="28" />
            {{ isEditing ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez les informations de l\'utilisateur' : 'Saisissez les informations du nouvel utilisateur' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveUser">
            <!-- Photo -->
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
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo de profil</div>
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
                <input ref="fileInput" id="photoInput" type="file" accept="image/*" class="d-none" @change="onFileChange" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <!-- Informations personnelles -->
            <div class="form-section-label">
              <VIcon icon="bx-id-card" size="16" /> Informations personnelles
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
              <VIcon icon="bx-envelope" size="16" /> Coordonnées
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
              <VIcon icon="bx-shield-quarter" size="16" /> Rôle et accès
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
                <VIcon icon="bx-lock-alt" size="16" /> Sécurité
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

            <div class="d-flex justify-end gap-3">
              <VBtn variant="tonal" color="secondary" :disabled="isSubmitting" @click="showDialog = false" size="large">
                Annuler
              </VBtn>
              <VBtn
                type="submit"
                color="primary"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                size="large"
                prepend-icon="bx-save"
              >
                {{ isEditing ? 'Enregistrer les modifications' : 'Ajouter l\'utilisateur' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Confirmation Dialog -->
    <VDialog v-model="showConfirmDialog" max-width="440" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardText class="text-center pt-8">
          <VAvatar
            size="56"
            :color="confirmAction === 'delete' ? 'error' : 'warning'"
            variant="tonal"
            class="mb-4"
          >
            <VIcon :icon="confirmAction === 'delete' ? 'bx-trash' : 'bx-pause-circle'" size="28" />
          </VAvatar>

          <h6 class="text-h6 mb-1">
            {{ confirmAction === 'delete' ? 'Confirmer la suppression' : 'Confirmer la désactivation' }}
          </h6>

          <p class="text-medium-emphasis mb-1">
            Vous êtes sur le point de {{ confirmAction === 'delete' ? 'supprimer' : 'désactiver' }} l'utilisateur
            <strong class="text-high-emphasis">{{ userToConfirm?.prenomUtilisateur }} {{ userToConfirm?.nomUtilisateur }}</strong>.
          </p>

          <p v-if="confirmAction === 'delete'" class="text-error text-caption d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" /> Cette action est irréversible.
          </p>
          <p v-else class="text-warning text-caption d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" /> L'utilisateur ne pourra plus se connecter.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
          <VBtn variant="tonal" color="secondary" @click="showConfirmDialog = false">Annuler</VBtn>
          <VBtn :color="confirmAction === 'delete' ? 'error' : 'warning'" @click="executeAction">
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
      rounded="lg"
      class="snackbar-custom"
    >
      <div class="d-flex align-center">
        <VIcon
          :icon="snackbar.color === 'success' ? 'bx-check-circle' : snackbar.color === 'warning' ? 'bx-error-circle' : 'bx-x-circle'"
          size="24"
          class="me-2"
        />
        <span class="font-weight-medium">{{ snackbar.message }}</span>
      </div>
      <template #actions>
        <VBtn variant="text" icon="bx-x" @click="snackbar.show = false" size="small" />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
/* ========== STATS CARDS ========== */
.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-primary-light {
  background-color: rgba(var(--v-theme-primary), 0.10);
}
.bg-success-light {
  background-color: rgba(var(--v-theme-success), 0.10);
}
.bg-error-light {
  background-color: rgba(var(--v-theme-error), 0.10);
}

/* ========== MAIN CARD ========== */
.main-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ========== TABLE ========== */
.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table thead th {
  background: rgba(0, 0, 0, 0.02);
  padding: 12px 16px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(0, 0, 0, 0.6);
  border-bottom: 2px solid rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

.custom-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  vertical-align: middle;
}

.custom-table tbody tr:last-child td {
  border-bottom: none;
}

.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.03);
}

/* ========== DIALOG ========== */
.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
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

/* ========== SNACKBAR ========== */
.snackbar-custom {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 600px) {
  .stat-card .text-h4 {
    font-size: 1.5rem;
  }
  .stat-icon {
    width: 40px;
    height: 40px;
  }
  .stat-icon .v-icon {
    font-size: 20px !important;
  }
}

@media (max-width: 960px) {
  .custom-table thead th {
    font-size: 0.65rem;
    padding: 8px 10px;
  }
  .custom-table tbody td {
    padding: 8px 10px;
    font-size: 0.85rem;
  }
}

/* ========== UTILITY ========== */
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.flex-wrap {
  flex-wrap: wrap;
}
</style>