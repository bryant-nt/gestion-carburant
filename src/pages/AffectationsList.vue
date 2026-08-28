<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useAffectationsStore } from '@/stores/affectations'
import { useEquipementsStore } from '@/stores/equipements'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'

// --- Gestion des photos protégées ---
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
    if (item.photoTableauBord) {
      const id = item.idEquipementUtilisateur || item.idHistorique || `photo-${Math.random()}`
      tasks.push(loadAuthenticatedPhoto(`affectation-${id}`, item.photoTableauBord))
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

// Stores
const affectationsStore = useAffectationsStore()
const equipementsStore = useEquipementsStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()

// État des dialogues
const showAffecterDialog = ref(false)
const showParkingDialog = ref(false)
const showTransfertDialog = ref(false)
const showHistoriqueDetailDialog = ref(false)
const isSubmitting = ref(false)
const transfertType = ref('')

// Formulaires
const affecterForm = ref({
  idEquipement: null,
  utilisateurId: null,
  niveauCarburant: null,
  photoTableauBord: null,
  photoFile: null,
  clientOperationId: null
})
const affecterErrors = ref({})
const photoPreview = ref(null)

const parkingForm = ref({
  idEquipement: null,
  niveauCarburant: null,
  photoTableauBord: null,
  photoFile: null,
  clientOperationId: null
})
const parkingPhotoPreview = ref(null)

const historiqueDetail = ref(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Onglets et filtres
const activeTab = ref('affectes')
const searchQuery = ref('')
const filterStatut = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const dateFrom = ref(null)
const dateTo = ref(null)
const includeAll = ref(false)

// Computed
const equipementsAffectes = computed(() => affectationsStore.equipementsAffectes)
const equipementsDisponibles = computed(() => affectationsStore.equipementsDisponibles)
const equipementsParEtat = computed(() => affectationsStore.equipementsParEtat)
const historique = computed(() => affectationsStore.historique)
const loading = computed(() => affectationsStore.loading)
const equipements = computed(() => equipementsStore.equipements)
const users = computed(() => usersStore.users)
const isAdmin = computed(() => authStore.isAdmin)
const currentUser = computed(() => authStore.user)
const pagination = computed(() => affectationsStore.pagination)

// Statistiques
const totalAffectes = computed(() => equipementsAffectes.value.length)
const totalDisponibles = computed(() => equipementsDisponibles.value.length)
const totalParking = computed(() => {
  return equipementsParEtat.value.filter(e => e.equipementEtat?.statut === 'Parking').length
})
const totalGarage = computed(() => {
  return equipementsParEtat.value.filter(e => e.equipementEtat?.statut === 'Garage').length
})
const totalHistorique = computed(() => pagination.value?.total || 0)

// Options
const equipementDisponibleOptions = computed(() => {
  const list = equipementsDisponibles.value || []
  return list.map(e => {
    const equip = e.equipement || e
    return {
      title: `${equip.immatriculationEquipement || 'N/A'} - ${equip.marqueEquipement || ''} ${equip.modeleEquipement || ''}`.trim() || 'Équipement sans nom',
      value: e.idEquipement || equip.idEquipement
    }
  })
})

const equipementAffecteOptions = computed(() => {
  return equipementsAffectes.value.map(e => {
    const equip = e.equipement || e
    return {
      title: `${equip.immatriculationEquipement || 'N/A'} - ${equip.marqueEquipement || ''} ${equip.modeleEquipement || ''}`.trim() || 'Équipement sans nom',
      value: e.idEquipement || equip.idEquipement
    }
  })
})

const userOptions = computed(() => {
  return users.value.map(u => ({
    title: `${u.prenomUtilisateur || ''} ${u.nomUtilisateur || ''}`.trim() || 'Utilisateur sans nom',
    value: u.utilisateurId
  }))
})

const statutOptions = [
  { title: 'Parking', value: 'PARKING' },
  { title: 'Garage', value: 'GARAGE' },
  { title: 'Affecté', value: 'AFFECTE' }
]

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      affectationsStore.fetchMesEquipementsAffectes(),
      affectationsStore.fetchEquipementsDisponibles(),
      equipementsStore.fetchEquipements(),
      usersStore.fetchUsers()
    ])
    await loadPhotosInBatches(equipementsAffectes.value, 3)
    await loadPhotosInBatches(equipementsDisponibles.value, 3)
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
    if (dateFrom.value) params.dateFrom = dateFrom.value
    if (dateTo.value) params.dateTo = dateTo.value
    if (includeAll.value) params.includeAll = true
    await affectationsStore.fetchHistorique(params)
    await loadPhotosInBatches(historique.value, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement de l\'historique', 'error')
  }
}

