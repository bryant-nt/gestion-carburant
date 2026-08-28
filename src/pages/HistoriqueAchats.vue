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

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filters & Pagination
const filterStation = ref(null)
const filterCarburant = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed
const historique = computed(() => stockStore.historique)
const loading = computed(() => stockStore.loading)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => typeCarburantStore.allTypes)
const pagination = computed(() => stockStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalEntries = computed(() => pagination.value?.total || 0)
const totalQuantity = computed(() => {
  return historique.value.reduce((sum, item) => sum + (item.quantiteAchat || 0), 0)
})
const distinctStations = computed(() => {
  const stationIds = new Set(historique.value.map(item => item.stationCarburant?.idStation).filter(id => id))
  return stationIds.size
})
const distinctCarburants = computed(() => {
  const carburantIds = new Set(historique.value.map(item => item.typeCarburant?.idCarburant).filter(id => id))
  return carburantIds.size
})

// Options
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
    await loadHistorique()
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur:', error)
  }
}

const loadHistorique = async () => {
  try {
    const params = {
      page: currentPage.value - 1,
      size: itemsPerPage.value
    }
    if (filterStation.value) params.idStation = filterStation.value
    if (filterCarburant.value) params.idCarburant = filterCarburant.value
    if (dateFrom.value) params.from = dateFrom.value
    if (dateTo.value) params.to = dateTo.value
    if (searchQuery.value) params.search = searchQuery.value

    await stockStore.fetchHistoriquePaged(params)
  } catch (error) {
    showNotification('Erreur lors du chargement de l\'historique', 'error')
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

const changePage = (newPage) => {
  currentPage.value = newPage
  loadHistorique()
}

const changeItemsPerPage = (newSize) => {
  itemsPerPage.value = newSize
  currentPage.value = 1
  loadHistorique()
}

const applyFilters = () => {
  currentPage.value = 1
  loadHistorique()
}

const resetFilters = () => {
  filterStation.value = null
  filterCarburant.value = null
  dateFrom.value = null
  dateTo.value = null
  searchQuery.value = ''
  currentPage.value = 1
  loadHistorique()
}

const hasActiveFilters = computed(() =>
  !!filterStation.value || !!filterCarburant.value || !!dateFrom.value || !!dateTo.value || !!searchQuery.value
)

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
          <h1 class="text-h4 font-weight-bold text-primary">Historique des achats</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Consultez tous les mouvements d'achat de carburant
          </p>
        </div>
        <div class="d-flex gap-3">
          <VBtn
            color="secondary"
            variant="tonal"
            prepend-icon="bx-refresh"
            @click="loadHistorique"
            :loading="loading"
          >
            Actualiser
          </VBtn>
        </div>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-list-ul" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total mouvements
                </div>
                <div class="text-h4 font-weight-bold">{{ totalEntries }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-bar-chart" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Quantité totale
                </div>
                <div class="text-h4 font-weight-bold">{{ totalQuantity.toLocaleString() }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-store" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Stations concernées
                </div>
                <div class="text-h4 font-weight-bold">{{ distinctStations }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="warning" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-warning-light pa-3 me-4">
                <VIcon icon="bx-droplet" size="28" color="warning" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Types de carburant
                </div>
                <div class="text-h4 font-weight-bold">{{ distinctCarburants }}</div>
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
              Mouvements d'achat
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ totalEntries }}
              </VChip>
            </VCardTitle>
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
            <VCol cols="12" md="2">
              <VTextField
                v-model="dateFrom"
                label="Date de début"
                type="datetime-local"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
              <VTextField
                v-model="dateTo"
                label="Date de fin"
                type="datetime-local"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
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
          </VRow>
          <VRow class="mt-3">
            <VCol cols="12" class="d-flex gap-2">
              <VBtn
                color="primary"
                variant="flat"
                @click="applyFilters"
                prepend-icon="bx-filter"
              >
                Filtrer
              </VBtn>
              <VBtn
                color="secondary"
                variant="tonal"
                @click="resetFilters"
                prepend-icon="bx-undo"
                :disabled="!hasActiveFilters"
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
              <th class="text-uppercase text-caption font-weight-bold">Carburant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Quantité</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date d'achat</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement de l'historique…</div>
              </td>
            </tr>
            <tr v-else-if="historique.length === 0">
              <td colspan="5" class="text-center pa-8">
                <VIcon icon="bx-history" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ hasActiveFilters ? 'Aucun mouvement trouvé' : 'Aucun achat enregistré' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ hasActiveFilters ? 'Ajustez vos filtres' : 'Les achats apparaîtront ici' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(item, index) in historique"
              :key="item.idAchat || index"
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
                  <span class="font-weight-medium">{{ item.stationCarburant?.libelleStation || '-' }}</span>
                </div>
              </td>
              <td>
                <VChip size="small" color="info" variant="tonal" label>
                  {{ item.typeCarburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip color="success" variant="flat" size="small" label class="font-weight-bold px-3">
                  + {{ item.quantiteAchat || 0 }}
                </VChip>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(item.dateEnregistrement) }}
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
            {{ pagination.total || 0 }} mouvement(s) — Page {{ currentPage }} / {{ pagination.totalPages || 1 }}
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
    </VCol>

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

.avatar-placeholder {
  flex-shrink: 0;
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