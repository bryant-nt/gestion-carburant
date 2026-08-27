<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { axiosIns } from '@/plugins/axios'
import { useAffectationsStore } from '@/stores/affectations'
import { useEquipementsStore } from '@/stores/equipements'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'

// --- Gestion des photos protégées (JWT via Axios) -----------------------
// Identique aux autres composants.
const photoUrlCache = reactive(new Map())

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

const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}

const loadPhotosInBatches = async (items, batchSize = 3) => {
  const tasks = []
  for (const item of items) {
    if (item.photoTableauBord) {
      // Utiliser une clé unique : on préfixe par le type d'entité pour éviter les collisions
      // Pour les affectations, on a un idEquipementUtilisateur ; pour historique, idHistorique.
      const id = item.idEquipementUtilisateur || item.idHistorique || `photo-${Math.random()}`
      tasks.push(loadAuthenticatedPhoto(`affectation-${id}`, item.photoTableauBord))
    }
  }

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize)
    await Promise.all(batch)
  }
}

const brokenPhotos = ref(new Set())
const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}
// -----------------------------------------------------------------------

// Initialisation des stores
const affectationsStore = useAffectationsStore()
const equipementsStore = useEquipementsStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()

// États
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

// Onglet et filtres
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

    // Charger les photos pour les listes
    await loadPhotosInBatches(equipementsAffectes.value, 3)
    await loadPhotosInBatches(equipementsDisponibles.value, 3)
    // Pour 'par état', on chargera plus tard via loadEquipementsParEtat
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
    if (dateFrom.value) params.dateFrom = dateFrom.value
    if (dateTo.value) params.dateTo = dateTo.value
    if (includeAll.value) params.includeAll = true
    await affectationsStore.fetchHistorique(params)

    // Charger les photos de l'historique
    await loadPhotosInBatches(historique.value, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement de l\'historique', 'error')
  }
}

