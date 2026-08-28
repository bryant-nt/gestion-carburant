<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

// Stores
const rolesStore = useRolesStore()
const authStore = useAuthStore()

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idRole: null,
  libelleRole: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// Delete confirmation
const showDeleteDialog = ref(false)
const roleToDelete = ref(null)
const isDeleting = ref(false)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filters & Pagination
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed
const roles = computed(() => rolesStore.roles)
const loading = computed(() => rolesStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalRoles = computed(() => roles.value.length)
const totalUsersAssigned = computed(() =>
  roles.value.reduce((sum, r) => sum + (r.nombreUtilisateurs || 0), 0)
)
const rolesWithUsers = computed(() =>
  roles.value.filter(r => (r.nombreUtilisateurs || 0) > 0).length
)

// Filtered roles
const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  const query = searchQuery.value.toLowerCase()
  return roles.value.filter(role =>
    role.libelleRole.toLowerCase().includes(query)
  )
})

// Paginated roles
const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredRoles.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredRoles.value.length / itemsPerPage.value))

// Role color (consistent)
const roleColorPalette = ['primary', 'info', 'success', 'warning', 'secondary', 'error']
const roleColor = (roleLabel) => {
  if (!roleLabel) return 'secondary'
  let hash = 0
  for (let i = 0; i < roleLabel.length; i++) {
    hash = roleLabel.charCodeAt(i) + ((hash << 5) - hash)
  }
  return roleColorPalette[Math.abs(hash) % roleColorPalette.length]
}