const loadEquipementsParEtat = async () => {
  if (filterStatut.value) {
    await affectationsStore.fetchEquipementsParEtat(filterStatut.value)
    await loadPhotosInBatches(equipementsParEtat.value, 3)
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color, timeout: 3000 }
}

const onTabChange = (tab) => {
  activeTab.value = tab
  if (tab === 'historique') loadHistorique()
  if (tab === 'par-etat' && filterStatut.value) loadEquipementsParEtat()
}

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

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const onPhotoChange = (event, form, previewRef) => {
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
    form.photoFile = file
    const reader = new FileReader()
    reader.onload = (e) => { previewRef.value = e.target.result }
    reader.readAsDataURL(file)
  }
}

const removePhoto = (form, previewRef, inputId) => {
  form.photoFile = null
  previewRef.value = null
  const fileInput = document.getElementById(inputId)
  if (fileInput) fileInput.value = ''
}

// Dialogs
const openAffecterDialog = () => {
  affecterForm.value = {
    idEquipement: null,
    utilisateurId: null,
    niveauCarburant: null,
    photoTableauBord: null,
    photoFile: null,
    clientOperationId: generateUUID()
  }
  photoPreview.value = null
  affecterErrors.value = {}
  showAffecterDialog.value = true
}

const openParkingDialog = () => {
  parkingForm.value = {
    idEquipement: null,
    niveauCarburant: null,
    photoTableauBord: null,
    photoFile: null,
    clientOperationId: generateUUID()
  }
  parkingPhotoPreview.value = null
  showParkingDialog.value = true
}

const openTransfertDialog = (type) => {
  transfertType.value = type
  showTransfertDialog.value = true
}

const openHistoriqueDetail = async (id) => {
  try {
    const data = await affectationsStore.fetchHistoriqueDetail(id)
    historiqueDetail.value = data
    if (data.photoTableauBord) {
      await loadAuthenticatedPhoto(`detail-${id}`, data.photoTableauBord)
    }
    showHistoriqueDetailDialog.value = true
  } catch (error) {
    showNotification('Erreur lors du chargement du détail', 'error')
  }
}

// Actions
const validateAffecterForm = () => {
  const errors = {}
  if (!affecterForm.value.idEquipement) errors.idEquipement = 'L\'équipement est requis'
  if (!affecterForm.value.utilisateurId) errors.utilisateurId = 'Le chauffeur est requis'
  if (affecterForm.value.niveauCarburant === null || affecterForm.value.niveauCarburant === '' || affecterForm.value.niveauCarburant < 0) {
    errors.niveauCarburant = 'Le niveau de carburant est requis et doit être >= 0'
  }
  affecterErrors.value = errors
  return Object.keys(errors).length === 0
}

