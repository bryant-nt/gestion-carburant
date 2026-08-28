<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useApprovisionnementStore } from '@/stores/approvisionnement'
import { useDemandeCarburantStore } from '@/stores/demandeCarburant'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'

// --- Gestion des photos protégées ---------------------------------------
const photoUrlCache = reactive(new Map())
const brokenPhotos = ref(new Set())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return
  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
  } catch (error) {
    console.error('❌ Impossible de charger la photo pour ID', id, error)
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
    if (item.photoTableauDeBordApres) {
      tasks.push(loadAuthenticatedPhoto(`apres-${item.idApprovisionnement}`, item.photoTableauDeBordApres))
    }
    if (item.screenshot) {
      tasks.push(loadAuthenticatedPhoto(`screenshot-${item.idApprovisionnement}`, item.screenshot))
    }
  }
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    await Promise.all(batch)
  }
}

const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}
// -----------------------------------------------------------------------

// Helpers
const parseBackendDate = (value) => {
  if (!value) return null
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    return new Date(year, month - 1, day, hour, minute, second)
  }
  return new Date(value)
}

const formatDate = (value, withTime = false) => {
  const date = parseBackendDate(value)
  if (!date || isNaN(date.getTime())) return '-'
  return withTime ? date.toLocaleString('fr-FR') : date.toLocaleDateString('fr-FR')
}

// Stores
const approvisionnementStore = useApprovisionnementStore()
const demandeStore = useDemandeCarburantStore()
const stationsStore = useStationsStore()
const authStore = useAuthStore()

// États
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const isSubmitting = ref(false)

const formData = ref({
  idDemande: null,
  idStation: null,
  quantiteRecue: null,
  montantDepense: null,
  photoTableauDeBordApres: null,
  photoApresFile: null,
  screenshot: null,
  screenshotFile: null,
  clientOperationId: null
})
const formErrors = ref({})
const photoApresPreview = ref(null)
const screenshotPreview = ref(null)

const approvisionnementCourant = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const dateFrom = ref(null)
const dateTo = ref(null)
const activeTab = ref('a-approvisionner')

// Computed
const approvisionnements = computed(() => approvisionnementStore.approvisionnements || [])
const demandes = computed(() => demandeStore.demandesPourApprovisionnement || [])
const stations = computed(() => stationsStore.allStations)
const loading = computed(() => approvisionnementStore.loading || demandeStore.loading || stationsStore.loading)
const pagination = computed(() => approvisionnementStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Statistiques
const totalApprovisionnements = computed(() => approvisionnements.value.length)
const totalQuantite = computed(() =>
  approvisionnements.value.reduce((sum, a) => sum + (a.quantiteRecue || 0), 0)
)
const totalMontant = computed(() =>
  approvisionnements.value.reduce((sum, a) => sum + (a.montantDepense || 0), 0)
)
const demandesEnAttente = computed(() =>
  demandes.value.filter(d => !idsDemandesServies.value.has(d.idDemande)).length
)

const idsDemandesServies = computed(() => {
  return new Set(approvisionnements.value.map(a => a.idDemande))
})
const estDejaServie = (idDemande) => idsDemandesServies.value.has(idDemande)

// Options
const demandeOptions = computed(() =>
  demandes.value.map(d => ({
    title: `#${d.idDemande} - ${d.equipement?.immatriculationEquipement || 'N/A'} - ${d.quantiteDemandee || 0}L`,
    value: d.idDemande
  }))
)

const stationOptions = computed(() =>
  stations.value.map(s => ({
    title: s.libelleStation,
    value: s.idStation
  }))
)

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      approvisionnementStore.fetchApprovisionnementsPaged({
        page: currentPage.value - 1,
        size: itemsPerPage.value
      }),
      demandeStore.fetchDemandesPourApprovisionnement(),
      stationsStore.fetchStations()
    ])
    await loadPhotosInBatches(approvisionnements.value, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur:', error)
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color, timeout: 3000 }
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Photos
const onPhotoApresChange = (event) => {
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
    formData.value.photoApresFile = file
    const reader = new FileReader()
    reader.onload = (e) => { photoApresPreview.value = e.target.result }
    reader.readAsDataURL(file)
  }
}

const onScreenshotChange = (event) => {
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
    formData.value.screenshotFile = file
    const reader = new FileReader()
    reader.onload = (e) => { screenshotPreview.value = e.target.result }
    reader.readAsDataURL(file)
  }
}

