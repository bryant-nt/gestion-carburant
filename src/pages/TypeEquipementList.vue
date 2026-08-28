<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTypeEquipementStore } from '@/stores/typeEquipement'
import { useEquipementsStore } from '@/stores/equipements'
import { useAuthStore } from '@/stores/auth'

// Stores
const typeEquipementStore = useTypeEquipementStore()
const equipementsStore = useEquipementsStore()
const authStore = useAuthStore()

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idTypeEquipement: null,
  libelleTypeEquipement: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// Delete confirmation
const showDeleteDialog = ref(false)
const typeToDelete = ref(null)

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
const types = computed(() => typeEquipementStore.types)
const loading = computed(() => typeEquipementStore.loading || equipementsStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalTypes = computed(() => types.value.length)
const equipements = computed(() => equipementsStore.equipements)

const typesWithEquipements = computed(() => {
  const typeIds = new Set(equipements.value.map(e => e.idTypeEquipement).filter(id => id))
  return types.value.filter(t => typeIds.has(t.idTypeEquipement)).length
})

const typesWithoutEquipements = computed(() => totalTypes.value - typesWithEquipements.value)

// Filtered
const filteredTypes = computed(() => {
  if (!searchQuery.value) return types.value
  const query = searchQuery.value.toLowerCase()
  return types.value.filter(type =>
    type.libelleTypeEquipement.toLowerCase().includes(query)
  )
})

// Paginated
const paginatedTypes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredTypes.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredTypes.value.length / itemsPerPage.value))

// Color for type (consistent)
const typeColorPalette = ['primary', 'info', 'success', 'warning', 'secondary', 'error']
const typeColor = (libelle) => {
  if (!libelle) return 'secondary'
  let hash = 0
  for (let i = 0; i < libelle.length; i++) {
    hash = libelle.charCodeAt(i) + ((hash << 5) - hash)
  }
  return typeColorPalette[Math.abs(hash) % typeColorPalette.length]
}

// Methods
const loadData = async () => {
  try {
    await Promise.all([
      typeEquipementStore.fetchTypes(),
      equipementsStore.fetchEquipements()
    ])
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
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
  formData.value = { idTypeEquipement: null, libelleTypeEquipement: '' }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (type) => {
  isEditing.value = true
  formData.value = {
    idTypeEquipement: type.idTypeEquipement,
    libelleTypeEquipement: type.libelleTypeEquipement
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
  if (!formData.value.libelleTypeEquipement || formData.value.libelleTypeEquipement.trim() === '') {
    errors.libelleTypeEquipement = 'Le libellé du type d\'équipement est requis'
  } else if (formData.value.libelleTypeEquipement.length < 3) {
    errors.libelleTypeEquipement = 'Le libellé doit contenir au moins 3 caractères'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveType = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const typeData = {
      libelleTypeEquipement: formData.value.libelleTypeEquipement.trim()
    }

    if (isEditing.value) {
      await typeEquipementStore.updateType(formData.value.idTypeEquipement, typeData)
      showNotification('Type d\'équipement modifié avec succès ! ✅', 'success')
    } else {
      await typeEquipementStore.createType(typeData)
      showNotification('Type d\'équipement ajouté avec succès ! ✅', 'success')
    }

    showDialog.value = false
    await loadData()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleTypeEquipement = 'Un type d\'équipement avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du type d\'équipement', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (type) => {
  typeToDelete.value = type
  showDeleteDialog.value = true
}

const deleteType = async () => {
  if (!typeToDelete.value) return

  try {
    await typeEquipementStore.deleteType(typeToDelete.value.idTypeEquipement)
    showDeleteDialog.value = false
    showNotification(`Type "${typeToDelete.value.libelleTypeEquipement}" supprimé avec succès ! 🗑️`, 'success')
    typeToDelete.value = null
    await loadData()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      showNotification('Ce type d\'équipement est utilisé et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du type d\'équipement', 'error')
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
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Types d'équipement</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Gérez les catégories d'équipements roulants
          </p>
        </div>
        <VBtn
          color="primary"
          size="large"
          prepend-icon="bx-plus"
          @click="openCreateDialog"
          elevation="2"
        >
          Ajouter un type
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-category" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total types
                </div>
                <div class="text-h4 font-weight-bold">{{ totalTypes }}</div>
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
                  Avec équipements
                </div>
                <div class="text-h4 font-weight-bold">{{ typesWithEquipements }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="warning" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-warning-light pa-3 me-4">
                <VIcon icon="bx-x-circle" size="28" color="warning" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Sans équipement
                </div>
                <div class="text-h4 font-weight-bold">{{ typesWithoutEquipements }}</div>
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
              Liste des types
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredTypes.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadData"
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
                placeholder="Rechercher un type d'équipement…"
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
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des types…</div>
              </td>
            </tr>
            <tr v-else-if="filteredTypes.length === 0">
              <td colspan="3" class="text-center pa-8">
                <VIcon icon="bx-category" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ searchQuery ? 'Aucun type trouvé' : 'Aucun type enregistré' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ searchQuery ? 'Ajustez votre recherche' : 'Ajoutez un nouveau type' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(type, index) in paginatedTypes"
              :key="type.idTypeEquipement"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center">
                  <VAvatar
                    variant="tonal"
                    :color="typeColor(type.libelleTypeEquipement)"
                    size="34"
                    rounded
                    class="me-3"
                  >
                    <VIcon icon="bx-category" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ type.libelleTypeEquipement }}</span>
                </div>
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
                        @click="openEditDialog(type)"
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
                        @click="confirmDelete(type)"
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
          v-if="filteredTypes.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredTypes.length }} type(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
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
            {{ isEditing ? 'Modifier le type' : 'Ajouter un type' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez le libellé du type' : 'Saisissez le libellé du nouveau type' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveType">
            <VTextField
              v-model="formData.libelleTypeEquipement"
              label="Libellé du type"
              placeholder="Ex: Véhicule léger, Camion, Groupe électrogène, …"
              prepend-inner-icon="bx-category"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.libelleTypeEquipement"
              :disabled="isSubmitting"
              autofocus
              hide-details="auto"
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
            Vous êtes sur le point de supprimer le type
            <strong class="text-high-emphasis">"{{ typeToDelete?.libelleTypeEquipement }}"</strong>.
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
            @click="deleteType"
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
.bg-warning-light {
  background-color: rgba(var(--v-theme-warning), 0.10);
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