const loadEquipementsParEtat = async () => {
  if (filterStatut.value) {
    await affectationsStore.fetchEquipementsParEtat(filterStatut.value)
    // Charger les photos
    await loadPhotosInBatches(equipementsParEtat.value, 3)
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

const onTabChange = (tab) => {
  activeTab.value = tab
  if (tab === 'historique') {
    loadHistorique()
  }
}

// Le backend renvoie dateEnregistrement sous forme de tableau [annee, mois, jour, heure, minute, seconde]
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

// Upload photo
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
    reader.onload = (e) => {
      previewRef.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = (form, previewRef, inputId) => {
  form.photoFile = null
  previewRef.value = null
  const fileInput = document.getElementById(inputId)
  if (fileInput) {
    fileInput.value = ''
  }
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
    // Charger la photo du détail si présente
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
  if (!affecterForm.value.idEquipement) {
    errors.idEquipement = 'L\'équipement est requis'
  }
  if (!affecterForm.value.utilisateurId) {
    errors.utilisateurId = 'Le chauffeur est requis'
  }
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

    if (photoPath) {
      data.photoTableauBord = photoPath
    }

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

    if (photoPath) {
      data.photoTableauBord = photoPath
    }

    await affectationsStore.retourParking(data)
    showNotification('Équipement retourné au parking avec succès ! ✅', 'success')
    showParkingDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur retour parking:', error.response?.data || error.message)

    if (error.response?.status === 400 && error.response?.data?.message?.includes('Aucun équipement affecté')) {
      showNotification('Cet équipement n\'est pas actuellement affecté. Il est déjà en parking ou en garage.', 'warning')
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
      showNotification('Transfert parking → garage effectué avec succès ! ✅', 'success')
    } else {
      await affectationsStore.transfertGarageVersParking()
      showNotification('Transfert garage → parking effectué avec succès ! ✅', 'success')
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
  if (activeTab.value === 'par-etat') {
    loadEquipementsParEtat()
  } else if (activeTab.value === 'historique') {
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
      <VCard title="Gestion des affectations">
        <template #append>
          <div class="d-flex gap-2 flex-wrap">
            <VBtn
              color="primary"
              prepend-icon="bx-user-plus"
              @click="openAffecterDialog"
            >
              Affecter
            </VBtn>
            <VBtn
              color="warning"
              prepend-icon="bx-parking"
              @click="openParkingDialog"
            >
              Retour Parking
            </VBtn>
            <VBtn
              color="info"
              prepend-icon="bx-transfer"
              @click="openTransfertDialog('parking-garage')"
            >
              Parking → Garage
            </VBtn>
            <VBtn
              color="success"
              prepend-icon="bx-transfer-alt"
              @click="openTransfertDialog('garage-parking')"
            >
              Garage → Parking
            </VBtn>
          </div>
        </template>

        <!-- Onglets -->
        <VTabs
          v-model="activeTab"
          color="primary"
          class="px-4"
          @update:model-value="onTabChange"
        >
          <VTab value="affectes">
            Mes équipements affectés
          </VTab>
          <VTab value="disponibles">
            Équipements disponibles
          </VTab>
          <VTab value="par-etat">
            Par état
          </VTab>
          <VTab value="historique">
            Historique
          </VTab>
        </VTabs>

        <!-- Filtres -->
        <VCardText v-if="activeTab === 'par-etat'">
          <VRow>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStatut"
                label="Statut"
                :items="statutOptions"
                item-title="title"
                item-value="value"
                placeholder="Sélectionner un statut"
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

        <!-- Filtres Historique -->
        <VCardText v-if="activeTab === 'historique'">
          <VRow>
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
            <VCol cols="12" md="2">
              <VSwitch
                v-model="includeAll"
                label="Tout voir"
                density="compact"
                class="mt-2"
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

        <!-- Tableau des équipements affectés -->
        <VTable v-if="activeTab === 'affectes'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Immatriculation</th>
              <th>Marque / Modèle</th>
              <th class="text-center">Niveau carburant</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="equipementsAffectes.length === 0">
              <td colspan="6" class="text-center pa-4 text-medium-emphasis">
                Aucun équipement affecté
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsAffectes" :key="item.idEquipementUtilisateur || index">
              <td class="text-center">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="32"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="16" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">
                {{ item.equipement?.immatriculationEquipement || '-' }}
              </td>
              <td>
                {{ item.equipement?.marqueEquipement || '-' }}
                {{ item.equipement?.modeleEquipement || '-' }}
              </td>
              <td class="text-center">
                <VChip size="small" label color="primary">
                  {{ item.niveauCarburant || 0 }}%
                </VChip>
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="warning"
                  @click="openParkingDialog"
                >
                  <VIcon size="20" icon="bx-parking" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Tableau des équipements disponibles -->
        <VTable v-else-if="activeTab === 'disponibles'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Immatriculation</th>
              <th>Marque / Modèle</th>
              <th>Type</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="equipementsDisponibles.length === 0">
              <td colspan="6" class="text-center pa-4 text-medium-emphasis">
                Aucun équipement disponible
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsDisponibles" :key="item.idEquipementUtilisateur || index">
              <td class="text-center">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="32"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="16" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">
                {{ item.equipement?.immatriculationEquipement || '-' }}
              </td>
              <td>
                {{ item.equipement?.marqueEquipement || '-' }}
                {{ item.equipement?.modeleEquipement || '-' }}
              </td>
              <td>{{ item.equipement?.typeEquipement?.libelleTypeEquipement || '-' }}</td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openAffecterDialog"
                >
                  <VIcon size="20" icon="bx-user-plus" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Tableau par état -->
        <VTable v-else-if="activeTab === 'par-etat'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Immatriculation</th>
              <th>Marque / Modèle</th>
              <th>Type</th>
              <th class="text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="equipementsParEtat.length === 0">
              <td colspan="6" class="text-center pa-4 text-medium-emphasis">
                Aucun équipement trouvé
              </td>
            </tr>
            <tr v-for="(item, index) in equipementsParEtat" :key="item.idEquipementUtilisateur || index">
              <td class="text-center">{{ index + 1 }}</td>
              <td>
                <VAvatar
                  size="32"
                  :color="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) || brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)) ? 'tonal' : undefined"
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur) && !brokenPhotos.has('affectation-' + item.idEquipementUtilisateur)"
                    :src="photoUrlCache.get('affectation-' + item.idEquipementUtilisateur)"
                    cover
                    @error="onPhotoError('affectation-' + item.idEquipementUtilisateur)"
                  />
                  <VIcon v-else icon="bx-image" size="16" />
                </VAvatar>
              </td>
              <td class="font-weight-medium">
                {{ item.equipement?.immatriculationEquipement || '-' }}
              </td>
              <td>
                {{ item.equipement?.marqueEquipement || '-' }}
                {{ item.equipement?.modeleEquipement || '-' }}
              </td>
              <td>{{ item.equipement?.typeEquipement?.libelleTypeEquipement || '-' }}</td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="item.equipementEtat?.statut === 'Parking' ? 'success' :
                          item.equipementEtat?.statut === 'Garage' ? 'warning' : 'primary'"
                >
                  {{ item.equipementEtat?.statut || '-' }}
                </VChip>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Historique -->
        <VTable v-else-if="activeTab === 'historique'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Équipement</th>
              <th>Chauffeur</th>
              <th class="text-center">Carburant</th>
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
            <tr v-else-if="historique.length === 0">
              <td colspan="7" class="text-center pa-4 text-medium-emphasis">
                Aucun historique trouvé
              </td>
            </tr>
            <tr v-for="(item, index) in historique" :key="item.idHistorique || index">
              <td class="text-center">{{ (pagination.page * pagination.size) + index + 1 }}</td>
              <td>
                <VAvatar
                  size="32"
                  :color="(!photoUrlCache.get('affectation-' + item.idHistorique) || brokenPhotos.has('affectation-' + item.idHistorique)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get('affectation-' + item.idHistorique) || brokenPhotos.has('affectation-' + item.idHistorique)) ? 'tonal' : undefined"
                >
                  <VImg
                    v-if="photoUrlCache.get('affectation-' + item.idHistorique) && !brokenPhotos.has('affectation-' + item.idHistorique)"
                    :src="photoUrlCache.get('affectation-' + item.idHistorique)"
                    cover
                    @error="onPhotoError('affectation-' + item.idHistorique)"
                  />
                  <VIcon v-else icon="bx-image" size="16" />
                </VAvatar>
              </td>
              <td>{{ item.equipement || '-' }}</td>
              <td>{{ item.prenomUtilisateur || '' }} {{ item.nomUtilisateur || '' }}</td>
              <td class="text-center">{{ item.niveauCarburant ?? '-' }}</td>
              <td class="text-center">{{ formatDate(item.dateEnregistrement) }}</td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="info"
                  @click="openHistoriqueDetail(item.idHistorique)"
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

    <!-- Dialogue d'affectation -->
    <VDialog v-model="showAffecterDialog" max-width="600" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Affecter un équipement</VCardTitle>
          <VCardSubtitle>Sélectionnez un équipement et un chauffeur</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="affecterEquipement">
            <VSelect
              v-model="affecterForm.idEquipement"
              label="Équipement"
              :items="equipementDisponibleOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              :error-messages="affecterErrors.idEquipement"
              :loading="loading"
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1">
                    <VIcon icon="bx-info-circle" size="20" class="me-1" />
                    Aucun équipement disponible
                  </p>
                  <p class="text-caption text-medium-emphasis">
                    Vérifiez qu'il y a des équipements en parking.
                  </p>
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
              :error-messages="affecterErrors.utilisateurId"
              :loading="loading"
              class="mt-4"
            >
              <template #no-data>
                <div class="pa-4 text-center">
                  <p class="text-warning mb-1">
                    <VIcon icon="bx-info-circle" size="20" class="me-1" />
                    Aucun chauffeur disponible
                  </p>
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
              :error-messages="affecterErrors.niveauCarburant"
              class="mt-4"
            />

            <!-- Photo -->
            <div class="d-flex align-center mt-4">
              <VAvatar
                size="60"
                :color="!photoPreview ? 'primary' : undefined"
                :variant="!photoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="photoPreview" :src="photoPreview" cover />
                <VIcon v-else icon="bx-image" size="30" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo tableau de bord</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.fileInputAffecter.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoPreview" size="small" variant="tonal" color="error" @click="removePhoto(affecterForm, photoPreview, 'photoInputAffecter')">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input ref="fileInputAffecter" id="photoInputAffecter" type="file" accept="image/*" class="d-none" @change="(e) => onPhotoChange(e, affecterForm, photoPreview)" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showAffecterDialog = false" :disabled="isSubmitting">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting">
                Affecter
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de retour parking -->
    <VDialog v-model="showParkingDialog" max-width="500" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Retour au parking</VCardTitle>
          <VCardSubtitle>Sélectionnez l'équipement à remettre au parking</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="retournerParking">
            <VSelect
              v-model="parkingForm.idEquipement"
              label="Équipement"
              :items="equipementAffecteOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              :loading="loading"
            />

            <VTextField
              v-model="parkingForm.niveauCarburant"
              label="Niveau de carburant (%) (optionnel)"
              placeholder="Ex: 20"
              type="number"
              min="0"
              max="100"
              class="mt-4"
            />

            <!-- Photo -->
            <div class="d-flex align-center mt-4">
              <VAvatar
                size="60"
                :color="!parkingPhotoPreview ? 'primary' : undefined"
                :variant="!parkingPhotoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="parkingPhotoPreview" :src="parkingPhotoPreview" cover />
                <VIcon v-else icon="bx-image" size="30" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo tableau de bord (optionnel)</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.fileInputParking.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="parkingPhotoPreview" size="small" variant="tonal" color="error" @click="removePhoto(parkingForm, parkingPhotoPreview, 'photoInputParking')">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input ref="fileInputParking" id="photoInputParking" type="file" accept="image/*" class="d-none" @change="(e) => onPhotoChange(e, parkingForm, parkingPhotoPreview)" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showParkingDialog = false" :disabled="isSubmitting">
                Annuler
              </VBtn>
              <VBtn type="submit" color="warning" :loading="isSubmitting" :disabled="isSubmitting">
                Retourner au parking
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de transfert -->
    <VDialog v-model="showTransfertDialog" max-width="420" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>
            {{ transfertType === 'parking-garage' ? 'Transfert Parking → Garage' : 'Transfert Garage → Parking' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ transfertType === 'parking-garage' ? 'Déplacer les équipements du parking vers le garage' : 'Déplacer les équipements du garage vers le parking' }}
          </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <p class="text-medium-emphasis">Êtes-vous sûr de vouloir effectuer cette opération ?</p>
          <p class="text-warning text-caption">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            Cette action affectera tous les équipements concernés.
          </p>
        </VCardText>
        <VCardActions class="d-flex justify-end gap-2 pa-4">
          <VBtn variant="tonal" color="secondary" @click="showTransfertDialog = false" :disabled="isSubmitting">
            Annuler
          </VBtn>
          <VBtn :color="transfertType === 'parking-garage' ? 'info' : 'success'" @click="transfererEquipement" :loading="isSubmitting" :disabled="isSubmitting">
            Confirmer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialogue détail historique -->
    <VDialog v-model="showHistoriqueDetailDialog" max-width="600" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Détail de l'opération</VCardTitle>
          <VCardSubtitle>Informations complètes de l'historique</VCardSubtitle>
        </VCardItem>
        <VCardText v-if="historiqueDetail">
          <VList>
            <VListItem>
              <VListItemTitle>Équipement</VListItemTitle>
              <VListItemSubtitle>{{ historiqueDetail.equipement || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Chauffeur</VListItemTitle>
              <VListItemSubtitle>{{ historiqueDetail.prenomUtilisateur || '' }} {{ historiqueDetail.nomUtilisateur || '' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>État</VListItemTitle>
              <VListItemSubtitle>{{ historiqueDetail.etatEquipement || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Niveau carburant</VListItemTitle>
              <VListItemSubtitle>{{ historiqueDetail.niveauCarburant ?? '-' }}%</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Date</VListItemTitle>
              <VListItemSubtitle>{{ formatDate(historiqueDetail.dateEnregistrement, true) }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="historiqueDetail.photoTableauBord">
              <VListItemTitle>Photo</VListItemTitle>
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
                    v-if="photoUrlCache.get('detail-' + historiqueDetail.idHistorique)"
                    :src="photoUrlCache.get('detail-' + historiqueDetail.idHistorique)"
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
          <VBtn variant="tonal" color="secondary" @click="showHistoriqueDetailDialog = false">
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
</style>