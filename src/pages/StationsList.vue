<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'

// Stores
const stationsStore = useStationsStore()
const authStore = useAuthStore()

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idStation: null,
  libelleStation: '',
  adresseStation: '',
  telephoneStation: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// Delete confirmation
const showDeleteDialog = ref(false)
const stationToDelete = ref(null)
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
const stations = computed(() => stationsStore.stations)
const loading = computed(() => stationsStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalStations = computed(() => stations.value.length)
const stationsWithAddress = computed(() =>
  stations.value.filter(s => s.adresseStation && s.adresseStation.trim() !== '').length
)
const stationsWithPhone = computed(() =>
  stations.value.filter(s => s.telephoneStation && s.telephoneStation.trim() !== '').length
)

// Filtered stations
const filteredStations = computed(() => {
  if (!searchQuery.value) return stations.value
  const query = searchQuery.value.toLowerCase()
  return stations.value.filter(station =>
    station.libelleStation?.toLowerCase().includes(query) ||
    station.adresseStation?.toLowerCase().includes(query) ||
    station.telephoneStation?.toLowerCase().includes(query)
  )
})

// Paginated stations
const paginatedStations = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredStations.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredStations.value.length / itemsPerPage.value))

// Station color (consistent)
const stationColorPalette = ['primary', 'info', 'success', 'warning', 'secondary', 'error']
const stationColor = (libelle) => {
  if (!libelle) return 'secondary'
  let hash = 0
  for (let i = 0; i < libelle.length; i++) {
    hash = libelle.charCodeAt(i) + ((hash << 5) - hash)
  }
  return stationColorPalette[Math.abs(hash) % stationColorPalette.length]
}

// Methods
const loadStations = async () => {
  try {
    await stationsStore.fetchStations()
  } catch (error) {
    showNotification('Erreur lors du chargement des stations', 'error')
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
    idStation: null,
    libelleStation: '',
    adresseStation: '',
    telephoneStation: ''
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (station) => {
  isEditing.value = true
  formData.value = {
    idStation: station.idStation,
    libelleStation: station.libelleStation,
    adresseStation: station.adresseStation,
    telephoneStation: station.telephoneStation
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
  if (!formData.value.libelleStation || formData.value.libelleStation.trim() === '') {
    errors.libelleStation = 'Le libellé de la station est requis'
  } else if (formData.value.libelleStation.length < 3) {
    errors.libelleStation = 'Le libellé doit contenir au moins 3 caractères'
  }

  if (!formData.value.adresseStation || formData.value.adresseStation.trim() === '') {
    errors.adresseStation = 'L\'adresse de la station est requise'
  }

  if (!formData.value.telephoneStation || formData.value.telephoneStation.trim() === '') {
    errors.telephoneStation = 'Le téléphone de la station est requis'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveStation = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const stationData = {
      libelleStation: formData.value.libelleStation.trim(),
      adresseStation: formData.value.adresseStation.trim(),
      telephoneStation: formData.value.telephoneStation.trim()
    }

    if (isEditing.value) {
      await stationsStore.updateStation(formData.value.idStation, stationData)
      showNotification('Station modifiée avec succès ! ✅', 'success')
    } else {
      await stationsStore.createStation(stationData)
      showNotification('Station ajoutée avec succès ! ✅', 'success')
    }

    showDialog.value = false
    await loadStations()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleStation = 'Une station avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de la station', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (station) => {
  stationToDelete.value = station
  showDeleteDialog.value = true
}

const deleteStation = async () => {
  if (!stationToDelete.value) return

  isDeleting.value = true

  try {
    await stationsStore.deleteStation(stationToDelete.value.idStation)
    showDeleteDialog.value = false
    showNotification(`Station "${stationToDelete.value.libelleStation}" supprimée avec succès ! 🗑️`, 'success')
    stationToDelete.value = null
    await loadStations()
  } catch (error) {
    console.error('Erreur:', error)
    if (error.response?.status === 409) {
      showNotification('Cette station est utilisée et ne peut pas être supprimée', 'error')
    } else {
      showNotification('Erreur lors de la suppression de la station', 'error')
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
  loadStations()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des stations</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Enregistrez et gérez les stations de carburant
          </p>
        </div>
        <VBtn
          color="primary"
          size="large"
          prepend-icon="bx-plus"
          @click="openCreateDialog"
          elevation="2"
        >
          Ajouter une station
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-gas-pump" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total stations
                </div>
                <div class="text-h4 font-weight-bold">{{ totalStations }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-map" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Avec adresse
                </div>
                <div class="text-h4 font-weight-bold">{{ stationsWithAddress }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-phone" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Avec téléphone
                </div>
                <div class="text-h4 font-weight-bold">{{ stationsWithPhone }}</div>
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
              Liste des stations
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredStations.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadStations"
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
                placeholder="Rechercher une station…"
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
              <th class="text-uppercase text-caption font-weight-bold">Station</th>
              <th class="text-uppercase text-caption font-weight-bold">Adresse</th>
              <th class="text-uppercase text-caption font-weight-bold">Téléphone</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des stations…</div>
              </td>
            </tr>
            <tr v-else-if="filteredStations.length === 0">
              <td colspan="5" class="text-center pa-8">
                <VIcon icon="bx-gas-pump" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ searchQuery ? 'Aucune station trouvée' : 'Aucune station enregistrée' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ searchQuery ? 'Ajustez votre recherche' : 'Ajoutez une nouvelle station' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(station, index) in paginatedStations"
              :key="station.idStation"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center">
                  <VAvatar
                    variant="tonal"
                    :color="stationColor(station.libelleStation)"
                    size="34"
                    rounded
                    class="me-3"
                  >
                    <VIcon icon="bx-gas-pump" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ station.libelleStation }}</span>
                </div>
              </td>
              <td>
                <div class="d-flex align-center gap-2 text-medium-emphasis">
                  <VIcon icon="bx-map" size="16" />
                  <span>{{ station.adresseStation }}</span>
                </div>
              </td>
              <td>
                <div class="d-flex align-center gap-2 text-medium-emphasis">
                  <VIcon icon="bx-phone" size="16" />
                  <span>{{ station.telephoneStation }}</span>
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
                        @click="openEditDialog(station)"
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
                        @click="confirmDelete(station)"
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
          v-if="filteredStations.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredStations.length }} station(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
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
            {{ isEditing ? 'Modifier la station' : 'Ajouter une station' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez les informations de la station' : 'Saisissez les informations de la nouvelle station' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveStation">
            <VTextField
              v-model="formData.libelleStation"
              label="Libellé de la station"
              placeholder="Ex: Station Partenaire Centre"
              prepend-inner-icon="bx-gas-pump"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.libelleStation"
              :disabled="isSubmitting"
              autofocus
              hide-details="auto"
              class="mb-4"
            />

            <VTextField
              v-model="formData.adresseStation"
              label="Adresse"
              placeholder="Ex: Avenue du Port, Bujumbura"
              prepend-inner-icon="bx-map"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.adresseStation"
              :disabled="isSubmitting"
              hide-details="auto"
              class="mb-4"
            />

            <VTextField
              v-model="formData.telephoneStation"
              label="Téléphone"
              placeholder="Ex: +257 22 22 22 22"
              prepend-inner-icon="bx-phone"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.telephoneStation"
              :disabled="isSubmitting"
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
            Vous êtes sur le point de supprimer la station
            <strong class="text-high-emphasis">"{{ stationToDelete?.libelleStation }}"</strong>.
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
            :disabled="isDeleting"
            @click="showDeleteDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="deleteStation"
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