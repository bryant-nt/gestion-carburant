<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useApprovisionnementStore } from '@/stores/approvisionnement'
import { useDemandeCarburantStore } from '@/stores/demandeCarburant'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'

// --- Gestion des photos protégées (JWT via Axios) -----------------------
// Identique aux composants Équipement et Demande.
// On utilise un cache réactif (Map) pour stocker les URLs locales.
const photoUrlCache = reactive(new Map())

// Charge une photo protégée via axios (avec token) et crée une URL objet.
const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return

  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
    console.log('✅ Photo protégée chargée pour ID', id)
  } catch (error) {
    console.error('❌ Impossible de charger la photo protégée pour ID', id, error)
    brokenPhotos.value.add(id)
  }
}

// Libère toutes les URLs objet créées
const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}

// Charge les photos par lots successifs (batchSize = 3) pour éviter de saturer le backend.
// Chaque élément peut avoir deux champs photo : photoTableauDeBordApres et screenshot.
// On génère une clé unique pour chaque type : 'apres-{id}' et 'screenshot-{id}'.
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

  // Exécution par lots pour ne pas surcharger le serveur
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    await Promise.all(batch)
  }
}

// Suivi des photos qui échouent pour afficher une icône par défaut
const brokenPhotos = ref(new Set())
const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}
// -----------------------------------------------------------------------

// Le backend renvoie dateEnregistrement en tableau [annee, mois, jour, heure, minute, seconde]
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

// Formulaire
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

// Snackbar
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

const idsDemandesServies = computed(() => {
  return new Set(approvisionnements.value.map(a => a.idDemande))
})
const estDejaServie = (idDemande) => idsDemandesServies.value.has(idDemande)

// Options
const demandeOptions = computed(() => {
  return demandes.value.map(d => ({
    title: `#${d.idDemande} - ${d.equipement?.immatriculationEquipement || 'N/A'} - ${d.quantiteDemandee || 0}L`,
    value: d.idDemande
  }))
})

