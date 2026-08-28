<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStockCarburantStore } from '@/stores/stockCarburant'
import { useStationsStore } from '@/stores/stations'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateHelpers'

// Stores
const stockStore = useStockCarburantStore()
const stationsStore = useStationsStore()
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// Dialog state
const showAchatDialog = ref(false)
const isSubmitting = ref(false)
const achatForm = ref({
  idStation: null,
  idCarburant: null,
  quantiteAchat: null,
  dateEnregistrement: null
})
const achatErrors = ref({})

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filters
const searchQuery = ref('')
const filterStation = ref(null)
const filterCarburant = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed
const achats = computed(() => stockStore.stocks)
const loading = computed(() => stockStore.loading)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => typeCarburantStore.allTypes)
const pagination = computed(() => stockStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalAchats = computed(() => pagination.value?.total || 0)
const totalQuantite = computed(() => {
  return achats.value.reduce((sum, a) => sum + (a.quantiteAchat || 0), 0)
})

const stationOptions = computed(() => {
  return stations.value.map(station => ({
    title: station.libelleStation,
    value: station.idStation
  }))
})

const carburantOptions = computed(() => {
  return carburants.value.map(carburant => ({
    title: carburant.libelleCarburant,
    value: carburant.idCarburant
  }))
})

// Methods
const loadData = async () => {
  try {
    await Promise.all([
      stationsStore.fetchStations(),
      typeCarburantStore.fetchTypes()
    ])
    await loadAchats()
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur:', error)
  }
}

const loadAchats = async () => {
  try {
    const params = {
      page: currentPage.value - 1,
      size: itemsPerPage.value
    }
    if (filterStation.value) params.idStation = filterStation.value
    if (filterCarburant.value) params.idCarburant = filterCarburant.value
    if (searchQuery.value) params.search = searchQuery.value

    await stockStore.fetchAchatsPaged(params)
  } catch (error) {
    showNotification('Erreur lors du chargement des achats', 'error')
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

const openAchatDialog = () => {
  achatForm.value = {
    idStation: null,
    idCarburant: null,
    quantiteAchat: null,
    dateEnregistrement: null
  }
  achatErrors.value = {}
  showAchatDialog.value = true
}

const validateAchatForm = () => {
  const errors = {}
  if (!achatForm.value.idStation) {
    errors.idStation = 'La station est requise'
  }
  if (!achatForm.value.idCarburant) {
    errors.idCarburant = 'Le type de carburant est requis'
  }
  if (!achatForm.value.quantiteAchat || achatForm.value.quantiteAchat <= 0) {
    errors.quantiteAchat = 'La quantité doit être supérieure à 0'
  }
  achatErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveAchat = async () => {
  if (!validateAchatForm()) return

  isSubmitting.value = true

  try {
    const achatData = {
      idStation: achatForm.value.idStation,
      idCarburant: achatForm.value.idCarburant,
      quantiteAchat: parseFloat(achatForm.value.quantiteAchat)
    }

    if (achatForm.value.dateEnregistrement) {
      achatData.dateEnregistrement = achatForm.value.dateEnregistrement
    }

    await stockStore.createAchat(achatData)
    showNotification('Achat enregistré avec succès ! ✅', 'success')
    showAchatDialog.value = false
    await loadData()
  } catch (error) {
    console.error('Erreur:', error)
    showNotification('Erreur lors de l\'enregistrement de l\'achat', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const changePage = (newPage) => {
  currentPage.value = newPage
  loadAchats()
}

const changeItemsPerPage = (newSize) => {
  itemsPerPage.value = newSize
  currentPage.value = 1
  loadAchats()
}

const applyFilters = () => {
  currentPage.value = 1
  loadAchats()
}

const resetFilters = () => {
  filterStation.value = null
  filterCarburant.value = null
  searchQuery.value = ''
  currentPage.value = 1
  loadAchats()
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
          <h1 class="text-h4 font-weight-bold text-primary">
            Gestion des achats
          </h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Suivez et gérez tous les achats de carburant
          </p>
        </div>
        <VBtn
          color="primary"
          size="large"
          prepend-icon="bx-plus"
          @click="openAchatDialog"
          elevation="2"
        >
          Enregistrer un achat
        </VBtn>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="4">
          <VCard
            variant="tonal"
            color="primary"
            class="stat-card"
            rounded="lg"
          >
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-shopping-bag" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total achats
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totalAchats }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard
            variant="tonal"
            color="success"
            class="stat-card"
            rounded="lg"
          >
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-gas-pump" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Quantité totale
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ totalQuantite.toLocaleString() }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="4">
          <VCard
            variant="tonal"
            color="info"
            class="stat-card"
            rounded="lg"
          >
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-store" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Stations approvisionnées
                </div>
                <div class="text-h4 font-weight-bold">
                  {{ stations.length }}
                </div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <!-- Card Header with Filters -->
        <VCardItem class="border-bottom">
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 w-100">
            <VCardTitle class="text-h6 font-weight-semibold">
              Historique des achats
              <VChip
                size="small"
                color="primary"
                variant="tonal"
                class="ms-2"
              >
                {{ totalAchats }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadAchats"
                :loading="loading"
              />
            </div>
          </div>
        </VCardItem>

        <!-- Filters -->
        <VCardText class="pt-4 pb-2">
          <VRow>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStation"
                label="Station"
                :items="stationOptions"
                item-title="title"
                item-value="value"
                placeholder="Toutes les stations"
                clearable
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterCarburant"
                label="Carburant"
                :items="carburantOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les carburants"
                clearable
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Station ou carburant"
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="3" class="d-flex align-center gap-2">
              <VBtn
                color="primary"
                variant="flat"
                @click="applyFilters"
                class="flex-grow-1"
              >
                <VIcon icon="bx-filter" size="20" class="me-1" />
                Filtrer
              </VBtn>
              <VBtn
                color="secondary"
                variant="tonal"
                @click="resetFilters"
                class="flex-grow-1"
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
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width: 60px;">
                N°
              </th>
              <th class="text-uppercase text-caption font-weight-bold">
                Station
              </th>
              <th class="text-uppercase text-caption font-weight-bold">
                Carburant
              </th>
              <th class="text-uppercase text-caption font-weight-bold text-center">
                Quantité
              </th>
              <th class="text-uppercase text-caption font-weight-bold text-center">
                Date d'enregistrement
              </th>
            </tr>
          </thead>

          <tbody>
            <!-- Loading -->
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">
                  Chargement des achats...
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="achats.length === 0">
              <td colspan="5" class="text-center pa-8">
                <VIcon icon="bx-inbox" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  Aucun achat trouvé
                </div>
                <p class="text-caption text-medium-emphasis">
                  Aucun achat ne correspond à vos critères
                </p>
              </td>
            </tr>

            <!-- Rows -->
            <tr
              v-for="(achat, index) in achats"
              :key="achat.idAchat || index"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center">
                  <div class="avatar-placeholder rounded-circle bg-primary-light me-2" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                    <VIcon icon="bx-store" size="16" color="primary" />
                  </div>
                  <span class="font-weight-medium">
                    {{ achat.stationCarburant?.libelleStation || '-' }}
                  </span>
                </div>
              </td>
              <td>
                <VChip
                  size="small"
                  color="info"
                  variant="tonal"
                  label
                >
                  {{ achat.typeCarburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip
                  color="primary"
                  variant="flat"
                  size="small"
                  label
                  class="font-weight-bold px-3"
                >
                  {{ achat.quantiteAchat || 0 }}
                </VChip>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(achat.dateEnregistrement) }}
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
          v-if="pagination.totalPages > 1 || pagination.total > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ pagination.total || 0 }} élément(s) —
            Page {{ currentPage }} / {{ pagination.totalPages || 1 }}
          </span>
          <VPagination
            v-model="currentPage"
            :length="pagination.totalPages || 1"
            :total-visible="5"
            @update:model-value="changePage"
            color="primary"
            variant="tonal"
            size="small"
          />
        </div>
      </VCard>

      <!-- Dialog: Enregistrer un achat -->
      <VDialog
        v-model="showAchatDialog"
        max-width="520"
        persistent
        transition="fade-transition"
      >
        <VCard rounded="lg" class="dialog-card">
          <VCardItem class="border-bottom">
            <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
              <VIcon icon="bx-plus-circle" color="primary" size="28" />
              Enregistrer un achat
            </VCardTitle>
            <VCardSubtitle class="mt-1 text-medium-emphasis">
              Saisissez les informations de l'achat de carburant
            </VCardSubtitle>
          </VCardItem>

          <VCardText class="pt-6">
            <VForm @submit.prevent="saveAchat">
              <VSelect
                v-model="achatForm.idStation"
                label="Station"
                :items="stationOptions"
                item-title="title"
                item-value="value"
                placeholder="Sélectionner une station"
                :error-messages="achatErrors.idStation"
                :loading="loading"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="bx-store"
              />

              <VSelect
                v-model="achatForm.idCarburant"
                label="Type de carburant"
                :items="carburantOptions"
                item-title="title"
                item-value="value"
                placeholder="Sélectionner un carburant"
                :error-messages="achatErrors.idCarburant"
                :loading="loading"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="bx-gas-pump"
                class="mt-4"
              />

              <VTextField
                v-model="achatForm.quantiteAchat"
                label="Quantité"
                placeholder="Ex: 5000"
                type="number"
                :error-messages="achatErrors.quantiteAchat"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="bx-bar-chart"
                class="mt-4"
              />

              <VTextField
                v-model="achatForm.dateEnregistrement"
                label="Date d'enregistrement (optionnelle)"
                type="datetime-local"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="bx-calendar"
                class="mt-4"
              />

              <div class="d-flex justify-end gap-3 mt-6 pt-2">
                <VBtn
                  variant="tonal"
                  color="secondary"
                  @click="showAchatDialog = false"
                  :disabled="isSubmitting"
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
                  Enregistrer
                </VBtn>
              </div>
            </VForm>
          </VCardText>
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
            :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'"
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
    </VCol>
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

.avatar-placeholder {
  flex-shrink: 0;
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