const removePhotoApres = () => {
  formData.value.photoApresFile = null
  photoApresPreview.value = null
  const fileInput = document.getElementById('photoApresInput')
  if (fileInput) fileInput.value = ''
}

const removeScreenshot = () => {
  formData.value.screenshotFile = null
  screenshotPreview.value = null
  const fileInput = document.getElementById('screenshotInput')
  if (fileInput) fileInput.value = ''
}

// Dialogues
const openCreateDialog = (demande = null) => {
  formData.value = {
    idDemande: demande?.idDemande || null,
    idStation: demande?.station?.idStation || null,
    quantiteRecue: demande?.quantiteDemandee || null,
    montantDepense: null,
    photoTableauDeBordApres: null,
    photoApresFile: null,
    screenshot: null,
    screenshotFile: null,
    clientOperationId: generateUUID()
  }
  photoApresPreview.value = null
  screenshotPreview.value = null
  formErrors.value = {}
  showCreateDialog.value = true
}

const openDetailDialog = async (id) => {
  try {
    const data = await approvisionnementStore.fetchApprovisionnementById(id)
    approvisionnementCourant.value = data
    const tasks = []
    if (data.photoTableauDeBordApres) {
      tasks.push(loadAuthenticatedPhoto(`apres-${data.idApprovisionnement}`, data.photoTableauDeBordApres))
    }
    if (data.screenshot) {
      tasks.push(loadAuthenticatedPhoto(`screenshot-${data.idApprovisionnement}`, data.screenshot))
    }
    await Promise.all(tasks)
    showDetailDialog.value = true
  } catch (error) {
    showNotification('Erreur lors du chargement du détail', 'error')
  }
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.idDemande) errors.idDemande = 'La demande est requise'
  if (!formData.value.idStation) errors.idStation = 'La station est requise'
  if (!formData.value.quantiteRecue || formData.value.quantiteRecue <= 0) {
    errors.quantiteRecue = 'La quantité doit être supérieure à 0'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const createApprovisionnement = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    let photoApresPath = null
    if (formData.value.photoApresFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('photoApres', formData.value.photoApresFile)
      const response = await approvisionnementStore.uploadPhotoApres(formDataPhoto)
      photoApresPath = response?.photoTableauDeBordApres
    }

    let screenshotPath = null
    if (formData.value.screenshotFile) {
      const formDataScreenshot = new FormData()
      formDataScreenshot.append('screenshot', formData.value.screenshotFile)
      const response = await approvisionnementStore.uploadScreenshot(formDataScreenshot)
      screenshotPath = response?.screenshot
    }

    const data = {
      idDemande: Number(formData.value.idDemande),
      idStation: Number(formData.value.idStation),
      quantiteApprovisionnee: parseFloat(formData.value.quantiteRecue),
      clientOperationId: formData.value.clientOperationId || generateUUID()
    }

    if (formData.value.montantDepense) {
      data.montantDepense = parseFloat(formData.value.montantDepense)
    }
    if (photoApresPath) data.photoTableauDeBordApres = photoApresPath
    if (screenshotPath) data.screenshot = screenshotPath

    await approvisionnementStore.createApprovisionnement(data)
    showNotification('Approvisionnement enregistré avec succès ! ✅', 'success')
    showCreateDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
    showNotification('Erreur lors de l\'enregistrement', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const applyFilters = () => {
  currentPage.value = 1
  const params = {
    page: currentPage.value - 1,
    size: itemsPerPage.value
  }
  if (searchQuery.value) params.search = searchQuery.value
  if (dateFrom.value) params.dateFrom = dateFrom.value
  if (dateTo.value) params.dateTo = dateTo.value
  approvisionnementStore.fetchApprovisionnementsPaged(params)
    .then(() => loadPhotosInBatches(approvisionnements.value, 3))
}

const resetFilters = () => {
  searchQuery.value = ''
  dateFrom.value = null
  dateTo.value = null
  currentPage.value = 1
  loadData()
}

const changePage = (newPage) => {
  currentPage.value = newPage
  const params = {
    page: currentPage.value - 1,
    size: itemsPerPage.value
  }
  if (searchQuery.value) params.search = searchQuery.value
  if (dateFrom.value) params.dateFrom = dateFrom.value
  if (dateTo.value) params.dateTo = dateTo.value
  approvisionnementStore.fetchApprovisionnementsPaged(params)
    .then(() => loadPhotosInBatches(approvisionnements.value, 3))
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
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des approvisionnements</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Enregistrez les approvisionnements en carburant et suivez l'historique
          </p>
        </div>
        <div class="d-flex gap-3">
          <VBtn
            color="primary"
            size="large"
            prepend-icon="bx-plus"
            @click="openCreateDialog()"
            elevation="2"
          >
            Nouvel approvisionnement
          </VBtn>
        </div>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-gas-pump" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total approvisionnements
                </div>
                <div class="text-h4 font-weight-bold">{{ totalApprovisionnements }}</div>
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
                  Quantité totale (L)
                </div>
                <div class="text-h4 font-weight-bold">{{ totalQuantite.toFixed(1) }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-money" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Montant total dépensé
                </div>
                <div class="text-h4 font-weight-bold">{{ totalMontant.toLocaleString() }} F</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="warning" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-warning-light pa-3 me-4">
                <VIcon icon="bx-clock" size="28" color="warning" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Demandes en attente
                </div>
                <div class="text-h4 font-weight-bold">{{ demandesEnAttente }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <VTabs v-model="activeTab" color="primary" class="px-4 pt-2">
          <VTab value="a-approvisionner">
            <VIcon icon="bx-clock" size="18" class="me-1" />
            À approvisionner
            <VChip v-if="demandesEnAttente > 0" size="x-small" color="warning" class="ms-1">
              {{ demandesEnAttente }}
            </VChip>
          </VTab>
          <VTab value="historique">
            <VIcon icon="bx-history" size="18" class="me-1" />
            Historique
            <VChip size="x-small" color="primary" variant="tonal" class="ms-1">
              {{ totalApprovisionnements }}
            </VChip>
          </VTab>
        </VTabs>

        <VDivider />

        <!-- Filtres (historique) -->
        <VCardText v-if="activeTab === 'historique'" class="pt-4">
          <VRow align="center">
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Demande, station…"
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="dateFrom"
                label="Date de début"
                type="datetime-local"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="dateTo"
                label="Date de fin"
                type="datetime-local"
                density="comfortable"
                variant="outlined"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="auto" class="d-flex gap-2">
              <VBtn color="primary" variant="flat" @click="applyFilters" prepend-icon="bx-filter">
                Filtrer
              </VBtn>
              <VBtn color="secondary" variant="tonal" @click="resetFilters" prepend-icon="bx-undo">
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Table: À approvisionner -->
        <VTable v-if="activeTab === 'a-approvisionner'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold">Demandeur</th>
              <th class="text-uppercase text-caption font-weight-bold">Équipement</th>
              <th class="text-uppercase text-caption font-weight-bold">Station</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Qté demandée</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:160px;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des demandes…</div>
              </td>
            </tr>
            <tr v-else-if="demandes.length === 0">
              <td colspan="7" class="text-center pa-8">
                <VIcon icon="bx-check-circle" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  Aucune demande en attente
                </div>
                <p class="text-caption text-medium-emphasis">
                  Toutes les demandes approuvées ont déjà été approvisionnées
                </p>
              </td>
            </tr>
            <tr v-for="(demande, index) in demandes" :key="demande.idDemande || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">{{ index + 1 }}</td>
              <td>
                <div class="font-weight-medium">
                  {{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }}
                </div>
              </td>
              <td>{{ demande.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ demande.station?.libelleStation || '-' }}</td>
              <td class="text-center">
                <VChip color="primary" variant="tonal" size="small" label class="font-weight-bold px-3">
                  {{ demande.quantiteDemandee }} L
                </VChip>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(demande.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VBtn
                  size="small"
                  color="primary"
                  prepend-icon="bx-gas-pump"
                  :disabled="estDejaServie(demande.idDemande)"
                  @click="openCreateDialog(demande)"
                  :class="{ 'opacity-50': estDejaServie(demande.idDemande) }"
                >
                  {{ estDejaServie(demande.idDemande) ? 'Déjà servie' : 'Approvisionner' }}
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Table: Historique -->
        <VTable v-else-if="activeTab === 'historique'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo après</th>
              <th class="text-uppercase text-caption font-weight-bold">Demande</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Quantité</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Montant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:80px;">Détail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement de l'historique…</div>
              </td>
            </tr>
            <tr v-else-if="approvisionnements.length === 0">
              <td colspan="7" class="text-center pa-8">
                <VIcon icon="bx-history" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  Aucun approvisionnement enregistré
                </div>
                <p class="text-caption text-medium-emphasis">
                  Les approvisionnements apparaîtront ici
                </p>
              </td>
            </tr>
            <tr v-for="(item, index) in approvisionnements" :key="item.idApprovisionnement || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get('apres-' + item.idApprovisionnement) || brokenPhotos.has('apres-' + item.idApprovisionnement)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('apres-' + item.idApprovisionnement) || brokenPhotos.has('apres-' + item.idApprovisionnement)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get('apres-' + item.idApprovisionnement) && !brokenPhotos.has('apres-' + item.idApprovisionnement)"
                    :src="photoUrlCache.get('apres-' + item.idApprovisionnement)"
                    cover
                    @error="onPhotoError('apres-' + item.idApprovisionnement)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td>
                <span class="font-weight-medium">#{{ item.idDemande }}</span>
              </td>
              <td class="text-center">
                <VChip color="success" variant="tonal" size="small" label class="font-weight-bold px-3">
                  {{ item.quantiteRecue || 0 }} L
                </VChip>
              </td>
              <td class="text-center text-medium-emphasis">
                {{ item.montantDepense ? item.montantDepense.toLocaleString() + ' F' : '-' }}
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(item.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VTooltip text="Voir le détail">
                  <template #activator="{ props }">
                    <VBtn
                      v-bind="props"
                      icon
                      variant="text"
                      size="small"
                      color="info"
                      @click="openDetailDialog(item.idApprovisionnement)"
                    >
                      <VIcon size="20" icon="bx-detail" />
                    </VBtn>
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination (historique) -->
        <div
          v-if="activeTab === 'historique' && pagination.totalPages > 1"
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
        >
          <span class="text-caption text-medium-emphasis">
            {{ pagination.total }} élément(s) — Page {{ currentPage }} / {{ pagination.totalPages || 1 }}
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
        <div
          v-else-if="activeTab === 'a-approvisionner' && demandes.length > 0"
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
        >
          <span class="text-caption text-medium-emphasis">
            {{ demandes.length }} demande(s) en attente
          </span>
        </div>
      </VCard>
    </VCol>

    <!-- Dialog: Nouvel approvisionnement -->
    <VDialog v-model="showCreateDialog" max-width="660" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-plus-circle" color="primary" size="28" />
            Enregistrer un approvisionnement
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            Saisissez les informations de l'approvisionnement
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6" style="max-height: 65vh; overflow-y: auto;">
          <VForm @submit.prevent="createApprovisionnement">
            <!-- Photo après -->
            <div class="d-flex align-center mb-6">
              <VAvatar
                size="64"
                :color="!photoApresPreview ? 'primary' : undefined"
                :variant="!photoApresPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="photoApresPreview" :src="photoApresPreview" cover />
                <VIcon v-else icon="bx-image" size="32" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                  Photo tableau de bord (après)
                </div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" prepend-icon="bx-upload" @click="$refs.photoApresInput?.click()">
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoApresPreview" size="small" variant="tonal" color="error" prepend-icon="bx-trash" @click="removePhotoApres">
                    Supprimer
                  </VBtn>
                </div>
                <input ref="photoApresInput" id="photoApresInput" type="file" accept="image/*" class="d-none" @change="onPhotoApresChange" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VDivider class="mb-4" />

            <!-- Screenshot -->
            <div class="d-flex align-center mb-6">
              <VAvatar
                size="64"
                :color="!screenshotPreview ? 'primary' : undefined"
                :variant="!screenshotPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="screenshotPreview" :src="screenshotPreview" cover />
                <VIcon v-else icon="bx-image" size="32" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                  Capture / preuve pompe (screenshot)
                </div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" prepend-icon="bx-upload" @click="$refs.screenshotInput?.click()">
                    Choisir
                  </VBtn>
                  <VBtn v-if="screenshotPreview" size="small" variant="tonal" color="error" prepend-icon="bx-trash" @click="removeScreenshot">
                    Supprimer
                  </VBtn>
                </div>
                <input ref="screenshotInput" id="screenshotInput" type="file" accept="image/*" class="d-none" @change="onScreenshotChange" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VDivider class="mb-4" />

            <VSelect
              v-model="formData.idDemande"
              label="Demande"
              :items="demandeOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une demande approuvée"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idDemande"
              :loading="loading"
              :disabled="!!formData.idDemande"
              hide-details="auto"
              class="mb-4"
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1"><VIcon icon="bx-info-circle" size="20" class="me-1" /> Aucune demande prête pour approvisionnement</p>
                </div>
              </template>
            </VSelect>

            <VSelect
              v-model="formData.idStation"
              label="Station"
              :items="stationOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une station"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idStation"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
            />

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.quantiteRecue"
                  label="Quantité reçue (Litres)"
                  placeholder="Ex: 35"
                  type="number"
                  min="0"
                  step="0.1"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.quantiteRecue"
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.montantDepense"
                  label="Montant dépensé (optionnel)"
                  placeholder="Ex: 50000"
                  type="number"
                  min="0"
                  step="0.1"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </VCol>
            </VRow>

            <VDivider class="mt-4 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="showCreateDialog = false"
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

    <!-- Dialog: Détail -->
    <VDialog v-model="showDetailDialog" max-width="640" transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-detail" color="info" size="28" />
            Détail de l'approvisionnement
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">Informations complètes</VCardSubtitle>
        </VCardItem>

        <VCardText v-if="approvisionnementCourant" class="pt-4">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Demande</div>
              <div class="font-weight-medium">#{{ approvisionnementCourant.idDemande }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Quantité reçue</div>
              <VChip color="success" variant="tonal" size="small" label>
                {{ approvisionnementCourant.quantiteRecue || 0 }} L
              </VChip>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Montant dépensé</div>
              <div>{{ approvisionnementCourant.montantDepense ? approvisionnementCourant.montantDepense.toLocaleString() + ' F' : '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Date</div>
              <div>{{ formatDate(approvisionnementCourant.dateEnregistrement, true) }}</div>
            </div>
            <div v-if="approvisionnementCourant.photoTableauDeBordApres" class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo après plein</div>
              <div class="detail-photo-wrapper">
                <VImg
                  v-if="photoUrlCache.get('apres-' + approvisionnementCourant.idApprovisionnement)"
                  :src="photoUrlCache.get('apres-' + approvisionnementCourant.idApprovisionnement)"
                  max-width="350"
                  max-height="250"
                  cover
                  rounded
                  class="detail-photo"
                />
                <VProgressCircular v-else indeterminate color="primary" size="32" />
              </div>
            </div>
            <div v-if="approvisionnementCourant.screenshot" class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Preuve pompe</div>
              <div class="detail-photo-wrapper">
                <VImg
                  v-if="photoUrlCache.get('screenshot-' + approvisionnementCourant.idApprovisionnement)"
                  :src="photoUrlCache.get('screenshot-' + approvisionnementCourant.idApprovisionnement)"
                  max-width="350"
                  max-height="250"
                  cover
                  rounded
                  class="detail-photo"
                />
                <VProgressCircular v-else indeterminate color="primary" size="32" />
              </div>
            </div>
          </div>
        </VCardText>

        <VCardActions class="d-flex justify-end pa-4 pt-0">
          <VBtn variant="tonal" color="secondary" @click="showDetailDialog = false" size="large">
            Fermer
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
          :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'"
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
.bg-primary-light { background-color: rgba(var(--v-theme-primary), 0.10); }
.bg-success-light { background-color: rgba(var(--v-theme-success), 0.10); }
.bg-info-light { background-color: rgba(var(--v-theme-info), 0.10); }
.bg-warning-light { background-color: rgba(var(--v-theme-warning), 0.10); }

/* ========== MAIN CARD ========== */
.main-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.border-bottom { border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.border-top { border-top: 1px solid rgba(0, 0, 0, 0.06); }

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
.custom-table tbody tr:last-child td { border-bottom: none; }
.table-row { transition: background-color 0.15s ease; }
.table-row:hover { background-color: rgba(var(--v-theme-primary), 0.03); }

/* ========== DIALOG ========== */
.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

/* ========== DETAIL ========== */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: 1 / -1; }
.detail-photo-wrapper {
  margin-top: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px;
  display: inline-block;
}
.detail-photo {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  max-width: 350px;
  max-height: 250px;
}

/* ========== SNACKBAR ========== */
.snackbar-custom { border: 1px solid rgba(255, 255, 255, 0.12); }

/* ========== RESPONSIVE ========== */
@media (max-width: 600px) {
  .stat-card .text-h4 { font-size: 1.5rem; }
  .stat-icon { width: 40px; height: 40px; }
  .stat-icon .v-icon { font-size: 20px !important; }
}
@media (max-width: 960px) {
  .custom-table thead th { font-size: 0.65rem; padding: 8px 10px; }
  .custom-table tbody td { padding: 8px 10px; font-size: 0.85rem; }
  .detail-grid { grid-template-columns: 1fr; }
}

/* ========== UTILITY ========== */
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.flex-wrap { flex-wrap: wrap; }
.opacity-50 { opacity: 0.5; }
</style>