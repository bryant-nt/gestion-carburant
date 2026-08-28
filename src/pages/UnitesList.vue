<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUnitesStore } from '@/stores/unites'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Stores
const unitesStore = useUnitesStore()
const authStore = useAuthStore()

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idUnite: null,
  libelleUnite: '',
  parentId: null,
  statutUnite: 'Activer',
  dateEnregistrement: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// Delete confirmation
const showDeleteDialog = ref(false)
const uniteToDelete = ref(null)

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
const unites = computed(() => unitesStore.unites)
const loading = computed(() => unitesStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalUnites = computed(() => unites.value.length)
const unitesWithParent = computed(() =>
  unites.value.filter(u => u.parentId).length
)
const activeUnites = computed(() =>
  unites.value.filter(u => u.statutUnite === 'Activer').length
)
const inactiveUnites = computed(() =>
  unites.value.filter(u => u.statutUnite === 'Desactiver').length
)

// Filtered
const filteredUnites = computed(() => {
  if (!searchQuery.value) return unites.value
  const query = searchQuery.value.toLowerCase()
  return unites.value.filter(unite =>
    unite.libelleUnite?.toLowerCase().includes(query)
  )
})

// Paginated
const paginatedUnites = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredUnites.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredUnites.value.length / itemsPerPage.value))

// Parent options
const parentOptions = computed(() => {
  return unites.value
    .filter(u => !isEditing || u.idUnite !== formData.value.idUnite) // exclude itself when editing
    .map(unite => ({
      title: unite.libelleUnite,
      value: unite.idUnite
    }))
})

