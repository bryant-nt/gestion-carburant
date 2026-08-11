<script setup>
import { ref, onMounted, computed } from 'vue'
import { useApprovisionnementStore } from '@/stores/approvisionnement'
import { useDemandeCarburantStore } from '@/stores/demandeCarburant'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

const getPhotoUrl = (path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  const token = localStorage.getItem('accessToken')
  if (token) {
    return `${API_URL}/${path}?token=${token}`
  }
  return `${API_URL}/${path}`
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

// Computed
const approvisionnements = computed(() => approvisionnementStore.approvisionnements)
const demandes = computed(() => demandeStore.demandesAValider)
const stations = computed(() => stationsStore.allStations)
const loading = computed(() => approvisionnementStore.loading || demandeStore.loading || stationsStore.loading)
const pagination = computed(() => approvisionnementStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

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
      demandeStore.fetchDemandesAValider(),
      stationsStore.fetchStations()
    ])
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
const openCreateDialog = () => {
  formData.value = {
    idDemande: null,
    idStation: null,
    quantiteRecue: null,
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
    // Upload photo après plein
    let photoApresPath = null
    if (formData.value.photoApresFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('photoApres', formData.value.photoApresFile)
      const response = await approvisionnementStore.uploadPhotoApres(formDataPhoto)
      photoApresPath = response?.photoTableauDeBordApres
    }
    
    // Upload screenshot
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
      quantiteRecue: parseFloat(formData.value.quantiteRecue),
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
    
    console.log('📤 Données approvisionnement:', JSON.stringify(data, null, 2))
    
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
}

// Charger les données au montage
onMounted(() => {
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion des approvisionnements">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
          >
            Enregistrer un approvisionnement
          </VBtn>
        </template>

        <!-- Filtres -->
        <VCardText>
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

        <!-- Tableau -->
        <VTable>
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
                <VAvatar
                  size="32"
                  :image="getPhotoUrl(item.photoTableauDeBordApres)"
                  color="primary"
                  variant="tonal"
                >
                  <VIcon v-if="!item.photoTableauDeBordApres" icon="bx-image" size="16" />
                </VAvatar>
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
              <td class="text-center">{{ item.dateEnregistrement ? new Date(item.dateEnregistrement).toLocaleDateString('fr-FR') : '-' }}</td>
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
        <div v-if="pagination.totalPages > 1" class="pa-4 d-flex justify-space-between align-center">
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
        <VCardText>
          <VForm @submit.prevent="createApprovisionnement">
            <!-- Photo Après -->
            <div class="d-flex align-center mb-4">
              <VAvatar size="60" :image="photoApresPreview" color="primary" variant="tonal" class="me-4">
                <span v-if="!photoApresPreview" class="text-h4">
                  <VIcon icon="bx-image" size="30" />
                </span>
              </VAvatar>
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

            <!-- Screenshot -->
            <div class="d-flex align-center mb-4">
              <VAvatar size="60" :image="screenshotPreview" color="primary" variant="tonal" class="me-4">
                <span v-if="!screenshotPreview" class="text-h4">
                  <VIcon icon="bx-image" size="30" />
                </span>
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Capture / preuve pompe</div>
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
              </div>
            </div>

            <VSelect
              v-model="formData.idDemande"
              label="Demande"
              :items="demandeOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une demande validée"
              :error-messages="formErrors.idDemande"
              :loading="loading"
            />

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
              <VListItemSubtitle>{{ approvisionnementCourant.dateEnregistrement ? new Date(approvisionnementCourant.dateEnregistrement).toLocaleString('fr-FR') : '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem v-if="approvisionnementCourant.photoTableauDeBordApres">
              <VListItemTitle>Photo après plein</VListItemTitle>
              <VListItemSubtitle>
                <VImg
                  :src="getPhotoUrl(approvisionnementCourant.photoTableauDeBordApres)"
                  max-width="300"
                  max-height="200"
                  cover
                  class="mt-2"
                />
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="approvisionnementCourant.screenshot">
              <VListItemTitle>Preuve pompe</VListItemTitle>
              <VListItemSubtitle>
                <VImg
                  :src="getPhotoUrl(approvisionnementCourant.screenshot)"
                  max-width="300"
                  max-height="200"
                  cover
                  class="mt-2"
                />
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
</style>