const affecterEquipement = async () => {
  if (!validateAffecterForm()) return
  isSubmitting.value = true
  try {
    let photoPath = null
    if (affecterForm.value.photoFile) {
      const formData = new FormData()
      formData.append('photoTableauBord', affecterForm.value.photoFile)
      const response = await affectationsStore.uploadPhoto(formData)
      photoPath = response?.photoTableauBord
    }
    const data = {
      idEquipement: parseInt(affecterForm.value.idEquipement, 10),
      utilisateurId: parseInt(affecterForm.value.utilisateurId, 10),
      niveauCarburant: String(parseFloat(affecterForm.value.niveauCarburant) || 0),
      clientOperationId: affecterForm.value.clientOperationId || generateUUID()
    }
    if (photoPath) data.photoTableauBord = photoPath
    await affectationsStore.affecterEquipement(data)
    showNotification('Équipement affecté avec succès ! ✅', 'success')
    showAffecterDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
    if (error.response?.status === 400) {
      showNotification(`Erreur: ${error.response?.data?.message || 'Données invalides'}`, 'warning')
    } else if (error.response?.status === 500) {
      showNotification('Erreur serveur. Vérifiez que l\'équipement est disponible.', 'error')
    } else {
      showNotification('Erreur lors de l\'affectation', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const retournerParking = async () => {
  if (!parkingForm.value.idEquipement) {
    showNotification('Veuillez sélectionner un équipement', 'warning')
    return
  }
  isSubmitting.value = true
  try {
    let photoPath = null
    if (parkingForm.value.photoFile) {
      const formData = new FormData()
      formData.append('photoTableauBord', parkingForm.value.photoFile)
      const response = await affectationsStore.uploadPhoto(formData)
      photoPath = response?.photoTableauBord
    }
    const data = {
      idEquipement: parseInt(parkingForm.value.idEquipement, 10),
      clientOperationId: parkingForm.value.clientOperationId || generateUUID()
    }
    if (parkingForm.value.niveauCarburant !== null && parkingForm.value.niveauCarburant !== '') {
      data.niveauCarburant = parseFloat(parkingForm.value.niveauCarburant)
    }
    if (photoPath) data.photoTableauBord = photoPath
    await affectationsStore.retourParking(data)
    showNotification('Équipement retourné au parking avec succès ! ✅', 'success')
    showParkingDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur retour parking:', error.response?.data || error.message)
    if (error.response?.status === 400 && error.response?.data?.message?.includes('Aucun équipement affecté')) {
      showNotification('Cet équipement n\'est pas actuellement affecté.', 'warning')
    } else {
      showNotification('Erreur lors du retour parking', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const transfererEquipement = async () => {
  isSubmitting.value = true
  try {
    if (transfertType.value === 'parking-garage') {
      await affectationsStore.transfertParkingVersGarage()
      showNotification('Transfert parking → garage effectué ! ✅', 'success')
    } else {
      await affectationsStore.transfertGarageVersParking()
      showNotification('Transfert garage → parking effectué ! ✅', 'success')
    }
    showTransfertDialog.value = false
    await loadData()
  } catch (error) {
    console.error('Erreur lors du transfert:', error)
    showNotification('Erreur lors du transfert', 'error')
  } finally {
    isSubmitting.value = false
  }
}

const applyFilters = () => {
  if (activeTab.value === 'par-etat') loadEquipementsParEtat()
  else if (activeTab.value === 'historique') {
    currentPage.value = 1
    loadHistorique()
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  filterStatut.value = ''
  dateFrom.value = null
  dateTo.value = null
  includeAll.value = false
  currentPage.value = 1
  applyFilters()
}

const changePage = (newPage) => {
  currentPage.value = newPage
  loadHistorique()
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
          <h1 class="text-h4 font-weight-bold text-primary">Gestion des affectations</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Gérez les affectations des équipements aux chauffeurs
          </p>
        </div>
        <div class="d-flex gap-3 flex-wrap">
          <VBtn color="primary" prepend-icon="bx-user-plus" @click="openAffecterDialog" size="large" elevation="2">
            Affecter
          </VBtn>
          <VBtn color="warning" prepend-icon="bx-parking" @click="openParkingDialog" size="large" elevation="2">
            Retour Parking
          </VBtn>
          <VBtn color="info" prepend-icon="bx-transfer" @click="openTransfertDialog('parking-garage')" size="large" elevation="2">
            Parking → Garage
          </VBtn>
          <VBtn color="success" prepend-icon="bx-transfer-alt" @click="openTransfertDialog('garage-parking')" size="large" elevation="2">
            Garage → Parking
          </VBtn>
        </div>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-user-check" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Affectés
                </div>
                <div class="text-h4 font-weight-bold">{{ totalAffectes }}</div>
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
                  Disponibles
                </div>
                <div class="text-h4 font-weight-bold">{{ totalDisponibles }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-parking" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  En parking
                </div>
                <div class="text-h4 font-weight-bold">{{ totalParking }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="warning" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-warning-light pa-3 me-4">
                <VIcon icon="bx-wrench" size="28" color="warning" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  En garage
                </div>
                <div class="text-h4 font-weight-bold">{{ totalGarage }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <!-- Onglets -->
        <VTabs v-model="activeTab" color="primary" class="px-4 pt-2" @update:model-value="onTabChange">
          <VTab value="affectes">
            <VIcon icon="bx-user-check" size="18" class="me-1" />
            Affectés
          </VTab>
          <VTab value="disponibles">
            <VIcon icon="bx-check-circle" size="18" class="me-1" />
            Disponibles
          </VTab>
          <VTab value="par-etat">
            <VIcon icon="bx-filter" size="18" class="me-1" />
            Par état
          </VTab>
          <VTab value="historique">
            <VIcon icon="bx-history" size="18" class="me-1" />
            Historique
          </VTab>
        </VTabs>

        <VDivider />

        <!-- Filtres Par état -->
        <VCardText v-if="activeTab === 'par-etat'" class="pt-4">
          <VRow align="center">
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStatut"
                label="Statut"
                :items="statutOptions"
                item-title="title"
                item-value="value"
                placeholder="Sélectionner un statut"
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

        <!-- Filtres Historique -->
        <VCardText v-if="activeTab === 'historique'" class="pt-4">
          <VRow align="center">
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
            <VCol cols="12" md="2">
              <VSwitch v-model="includeAll" label="Tout voir" density="comfortable" hide-details />
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

        <!-- Table: Affectés -->
        <VTable v-if="activeTab === 'affectes'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Immatriculation</th>
              <th class="text-uppercase text-caption font-weight-bold">Marque / Modèle</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Carburant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement…</div>
              </td>
            </tr>
            <tr v-else-if="equipementsAffectes.length === 0">
              <td colspan="6" class="text-center pa-8">
                <VIcon icon="bx-user-check" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">Aucun équipement affecté</div>
                <p class="text-caption text-medium-emphasis">Affectez un équipement à un chauffeur</p>
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsAffectes" :key="item.idEquipementUtilisateur || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">{{ item.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ item.equipement?.marqueEquipement || '-' }} {{ item.equipement?.modeleEquipement || '' }}</td>
              <td class="text-center">
                <VChip color="primary" variant="tonal" size="small" label class="font-weight-bold px-3">
                  {{ item.niveauCarburant || 0 }}%
                </VChip>
              </td>
              <td class="text-center">
                <VTooltip text="Retourner au parking">
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon variant="text" size="small" color="warning" @click="openParkingDialog">
                      <VIcon size="20" icon="bx-parking" />
                    </VBtn>
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Table: Disponibles -->
        <VTable v-else-if="activeTab === 'disponibles'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Immatriculation</th>
              <th class="text-uppercase text-caption font-weight-bold">Marque / Modèle</th>
              <th class="text-uppercase text-caption font-weight-bold">Type</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement…</div>
              </td>
            </tr>
            <tr v-else-if="equipementsDisponibles.length === 0">
              <td colspan="6" class="text-center pa-8">
                <VIcon icon="bx-check-circle" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">Aucun équipement disponible</div>
                <p class="text-caption text-medium-emphasis">Tous les équipements sont affectés ou en garage</p>
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsDisponibles" :key="item.idEquipementUtilisateur || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">{{ item.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ item.equipement?.marqueEquipement || '-' }} {{ item.equipement?.modeleEquipement || '' }}</td>
              <td>
                <VChip size="small" label color="info" variant="tonal">
                  {{ item.equipement?.typeEquipement?.libelleTypeEquipement || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VTooltip text="Affecter">
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon variant="text" size="small" color="primary" @click="openAffecterDialog">
                      <VIcon size="20" icon="bx-user-plus" />
                    </VBtn>
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Table: Par état -->
        <VTable v-else-if="activeTab === 'par-etat'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Immatriculation</th>
              <th class="text-uppercase text-caption font-weight-bold">Marque / Modèle</th>
              <th class="text-uppercase text-caption font-weight-bold">Type</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement…</div>
              </td>
            </tr>
            <tr v-else-if="equipementsParEtat.length === 0">
              <td colspan="6" class="text-center pa-8">
                <VIcon icon="bx-filter" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">Aucun équipement trouvé</div>
                <p class="text-caption text-medium-emphasis">Sélectionnez un statut pour afficher les équipements</p>
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsParEtat" :key="item.idEquipementUtilisateur || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">{{ item.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ item.equipement?.marqueEquipement || '-' }} {{ item.equipement?.modeleEquipement || '' }}</td>
              <td>
                <VChip size="small" label color="info" variant="tonal">
                  {{ item.equipement?.typeEquipement?.libelleTypeEquipement || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="item.equipementEtat?.statut === 'Parking' ? 'success' :
                          item.equipementEtat?.statut === 'Garage' ? 'warning' : 'primary'"
                  variant="tonal"
                >
                  <VIcon
                    :icon="item.equipementEtat?.statut === 'Parking' ? 'bx-parking' :
                           item.equipementEtat?.statut === 'Garage' ? 'bx-wrench' : 'bx-user-check'"
                    size="14"
                    start
                  />
                  {{ item.equipementEtat?.statut || '-' }}
                </VChip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Table: Historique -->
        <VTable v-else-if="activeTab === 'historique'" class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Équipement</th>
              <th class="text-uppercase text-caption font-weight-bold">Chauffeur</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Carburant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:80px;">Détail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement…</div>
              </td>
            </tr>
            <tr v-else-if="historique.length === 0">
              <td colspan="7" class="text-center pa-8">
                <VIcon icon="bx-history" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">Aucun historique trouvé</div>
                <p class="text-caption text-medium-emphasis">Ajustez vos filtres</p>
              </td>
            </tr>
            <tr v-for="(item, index) in historique" :key="item.idHistorique || index" class="table-row">
              <td class="text-center font-weight-medium text-caption">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get('affectation-' + item.idHistorique) || brokenPhotos.has('affectation-' + item.idHistorique)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idHistorique) || brokenPhotos.has('affectation-' + item.idHistorique)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idHistorique) && !brokenPhotos.has('affectation-' + item.idHistorique)"
                    :src="photoUrlCache.get('affectation-' + item.idHistorique)"
                    cover
                    @error="onPhotoError('affectation-' + item.idHistorique)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">{{ item.equipement || '-' }}</td>
              <td>{{ item.prenomUtilisateur || '' }} {{ item.nomUtilisateur || '' }}</td>
              <td class="text-center">
                <VChip size="small" label color="primary" variant="tonal">
                  {{ item.niveauCarburant ?? '-' }}%
                </VChip>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(item.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VTooltip text="Voir le détail">
                  <template #activator="{ props }">
                    <VBtn v-bind="props" icon variant="text" size="small" color="info" @click="openHistoriqueDetail(item.idHistorique)">
                      <VIcon size="20" icon="bx-detail" />
                    </VBtn>
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
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
          v-else-if="activeTab !== 'historique' && (activeTab === 'affectes' ? equipementsAffectes.length > 0 : activeTab === 'disponibles' ? equipementsDisponibles.length > 0 : equipementsParEtat.length > 0)"
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
        >
          <span class="text-caption text-medium-emphasis">
            {{ activeTab === 'affectes' ? equipementsAffectes.length : activeTab === 'disponibles' ? equipementsDisponibles.length : equipementsParEtat.length }} élément(s)
          </span>
        </div>
      </VCard>
    </VCol>

    <!-- Dialog: Affecter -->
    <VDialog v-model="showAffecterDialog" max-width="600" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-user-plus" color="primary" size="28" />
            Affecter un équipement
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            Sélectionnez un équipement et un chauffeur
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="affecterEquipement">
            <VSelect
              v-model="affecterForm.idEquipement"
              label="Équipement"
              :items="equipementDisponibleOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              variant="outlined"
              density="comfortable"
              :error-messages="affecterErrors.idEquipement"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1"><VIcon icon="bx-info-circle" size="20" class="me-1" /> Aucun équipement disponible</p>
                  <p class="text-caption text-medium-emphasis">Vérifiez qu'il y a des équipements en parking.</p>
                </div>
              </template>
            </VSelect>

            <VSelect
              v-model="affecterForm.utilisateurId"
              label="Chauffeur"
              :items="userOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un chauffeur"
              variant="outlined"
              density="comfortable"
              :error-messages="affecterErrors.utilisateurId"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1"><VIcon icon="bx-info-circle" size="20" class="me-1" /> Aucun chauffeur disponible</p>
                </div>
              </template>
            </VSelect>

            <VTextField
              v-model="affecterForm.niveauCarburant"
              label="Niveau de carburant (%)"
              placeholder="Ex: 45"
              type="number"
              min="0"
              max="100"
              variant="outlined"
              density="comfortable"
              :error-messages="affecterErrors.niveauCarburant"
              hide-details="auto"
              class="mb-4"
            />

            <!-- Photo -->
            <div class="d-flex align-center mb-4">
              <VAvatar
                size="64"
                :color="!photoPreview ? 'primary' : undefined"
                :variant="!photoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="photoPreview" :src="photoPreview" cover />
                <VIcon v-else icon="bx-image" size="32" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo tableau de bord</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" prepend-icon="bx-upload" @click="$refs.fileInputAffecter?.click()">
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoPreview" size="small" variant="tonal" color="error" prepend-icon="bx-trash" @click="removePhoto(affecterForm, photoPreview, 'photoInputAffecter')">
                    Supprimer
                  </VBtn>
                </div>
                <input ref="fileInputAffecter" id="photoInputAffecter" type="file" accept="image/*" class="d-none" @change="(e) => onPhotoChange(e, affecterForm, photoPreview)" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VDivider class="mt-2 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn variant="tonal" color="secondary" @click="showAffecterDialog = false" :disabled="isSubmitting" size="large">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting" size="large" prepend-icon="bx-save">
                Affecter
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialog: Retour Parking -->
    <VDialog v-model="showParkingDialog" max-width="520" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-parking" color="warning" size="28" />
            Retour au parking
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            Sélectionnez l'équipement à remettre au parking
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="retournerParking">
            <VSelect
              v-model="parkingForm.idEquipement"
              label="Équipement"
              :items="equipementAffecteOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              variant="outlined"
              density="comfortable"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
            />

            <VTextField
              v-model="parkingForm.niveauCarburant"
              label="Niveau de carburant (%) (optionnel)"
              placeholder="Ex: 20"
              type="number"
              min="0"
              max="100"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
            />

            <!-- Photo -->
            <div class="d-flex align-center mb-4">
              <VAvatar
                size="64"
                :color="!parkingPhotoPreview ? 'primary' : undefined"
                :variant="!parkingPhotoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="parkingPhotoPreview" :src="parkingPhotoPreview" cover />
                <VIcon v-else icon="bx-image" size="32" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo tableau de bord (optionnel)</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" prepend-icon="bx-upload" @click="$refs.fileInputParking?.click()">
                    Choisir
                  </VBtn>
                  <VBtn v-if="parkingPhotoPreview" size="small" variant="tonal" color="error" prepend-icon="bx-trash" @click="removePhoto(parkingForm, parkingPhotoPreview, 'photoInputParking')">
                    Supprimer
                  </VBtn>
                </div>
                <input ref="fileInputParking" id="photoInputParking" type="file" accept="image/*" class="d-none" @change="(e) => onPhotoChange(e, parkingForm, parkingPhotoPreview)" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VDivider class="mt-2 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn variant="tonal" color="secondary" @click="showParkingDialog = false" :disabled="isSubmitting" size="large">
                Annuler
              </VBtn>
              <VBtn type="submit" color="warning" :loading="isSubmitting" :disabled="isSubmitting" size="large" prepend-icon="bx-parking">
                Retourner au parking
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialog: Transfert -->
    <VDialog v-model="showTransfertDialog" max-width="420" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardText class="text-center pt-8">
          <VAvatar
            variant="tonal"
            :color="transfertType === 'parking-garage' ? 'info' : 'success'"
            size="56"
            class="mb-4"
          >
            <VIcon :icon="transfertType === 'parking-garage' ? 'bx-transfer' : 'bx-transfer-alt'" size="28" />
          </VAvatar>

          <h6 class="text-h6 mb-1">
            {{ transfertType === 'parking-garage' ? 'Transfert Parking → Garage' : 'Transfert Garage → Parking' }}
          </h6>
          <p class="text-medium-emphasis mb-1">
            {{ transfertType === 'parking-garage' ? 'Déplacer les équipements du parking vers le garage' : 'Déplacer les équipements du garage vers le parking' }}
          </p>

          <p class="text-warning text-caption mt-4 d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            Cette action affectera tous les équipements concernés.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
          <VBtn variant="tonal" color="secondary" @click="showTransfertDialog = false" :disabled="isSubmitting">
            Annuler
          </VBtn>
          <VBtn
            :color="transfertType === 'parking-garage' ? 'info' : 'success'"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="transfererEquipement"
          >
            Confirmer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog: Détail historique -->
    <VDialog v-model="showHistoriqueDetailDialog" max-width="600" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-detail" color="info" size="28" />
            Détail de l'opération
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">Informations complètes de l'historique</VCardSubtitle>
        </VCardItem>

        <VCardText v-if="historiqueDetail" class="pt-4">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Équipement</div>
              <div class="font-weight-medium">{{ historiqueDetail.equipement || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Chauffeur</div>
              <div class="font-weight-medium">{{ historiqueDetail.prenomUtilisateur || '' }} {{ historiqueDetail.nomUtilisateur || '' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">État</div>
              <VChip size="small" label color="primary" variant="tonal">
                {{ historiqueDetail.etatEquipement || '-' }}
              </VChip>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Niveau carburant</div>
              <VChip size="small" label color="primary" variant="tonal">
                {{ historiqueDetail.niveauCarburant ?? '-' }}%
              </VChip>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Date</div>
              <div>{{ formatDate(historiqueDetail.dateEnregistrement, true) }}</div>
            </div>
            <div v-if="historiqueDetail.photoTableauBord" class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo</div>
              <div class="detail-photo-wrapper">
                <VImg
                  v-if="photoUrlCache.get('detail-' + historiqueDetail.idHistorique)"
                  :src="photoUrlCache.get('detail-' + historiqueDetail.idHistorique)"
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
          <VBtn variant="tonal" color="secondary" @click="showHistoriqueDetailDialog = false" size="large">
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
</style>