const stationOptions = computed(() => {
  return stations.value.map(s => ({
    title: s.libelleStation,
    value: s.idStation
  }))
})

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

    // Charger les photos des approvisionnements (historique)
    await loadPhotosInBatches(approvisionnements.value, 3)
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

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Upload photos
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
    reader.onload = (e) => {
      photoApresPreview.value = e.target.result
    }
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
    reader.onload = (e) => {
      screenshotPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhotoApres = () => {
  formData.value.photoApresFile = null
  photoApresPreview.value = null
  const fileInput = document.getElementById('photoApresInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

const removeScreenshot = () => {
  formData.value.screenshotFile = null
  screenshotPreview.value = null
  const fileInput = document.getElementById('screenshotInput')
  if (fileInput) {
    fileInput.value = ''
  }
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

    // Charger les photos si présentes
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

// Validation
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

// Créer un approvisionnement
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

    if (photoApresPath) {
      data.photoTableauDeBordApres = photoApresPath
    }

    if (screenshotPath) {
      data.screenshot = screenshotPath
    }

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

// Appliquer les filtres
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

// Charger les données au montage
onMounted(() => {
  loadData()
})

// Libérer la mémoire des Object URLs au démontage
onUnmounted(() => {
  revokeAllPhotoUrls()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion des approvisionnements">
        <!-- Onglets -->
        <VTabs v-model="activeTab" color="primary" class="px-4">
          <VTab value="a-approvisionner">
            À approvisionner
          </VTab>
          <VTab value="historique">
            Historique
          </VTab>
        </VTabs>

        <!-- Filtres (historique uniquement) -->
        <VCardText v-if="activeTab === 'historique'">
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Demande, station..."
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="dateFrom"
                label="Date de début"
                type="datetime-local"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VTextField
                v-model="dateTo"
                label="Date de fin"
                type="datetime-local"
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn color="primary" variant="tonal" @click="applyFilters">
                Appliquer
              </VBtn>
              <VBtn color="secondary" variant="tonal" class="ml-2" @click="resetFilters">
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des demandes à approvisionner -->
        <VTable v-if="activeTab === 'a-approvisionner'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Demandeur</th>
              <th>Équipement</th>
              <th>Station</th>
              <th class="text-center">Qté demandée</th>
              <th class="text-center">Date</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="demandes.length === 0">
              <td colspan="7" class="text-center pa-4 text-medium-emphasis">
                Aucune demande en attente d'approvisionnement
              </td>
            </tr>
            <tr v-for="(demande, index) in demandes" :key="demande.idDemande || index">
              <td class="text-center">{{ index + 1 }}</td>
              <td>{{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }}</td>
              <td>{{ demande.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ demande.station?.libelleStation || '-' }}</td>
              <td class="text-center">
                <VChip size="small" label color="primary">
                  {{ demande.quantiteDemandee }} L
                </VChip>
              </td>
              <td class="text-center">{{ formatDate(demande.dateEnregistrement) }}</td>
              <td class="text-center">
                <VBtn
                  size="small"
                  color="primary"
                  prepend-icon="bx-gas-pump"
                  :disabled="estDejaServie(demande.idDemande)"
                  @click="openCreateDialog(demande)"
                >
                  {{ estDejaServie(demande.idDemande) ? 'Déjà servie' : 'Approvisionner' }}
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Tableau historique -->
        <VTable v-else-if="activeTab === 'historique'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo Après</th>
              <th>Demande</th>
              <th class="text-center">Quantité</th>
              <th class="text-center">Montant</th>
              <th class="text-center">Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="approvisionnements.length === 0">
              <td colspan="7" class="text-center pa-4 text-medium-emphasis">
                Aucun approvisionnement trouvé
              </td>
            </tr>
            <tr v-for="(item, index) in approvisionnements" :key="item.idApprovisionnement || index">
              <td class="text-center">{{ (pagination.page * pagination.size) + index + 1 }}</td>
              <td>
                <!-- Vignette photo après -->
                <div
                  class="photo-thumbnail"
                  :style="{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5'
                  }"
                >
                  <VImg
                    v-if="photoUrlCache.get('apres-' + item.idApprovisionnement) && !brokenPhotos.has('apres-' + item.idApprovisionnement)"
                    :src="photoUrlCache.get('apres-' + item.idApprovisionnement)"
                    cover
                    @error="onPhotoError('apres-' + item.idApprovisionnement)"
                  />
                  <VIcon v-else icon="bx-image" size="24" color="grey" />
                </div>
              </td>
              <td>#{{ item.idDemande }}</td>
              <td class="text-center">
                <VChip size="small" label color="success">
                  {{ item.quantiteRecue || 0 }} L
                </VChip>
              </td>
              <td class="text-center">
                {{ item.montantDepense ? item.montantDepense + ' F' : '-' }}
              </td>
              <td class="text-center">{{ formatDate(item.dateEnregistrement) }}</td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="info"
                  @click="openDetailDialog(item.idApprovisionnement)"
                >
                  <VIcon size="20" icon="bx-detail" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div v-if="activeTab === 'historique' && pagination.totalPages > 1" class="pa-4 d-flex justify-space-between align-center">
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

    <!-- Dialogue de création -->
    <VDialog v-model="showCreateDialog" max-width="600" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Enregistrer un approvisionnement</VCardTitle>
          <VCardSubtitle>Saisissez les informations de l'approvisionnement</VCardSubtitle>
        </VCardItem>
        <VCardText style="max-height: 65vh; overflow-y: auto;">
          <VForm @submit.prevent="createApprovisionnement">
            <!-- Photo Après -->
            <div class="d-flex align-center mb-4">
              <div
                class="photo-preview"
                :style="{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  marginRight: '16px'
                }"
              >
                <VImg v-if="photoApresPreview" :src="photoApresPreview" cover />
                <VIcon v-else icon="bx-image" size="40" color="grey" />
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Photo tableau de bord (après)</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.photoApresInput.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoApresPreview" size="small" variant="tonal" color="error" @click="removePhotoApres">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input ref="photoApresInput" id="photoApresInput" type="file" accept="image/*" class="d-none" @change="onPhotoApresChange" />
              </div>
            </div>

            <VDivider class="mb-4" />

            <!-- Screenshot -->
            <div class="d-flex align-center mb-4">
              <div
                class="photo-preview"
                :style="{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  marginRight: '16px'
                }"
              >
                <VImg v-if="screenshotPreview" :src="screenshotPreview" cover />
                <VIcon v-else icon="bx-image" size="40" color="grey" />
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Capture / preuve pompe (screenshot)</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.screenshotInput.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="screenshotPreview" size="small" variant="tonal" color="error" @click="removeScreenshot">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
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
              :error-messages="formErrors.idDemande"
              :loading="loading"
              :disabled="!!formData.idDemande"
              :hint="formData.idDemande ? 'Pré-remplie depuis la liste' : ''"
              persistent-hint
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1">
                    <VIcon icon="bx-info-circle" size="20" class="me-1" />
                    Aucune demande prête pour approvisionnement
                  </p>
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
              :error-messages="formErrors.idStation"
              :loading="loading"
              class="mt-4"
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
                  :error-messages="formErrors.quantiteRecue"
                  class="mt-4"
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
                  class="mt-4"
                />
              </VCol>
            </VRow>

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showCreateDialog = false" :disabled="isSubmitting">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting">
                Enregistrer
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de détail -->
    <VDialog v-model="showDetailDialog" max-width="600">
      <VCard>
        <VCardItem>
          <VCardTitle>Détail de l'approvisionnement</VCardTitle>
          <VCardSubtitle>Informations complètes</VCardSubtitle>
        </VCardItem>
        <VCardText v-if="approvisionnementCourant">
          <VList>
            <VListItem>
              <VListItemTitle>Demande</VListItemTitle>
              <VListItemSubtitle>#{{ approvisionnementCourant.idDemande }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Quantité reçue</VListItemTitle>
              <VListItemSubtitle>{{ approvisionnementCourant.quantiteRecue || 0 }} L</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="approvisionnementCourant.montantDepense">
              <VListItemTitle>Montant dépensé</VListItemTitle>
              <VListItemSubtitle>{{ approvisionnementCourant.montantDepense }} F</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Date</VListItemTitle>
              <VListItemSubtitle>{{ formatDate(approvisionnementCourant.dateEnregistrement, true) }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="approvisionnementCourant.photoTableauDeBordApres">
              <VListItemTitle>Photo après plein</VListItemTitle>
              <VListItemSubtitle>
                <div
                  class="detail-photo"
                  :style="{
                    maxWidth: '350px',
                    maxHeight: '250px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #e0e0e0',
                    marginTop: '8px'
                  }"
                >
                  <VImg
                    v-if="photoUrlCache.get('apres-' + approvisionnementCourant.idApprovisionnement)"
                    :src="photoUrlCache.get('apres-' + approvisionnementCourant.idApprovisionnement)"
                    cover
                    width="100%"
                    height="100%"
                  />
                  <VProgressCircular v-else indeterminate color="primary" size="24" class="mt-2" />
                </div>
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="approvisionnementCourant.screenshot">
              <VListItemTitle>Preuve pompe</VListItemTitle>
              <VListItemSubtitle>
                <div
                  class="detail-photo"
                  :style="{
                    maxWidth: '350px',
                    maxHeight: '250px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #e0e0e0',
                    marginTop: '8px'
                  }"
                >
                  <VImg
                    v-if="photoUrlCache.get('screenshot-' + approvisionnementCourant.idApprovisionnement)"
                    :src="photoUrlCache.get('screenshot-' + approvisionnementCourant.idApprovisionnement)"
                    cover
                    width="100%"
                    height="100%"
                  />
                  <VProgressCircular v-else indeterminate color="primary" size="24" class="mt-2" />
                </div>
              </VListItemSubtitle>
            </VListItem>
          </VList>
        </VCardText>
        <VCardActions class="d-flex justify-end pa-4">
          <VBtn variant="tonal" color="secondary" @click="showDetailDialog = false">
            Fermer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout" location="top end" variant="flat">
      <VIcon :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'" size="24" class="me-2" />
      {{ snackbar.message }}
      <template #actions>
        <VBtn variant="text" icon="bx-x" @click="snackbar.show = false" />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
.photo-thumbnail {
  transition: transform 0.2s;
}
.photo-thumbnail:hover {
  transform: scale(1.1);
  border-color: #1976d2;
}
.detail-photo {
  background: #f5f5f5;
}
.photo-preview {
  transition: border-color 0.2s;
}
.photo-preview:hover {
  border-color: #1976d2;
}
</style>