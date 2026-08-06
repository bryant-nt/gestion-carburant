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

// État du dialogue d'achat
const showAchatDialog = ref(false)
const isSubmitting = ref(false)
const achatForm = ref({
  idStation: null,
  idCarburant: null,
  quantiteAchat: null,
  dateEnregistrement: null
})
const achatErrors = ref({})

// État du snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
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
    await loadAchats()
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur lors du chargement des données:', error)
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
    console.error('Erreur lors de l\'enregistrement:', error)
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

// Charger les données au montage
onMounted(() => {
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion des achats carburant">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openAchatDialog"
          >
            Enregistrer un achat
          </VBtn>
        </template>

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
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Station ou carburant"
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
                @keyup.enter="applyFilters"
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

        <!-- Tableau des achats -->
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
                Quantité achetée
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
            <tr v-else-if="achats.length === 0">
              <td colspan="5" class="text-center pa-4 text-medium-emphasis">
                Aucun achat trouvé
              </td>
            </tr>
            <tr
              v-for="(achat, index) in achats"
              :key="achat.idAchat || index"
            >
              <td class="text-center">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                {{ achat.stationCarburant?.libelleStation || '-' }}
              </td>
              <td>
                {{ achat.typeCarburant?.libelleCarburant || '-' }}
              </td>
              <td class="text-center">
                <VChip
                  color="primary"
                  size="small"
                  label
                >
                  {{ achat.quantiteAchat || 0 }}
                </VChip>
              </td>
              <td class="text-center">
                {{ formatDate(achat.dateEnregistrement) }}
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

    <!-- Dialogue d'enregistrement d'achat -->
    <VDialog
      v-model="showAchatDialog"
      max-width="500"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle>
            Enregistrer un achat
          </VCardTitle>
          <VCardSubtitle>
            Saisissez les informations de l'achat de carburant
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
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
              class="mt-4"
            />

            <VTextField
              v-model="achatForm.quantiteAchat"
              label="Quantité"
              placeholder="Ex: 5000"
              type="number"
              :error-messages="achatErrors.quantiteAchat"
              class="mt-4"
            />

            <VTextField
              v-model="achatForm.dateEnregistrement"
              label="Date d'enregistrement (optionnelle)"
              type="datetime-local"
              class="mt-4"
            />

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="showAchatDialog = false"
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