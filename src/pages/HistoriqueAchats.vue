<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStockCarburantStore } from '@/stores/stockCarburant'
import { useStationsStore } from '@/stores/stations'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/dateHelpers'

// Initialisation des stores
const stockStore = useStockCarburantStore()
const stationsStore = useStationsStore()
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// État du snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const filterStation = ref(null)
const filterCarburant = ref(null)
const dateFrom = ref(null)
const dateTo = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Computed
const historique = computed(() => stockStore.historique)
const loading = computed(() => stockStore.loading)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => typeCarburantStore.allTypes)
const pagination = computed(() => stockStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Options pour les selects
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

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      stationsStore.fetchStations(),
      typeCarburantStore.fetchTypes()
    ])
    await loadHistorique()
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur lors du chargement des données:', error)
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
  currentPage.value = 1
  loadHistorique()
}

// Charger les données au montage
onMounted(() => {
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Historique des achats carburant">
        <VCardSubtitle>
          Liste de tous les mouvements d'achat avec filtres par date
        </VCardSubtitle>

        <!-- Filtres -->
        <VCardText>
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
                density="compact"
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
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VTextField
                v-model="dateFrom"
                label="Date de début"
                type="datetime-local"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VTextField
                v-model="dateTo"
                label="Date de fin"
                type="datetime-local"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn
                color="primary"
                variant="tonal"
                @click="applyFilters"
              >
                Appliquer les filtres
              </VBtn>
              <VBtn
                color="secondary"
                variant="tonal"
                class="ml-2"
                @click="resetFilters"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau de l'historique -->
        <VTable>
          <thead>
            <tr>
              <th class="text-uppercase text-center">
                N°
              </th>
              <th>
                Station
              </th>
              <th>
                Carburant
              </th>
              <th class="text-center">
                Quantité
              </th>
              <th class="text-center">
                Date d'enregistrement
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="historique.length === 0">
              <td colspan="5" class="text-center pa-4 text-medium-emphasis">
                Aucun historique trouvé
              </td>
            </tr>
            <tr
              v-for="(item, index) in historique"
              :key="item.idAchat || index"
            >
              <td class="text-center">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                {{ item.stationCarburant?.libelleStation || '-' }}
              </td>
              <td>
                {{ item.typeCarburant?.libelleCarburant || '-' }}
              </td>
              <td class="text-center">
                <VChip
                  color="success"
                  size="small"
                  label
                >
                  + {{ item.quantiteAchat || 0 }}
                </VChip>
              </td>
              <td class="text-center">
                {{ formatDate(item.dateEnregistrement) }}
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div class="pa-4 d-flex justify-space-between align-center" v-if="pagination.totalPages > 1">
          <span class="text-caption text-medium-emphasis">
            {{ pagination.total }} élément(s)
          </span>
          <VPagination
            v-model="currentPage"
            :length="pagination.totalPages"
            :total-visible="5"
            @update:model-value="changePage"
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
    >
      <VIcon
        :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'"
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