// Methods
const loadUnites = async () => {
  try {
    await unitesStore.fetchUnites()
  } catch (error) {
    showNotification('Erreur lors du chargement des unités', 'error')
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
  formData.value = {
    idUnite: null,
    libelleUnite: '',
    parentId: null,
    statutUnite: 'Activer',
    dateEnregistrement: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (unite) => {
  isEditing.value = true
  formData.value = {
    idUnite: unite.idUnite,
    libelleUnite: unite.libelleUnite,
    parentId: unite.parentId || null,
    statutUnite: unite.statutUnite || 'Activer',
    dateEnregistrement: unite.dateEnregistrement ? arrayToDate(unite.dateEnregistrement) : null
  }
  formErrors.value = {}
  showDialog.value = true
}

const closeDialog = () => {
  if (isSubmitting.value) return
  showDialog.value = false
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleUnite || formData.value.libelleUnite.trim() === '') {
    errors.libelleUnite = 'Le libellé de l\'unité est requis'
  } else if (formData.value.libelleUnite.length < 3) {
    errors.libelleUnite = 'Le libellé doit contenir au moins 3 caractères'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveUnite = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const uniteData = {
      libelleUnite: formData.value.libelleUnite.trim()
    }

    if (formData.value.parentId) {
      uniteData.parentId = formData.value.parentId
    }

    if (formData.value.statutUnite) {
      uniteData.statutUnite = formData.value.statutUnite
    }

    if (isEditing.value) {
      await unitesStore.updateUnite(formData.value.idUnite, uniteData)
      showNotification('Unité modifiée avec succès ! ✅', 'success')
    } else {
      await unitesStore.createUnite(uniteData)
      showNotification('Unité ajoutée avec succès ! ✅', 'success')
    }

    showDialog.value = false
    await loadUnites()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleUnite = 'Une unité avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'unité', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (unite) => {
  uniteToDelete.value = unite
  showDeleteDialog.value = true
}

const deleteUnite = async () => {
  if (!uniteToDelete.value) return

  try {
    await unitesStore.deleteUnite(uniteToDelete.value.idUnite)
    showDeleteDialog.value = false
    showNotification(`Unité "${uniteToDelete.value.libelleUnite}" supprimée avec succès ! 🗑️`, 'success')
    uniteToDelete.value = null
    await loadUnites()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      showNotification('Cette unité est utilisée et ne peut pas être supprimée', 'error')
    } else {
      showNotification('Erreur lors de la suppression de l\'unité', 'error')
    }
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
  loadUnites()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des unités</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Organisez les structures hiérarchiques de votre organisation
          </p>
        </div>
        <VBtn
          color="primary"
          size="large"
          prepend-icon="bx-plus"
          @click="openCreateDialog"
          elevation="2"
        >
          Ajouter une unité
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-building" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total unités
                </div>
                <div class="text-h4 font-weight-bold">{{ totalUnites }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-sitemap" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Avec parent
                </div>
                <div class="text-h4 font-weight-bold">{{ unitesWithParent }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-check-circle" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Actives
                </div>
                <div class="text-h4 font-weight-bold">{{ activeUnites }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="error" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-error-light pa-3 me-4">
                <VIcon icon="bx-x-circle" size="28" color="error" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Inactives
                </div>
                <div class="text-h4 font-weight-bold">{{ inactiveUnites }}</div>
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
              Liste des unités
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredUnites.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadUnites"
                :loading="loading"
              />
            </div>
          </div>
        </VCardItem>

        <!-- Search -->
        <VCardText class="pt-4 pb-2">
          <VRow>
            <VCol cols="12" md="6">
              <VTextField
                v-model="searchQuery"
                placeholder="Rechercher une unité…"
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
              <th class="text-uppercase text-caption font-weight-bold">Unité parente</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Statut</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date d'ajout</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des unités…</div>
              </td>
            </tr>
            <tr v-else-if="filteredUnites.length === 0">
              <td colspan="6" class="text-center pa-8">
                <VIcon icon="bx-building" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ searchQuery ? 'Aucune unité trouvée' : 'Aucune unité enregistrée' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ searchQuery ? 'Ajustez votre recherche' : 'Ajoutez une nouvelle unité' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(unite, index) in paginatedUnites"
              :key="unite.idUnite"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center">
                  <VAvatar
                    variant="tonal"
                    color="primary"
                    size="34"
                    rounded
                    class="me-3"
                  >
                    <VIcon icon="bx-building" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ unite.libelleUnite }}</span>
                </div>
              </td>
              <td>
                <span class="text-medium-emphasis">
                  {{ unite.parent?.libelleUnite || '—' }}
                </span>
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="unite.statutUnite === 'Activer' ? 'success' : 'error'"
                  variant="tonal"
                >
                  <VIcon
                    :icon="unite.statutUnite === 'Activer' ? 'bx-check-circle' : 'bx-x-circle'"
                    size="14"
                    start
                  />
                  {{ unite.statutUnite || 'Activer' }}
                </VChip>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(unite.dateEnregistrement) }}
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
                        @click="openEditDialog(unite)"
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
                        @click="confirmDelete(unite)"
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
          v-if="filteredUnites.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredUnites.length }} unité(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
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
      max-width="520"
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
            {{ isEditing ? 'Modifier l\'unité' : 'Ajouter une unité' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez les informations de l\'unité' : 'Saisissez les informations de la nouvelle unité' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveUnite">
            <VTextField
              v-model="formData.libelleUnite"
              label="Libellé de l'unité"
              placeholder="Ex: Direction des Transports"
              prepend-inner-icon="bx-building"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.libelleUnite"
              :disabled="isSubmitting"
              autofocus
              hide-details="auto"
              class="mb-4"
            />

            <VSelect
              v-model="formData.parentId"
              label="Unité parente"
              :items="parentOptions"
              item-title="title"
              item-value="value"
              placeholder="Aucun parent"
              prepend-inner-icon="bx-sitemap"
              variant="outlined"
              density="comfortable"
              :loading="loading"
              clearable
              hide-details="auto"
              class="mb-4"
            />

            <VSelect
              v-model="formData.statutUnite"
              label="Statut"
              :items="['Activer', 'Desactiver']"
              placeholder="Sélectionner un statut"
              prepend-inner-icon="bx-toggle-left"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
            />

            <VTextField
              v-if="isEditing && formData.dateEnregistrement"
              :model-value="formatDateOnly(formData.dateEnregistrement)"
              label="Date d'enregistrement"
              prepend-inner-icon="bx-calendar"
              variant="outlined"
              density="comfortable"
              readonly
              disabled
              hide-details
              class="mb-4"
            />

            <VDivider class="mt-2 mb-4" />

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
            Vous êtes sur le point de supprimer l'unité
            <strong class="text-high-emphasis">"{{ uniteToDelete?.libelleUnite }}"</strong>.
          </p>

          <p class="text-error text-caption mt-4 d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            Cette action est irréversible.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="showDeleteDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            @click="deleteUnite"
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
.bg-info-light {
  background-color: rgba(var(--v-theme-info), 0.10);
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