// Methods
const loadRoles = async () => {
  try {
    await rolesStore.fetchRoles()
  } catch (error) {
    showNotification('Erreur lors du chargement des rôles', 'error')
    console.error('Erreur:', error)
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
  formData.value = { idRole: null, libelleRole: '' }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (role) => {
  isEditing.value = true
  formData.value = { idRole: role.idRole, libelleRole: role.libelleRole }
  formErrors.value = {}
  showDialog.value = true
}

const closeDialog = () => {
  if (isSubmitting.value) return
  showDialog.value = false
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleRole || formData.value.libelleRole.trim() === '') {
    errors.libelleRole = 'Le libellé du rôle est requis'
  } else if (formData.value.libelleRole.length < 3) {
    errors.libelleRole = 'Le libellé doit contenir au moins 3 caractères'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveRole = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const roleData = { libelleRole: formData.value.libelleRole.trim() }

    if (isEditing.value) {
      await rolesStore.updateRole(formData.value.idRole, roleData)
      showNotification('Rôle modifié avec succès ! ✅', 'success')
    } else {
      await rolesStore.createRole(roleData)
      showNotification('Rôle ajouté avec succès ! ✅', 'success')
    }

    showDialog.value = false
    await loadRoles()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleRole = 'Un rôle avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du rôle', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (role) => {
  roleToDelete.value = role
  showDeleteDialog.value = true
}

const deleteRole = async () => {
  if (!roleToDelete.value) return

  isDeleting.value = true

  try {
    await rolesStore.deleteRole(roleToDelete.value.idRole)
    showDeleteDialog.value = false
    showNotification(`Rôle "${roleToDelete.value.libelleRole}" supprimé avec succès ! 🗑️`, 'success')
    roleToDelete.value = null
    await loadRoles()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      showNotification('Ce rôle est utilisé par des utilisateurs et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du rôle', 'error')
    }
  } finally {
    isDeleting.value = false
  }
}

const resetSearch = () => {
  searchQuery.value = ''
  currentPage.value = 1
}

const changePage = (page) => {
  currentPage.value = page
}

// Lifecycle
onMounted(() => {
  loadRoles()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des rôles</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Définissez et gérez les rôles d'accès à la plateforme
          </p>
        </div>
        <VBtn
          color="primary"
          size="large"
          prepend-icon="bx-plus"
          @click="openCreateDialog"
          elevation="2"
        >
          Ajouter un rôle
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-shield-quarter" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total rôles
                </div>
                <div class="text-h4 font-weight-bold">{{ totalRoles }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-group" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Utilisateurs affectés
                </div>
                <div class="text-h4 font-weight-bold">{{ totalUsersAssigned }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-check-circle" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Rôles actifs
                </div>
                <div class="text-h4 font-weight-bold">{{ rolesWithUsers }}</div>
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
              Liste des rôles
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredRoles.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadRoles"
                :loading="loading"
              />
            </div>
          </div>
        </VCardItem>

        <!-- Search & Filters -->
        <VCardText class="pt-4 pb-2">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="searchQuery"
                placeholder="Rechercher un rôle…"
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
                @update:model-value="currentPage = 1"
              />
            </VCol>
            <VCol cols="12" md="6" class="d-flex align-center justify-md-end">
              <VBtn
                color="secondary"
                variant="tonal"
                prepend-icon="bx-undo"
                @click="resetSearch"
                :disabled="!searchQuery"
              >
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
              <th class="text-uppercase text-caption font-weight-bold">Libellé</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Utilisateurs</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des rôles…</div>
              </td>
            </tr>
            <tr v-else-if="filteredRoles.length === 0">
              <td colspan="4" class="text-center pa-8">
                <VIcon icon="bx-shield-x" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ searchQuery ? 'Aucun rôle trouvé' : 'Aucun rôle enregistré' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ searchQuery ? 'Ajustez votre recherche' : 'Ajoutez un nouveau rôle' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(role, index) in paginatedRoles"
              :key="role.idRole"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center">
                  <VAvatar
                    variant="tonal"
                    :color="roleColor(role.libelleRole)"
                    size="34"
                    rounded
                    class="me-3"
                  >
                    <VIcon icon="bx-shield" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ role.libelleRole }}</span>
                </div>
              </td>
              <td class="text-center">
                <VChip
                  :color="role.nombreUtilisateurs ? 'primary' : 'secondary'"
                  variant="tonal"
                  size="small"
                  label
                >
                  {{ role.nombreUtilisateurs || 0 }}
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
                        @click="openEditDialog(role)"
                      >
                        <VIcon size="20" icon="bx-edit" />
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
                        @click="confirmDelete(role)"
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

        <!-- Pagination -->
        <div
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
          v-if="filteredRoles.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredRoles.length }} rôle(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
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

    <!-- Dialog: Créer / Modifier -->
    <VDialog
      v-model="showDialog"
      max-width="480"
      persistent
      transition="fade-transition"
    >
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon
              :icon="isEditing ? 'bx-edit' : 'bx-plus-circle'"
              color="primary"
              size="28"
            />
            {{ isEditing ? 'Modifier le rôle' : 'Ajouter un rôle' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez le libellé du rôle' : 'Saisissez le libellé du nouveau rôle' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveRole">
            <VTextField
              v-model="formData.libelleRole"
              label="Libellé du rôle"
              placeholder="Ex: Contrôleur, Validateur, …"
              prepend-inner-icon="bx-shield"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.libelleRole"
              :disabled="isSubmitting"
              autofocus
              hide-details
            />

            <VDivider class="mt-4 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn
                variant="tonal"
                color="secondary"
                :disabled="isSubmitting"
                @click="closeDialog"
                size="large"
              >
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
                {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Confirmation Dialog -->
    <VDialog
      v-model="showDeleteDialog"
      max-width="420"
      persistent
      transition="fade-transition"
    >
      <VCard rounded="lg" class="dialog-card">
        <VCardText class="text-center pt-8">
          <VAvatar
            variant="tonal"
            color="error"
            size="56"
            class="mb-4"
          >
            <VIcon icon="bx-trash" size="28" />
          </VAvatar>

          <h6 class="text-h6 mb-1">Confirmer la suppression</h6>
          <p class="text-medium-emphasis mb-1">
            Vous êtes sur le point de supprimer le rôle
            <strong class="text-high-emphasis">"{{ roleToDelete?.libelleRole }}"</strong>.
          </p>

          <VAlert
            v-if="roleToDelete?.nombreUtilisateurs"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-4 text-start"
          >
            Ce rôle est affecté à {{ roleToDelete.nombreUtilisateurs }} utilisateur(s). La suppression pourrait échouer.
          </VAlert>

          <p class="text-error text-caption mt-4 d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            Cette action est irréversible.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
          <VBtn
            variant="tonal"
            color="secondary"
            :disabled="isDeleting"
            @click="showDeleteDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="deleteRole"
          >
            Supprimer
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
        <VBtn
          variant="text"
          icon="bx-x"
          @click="snackbar.show = false"
          size="small"
        />
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
.bg-info-light {
  background-color: rgba(var(--v-theme-info), 0.10);
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