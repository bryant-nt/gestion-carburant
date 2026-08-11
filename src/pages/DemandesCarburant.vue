<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDemandeCarburantStore } from '@/stores/demandeCarburant'
import { useValidationDemandeStore } from '@/stores/validationDemande'
import { useEquipementsStore } from '@/stores/equipements'
import { useStationsStore } from '@/stores/stations'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
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

// Le backend renvoie parfois les dates en tableau [annee, mois, jour, heure, minute, seconde]
// (ex: dans "validations"), et parfois en string ISO (ex: dateEnregistrement de la demande elle-même).
// Cette fonction gère les deux cas.
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

// Couleur de chip selon le statut réel renvoyé par le backend (statutDemande)
// Valeurs observées : "traitement En cours", potentiellement "Approuvée", "Rejetée", "Clôturée", etc.
const statutColor = (statut) => {
  if (!statut) return 'warning'
  const s = statut.toLowerCase()
  if (s.includes('rejet')) return 'error'
  if (s.includes('approuv') || s.includes('valid') || s.includes('clôtur') || s.includes('cloture')) return 'success'
  if (s.includes('cours') || s.includes('attente')) return 'warning'
  return 'secondary'
}

// Stores
const demandeStore = useDemandeCarburantStore()
const validationStore = useValidationDemandeStore()
const equipementsStore = useEquipementsStore()
const stationsStore = useStationsStore()
const carburantsStore = useTypeCarburantStore()
const authStore = useAuthStore()

// États
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showValidationDialog = ref(false)
const isSubmitting = ref(false)
const validationAction = ref('') // 'valider' | 'rejeter'
const validationCommentaire = ref('')
const validationDemandeIdUnite = ref(null)
const validationNiveauValidation = ref(null)
const validationQuantiteAccordee = ref(null)
const validationErreurEtape = ref(false) // true si aucune étape "en_attente" trouvée

// Formulaire
const formData = ref({
  idEquipement: null,
  idStation: null,
  idCarburant: null,
  quantiteDemandee: null,
  photoTableauDeBord: null,
  photoFile: null,
  commentaire: '',
  clientOperationId: null
})
const formErrors = ref({})
const photoPreview = ref(null)

const demandeCourante = ref(null)
const validationDemandeId = ref(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const activeTab = ref('a-valider')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const includeAll = ref(false)

// Computed
const demandesAValider = computed(() => demandeStore.demandesAValider)
const equipements = computed(() => equipementsStore.equipements)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => carburantsStore.types)
const loading = computed(() => demandeStore.loading)
const pagination = computed(() => demandeStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Options
const equipementOptions = computed(() => {
  return equipements.value.map(e => ({
    title: `${e.immatriculationEquipement} - ${e.marqueEquipement} ${e.modeleEquipement}`,
    value: e.idEquipement
  }))
})

const stationOptions = computed(() => {
  return stations.value.map(s => ({
    title: s.libelleStation,
    value: s.idStation
  }))
})

const carburantOptions = computed(() => {
  return carburants.value.map(c => ({
    title: c.libelleCarburant,
    value: c.idCarburant
  }))
})

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      demandeStore.fetchDemandesAValider({ page: currentPage.value - 1, size: itemsPerPage.value }),
      equipementsStore.fetchEquipements(),
      stationsStore.fetchStations(),
      carburantsStore.fetchTypes()
    ])
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur lors du chargement des données:', error)
  }
}

const loadDemandesAValider = async () => {
  try {
    const params = {
      page: currentPage.value - 1,
      size: itemsPerPage.value
    }
    if (includeAll.value) params.includeAll = true
    if (searchQuery.value) params.search = searchQuery.value
    await demandeStore.fetchDemandesAValider(params)
  } catch (error) {
    showNotification('Erreur lors du chargement des demandes', 'error')
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

// Upload photo
const onPhotoChange = (event) => {
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
    formData.value.photoFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  formData.value.photoFile = null
  photoPreview.value = null
  const fileInput = document.getElementById('photoInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

// Dialogues
const openCreateDialog = () => {
  formData.value = {
    idEquipement: null,
    idStation: null,
    idCarburant: null,
    quantiteDemandee: null,
    photoTableauDeBord: null,
    photoFile: null,
    commentaire: '',
    clientOperationId: generateUUID()
  }
  photoPreview.value = null
  formErrors.value = {}
  showCreateDialog.value = true
}

const openDetailDialog = async (id) => {
  try {
    const data = await demandeStore.fetchDemandeById(id)
    demandeCourante.value = data
    showDetailDialog.value = true
  } catch (error) {
    showNotification('Erreur lors du chargement du détail', 'error')
  }
}

// Trouve l'étape de validation "en attente" dans le tableau validations[] de la demande
const findEtapeEnAttente = (demande) => {
  const validations = demande?.validations || []
  return validations.find(v => (v.statutValidation || '').toLowerCase().includes('attente')) || null
}

const openValidationDialog = (action, demande) => {
  validationAction.value = action
  validationDemandeId.value = demande.idDemande
  validationCommentaire.value = ''

  const etape = findEtapeEnAttente(demande)
  if (etape) {
    validationDemandeIdUnite.value = etape.unite?.idUnite ?? null
    validationNiveauValidation.value = etape.niveauValidation ?? null
    validationQuantiteAccordee.value = etape.quantiteAccordee ?? demande.quantiteDemandee ?? null
    validationErreurEtape.value = false
  } else {
    // Pas d'étape "en_attente" trouvée : on ne peut pas construire idUnite/niveauValidation en toute sécurité
    validationDemandeIdUnite.value = null
    validationNiveauValidation.value = null
    validationQuantiteAccordee.value = demande.quantiteDemandee ?? null
    validationErreurEtape.value = true
  }

  showValidationDialog.value = true
}

// Créer une demande
const validateForm = () => {
  const errors = {}
  if (!formData.value.idEquipement) errors.idEquipement = 'L\'équipement est requis'
  if (!formData.value.idStation) errors.idStation = 'La station est requise'
  if (!formData.value.idCarburant) errors.idCarburant = 'Le carburant est requis'
  if (!formData.value.quantiteDemandee || formData.value.quantiteDemandee <= 0) {
    errors.quantiteDemandee = 'La quantité doit être supérieure à 0'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const createDemande = async () => {
  if (!validateForm()) return

  if (!formData.value.idEquipement || !formData.value.idStation || !formData.value.idCarburant) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'warning')
    return
  }

  isSubmitting.value = true

  try {
    let photoPath = null
    if (formData.value.photoFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('file', formData.value.photoFile)
      const response = await demandeStore.uploadPhoto(formDataPhoto)
      photoPath = response?.photoTableauDeBord
    }

    const data = {
      idEquipement: Number(formData.value.idEquipement),
      idStation: Number(formData.value.idStation),
      idCarburant: Number(formData.value.idCarburant),
      quantiteDemandee: parseFloat(formData.value.quantiteDemandee) || 0,
      clientOperationId: formData.value.clientOperationId || generateUUID()
    }

    if (isNaN(data.idEquipement) || isNaN(data.idStation) || isNaN(data.idCarburant)) {
      showNotification('Veuillez sélectionner des valeurs valides', 'warning')
      isSubmitting.value = false
      return
    }

    if (photoPath) {
      data.photoTableauDeBord = photoPath
    }

    if (formData.value.commentaire) {
      data.commentaire = formData.value.commentaire
    }

    await demandeStore.createDemande(data)
    showNotification('Demande créée avec succès ! ✅', 'success')
    showCreateDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
    showNotification('Erreur lors de la création de la demande', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Valider/Refuser une demande via /api/validationDemande/valider ou /refuser
const executerValidation = async () => {
  if (!validationDemandeId.value) {
    showNotification('ID de demande invalide', 'error')
    return
  }

  if (validationErreurEtape.value) {
    showNotification('Impossible de déterminer l\'étape de validation en attente pour cette demande', 'error')
    return
  }

  isSubmitting.value = true

  try {
    const basePayload = {
      idDemande: validationDemandeId.value,
      idUnite: validationDemandeIdUnite.value,
      niveauValidation: validationNiveauValidation.value,
      commentaire: validationCommentaire.value || undefined
    }

    if (validationAction.value === 'valider') {
      await validationStore.validerDemande({
        ...basePayload,
        quantiteAccordee: parseFloat(validationQuantiteAccordee.value) || 0
      })
      showNotification('Demande validée avec succès ! ✅', 'success')
    } else {
      await validationStore.refuserDemande(basePayload)
      showNotification('Demande rejetée ! ❌', 'error')
    }

    showValidationDialog.value = false
    await loadDemandesAValider()
  } catch (error) {
    console.error('Erreur lors de la validation:', error.response?.data || error.message)
    showNotification(error.response?.data?.message || 'Erreur lors de l\'opération', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Pagination
const changePage = (newPage) => {
  currentPage.value = newPage
  loadDemandesAValider()
}

const applyFilters = () => {
  currentPage.value = 1
  loadDemandesAValider()
}

// Charger les données au montage
onMounted(() => {
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Demandes de carburant">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
          >
            Nouvelle demande
          </VBtn>
        </template>

        <!-- Onglets -->
        <VTabs
          v-model="activeTab"
          color="primary"
          class="px-4"
        >
          <VTab value="a-valider">
            À valider
          </VTab>
          <VTab value="historique">
            Historique
          </VTab>
        </VTabs>

        <!-- Filtres -->
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Numéro demande, équipement..."
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSwitch
                v-model="includeAll"
                label="Tout voir"
                density="compact"
                class="mt-2"
                @change="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn color="primary" variant="tonal" @click="applyFilters">
                Appliquer
              </VBtn>
              <VBtn color="secondary" variant="tonal" class="ml-2" @click="searchQuery = ''; includeAll = false; applyFilters()">
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des demandes à valider -->
        <VTable v-if="activeTab === 'a-valider'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Demandeur</th>
              <th>Équipement</th>
              <th>Station</th>
              <th>Carburant</th>
              <th class="text-center">Qté</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="10" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="demandesAValider.length === 0">
              <td colspan="10" class="text-center pa-4 text-medium-emphasis">
                Aucune demande en attente de validation
              </td>
            </tr>
            <tr v-for="(demande, index) in demandesAValider" :key="demande.idDemande || index">
              <td class="text-center">{{ (pagination.page * pagination.size) + index + 1 }}</td>
              <td>
                <VAvatar
                  size="32"
                  :image="getPhotoUrl(demande.photoTableauDeBord)"
                  color="primary"
                  variant="tonal"
                >
                  <VIcon v-if="!demande.photoTableauDeBord" icon="bx-image" size="16" />
                </VAvatar>
              </td>
              <td>{{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }}</td>
              <td>{{ demande.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ demande.station?.libelleStation || '-' }}</td>
              <td>{{ demande.equipement?.carburant?.libelleCarburant || '-' }}</td>
              <td class="text-center">
                <VChip size="small" label color="primary">
                  {{ demande.quantiteDemandee }} L
                </VChip>
              </td>
              <td class="text-center">
                <VChip size="small" label :color="statutColor(demande.statutDemande)">
                  {{ demande.statutDemande || '-' }}
                </VChip>
              </td>
              <td class="text-center">{{ formatDate(demande.dateEnregistrement) }}</td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="info"
                  @click="openDetailDialog(demande.idDemande)"
                >
                  <VIcon size="20" icon="bx-detail" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="success"
                  @click="openValidationDialog('valider', demande)"
                >
                  <VIcon size="20" icon="bx-check" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="openValidationDialog('rejeter', demande)"
                >
                  <VIcon size="20" icon="bx-x" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div v-if="activeTab === 'a-valider' && pagination.totalPages > 1" class="pa-4 d-flex justify-space-between align-center">
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
          <VCardTitle>Nouvelle demande de carburant</VCardTitle>
          <VCardSubtitle>Saisissez les informations de la demande</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="createDemande">
            <!-- Photo -->
            <div class="d-flex align-center mb-4">
              <VAvatar size="60" :image="photoPreview" color="primary" variant="tonal" class="me-4">
                <span v-if="!photoPreview" class="text-h4">
                  <VIcon icon="bx-image" size="30" />
                </span>
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo tableau de bord</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.fileInput.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoPreview" size="small" variant="tonal" color="error" @click="removePhoto">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input ref="fileInput" id="photoInput" type="file" accept="image/*" class="d-none" @change="onPhotoChange" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VSelect
              v-model="formData.idEquipement"
              label="Équipement"
              :items="equipementOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              :error-messages="formErrors.idEquipement"
              :loading="loading"
              required
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
              required
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Type de carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              class="mt-4"
              required
            />

            <VTextField
              v-model="formData.quantiteDemandee"
              label="Quantité demandée (Litres)"
              placeholder="Ex: 40"
              type="number"
              min="0"
              step="0.1"
              :error-messages="formErrors.quantiteDemandee"
              class="mt-4"
              required
            />

            <VTextarea
              v-model="formData.commentaire"
              label="Commentaire (optionnel)"
              placeholder="Ex: Mission terrain"
              rows="2"
              class="mt-4"
            />

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showCreateDialog = false" :disabled="isSubmitting">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting">
                Créer la demande
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
          <VCardTitle>Détail de la demande</VCardTitle>
          <VCardSubtitle>Informations complètes de la demande</VCardSubtitle>
        </VCardItem>
        <VCardText v-if="demandeCourante">
          <VList>
            <VListItem>
              <VListItemTitle>Demandeur</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.utilisateur?.prenomUtilisateur }} {{ demandeCourante.utilisateur?.nomUtilisateur }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Équipement</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.equipement?.immatriculationEquipement || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Station</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.station?.libelleStation || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Carburant</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.equipement?.carburant?.libelleCarburant || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Quantité demandée</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.quantiteDemandee }} L</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Description</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.descriptionDemande || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Kilométrage</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.kilometrage ?? '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Date</VListItemTitle>
              <VListItemSubtitle>{{ formatDate(demandeCourante.dateEnregistrement, true) }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Statut</VListItemTitle>
              <VListItemSubtitle>
                <VChip :color="statutColor(demandeCourante.statutDemande)">
                  {{ demandeCourante.statutDemande || '-' }}
                </VChip>
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="demandeCourante.photoTableauDeBord">
              <VListItemTitle>Photo</VListItemTitle>
              <VListItemSubtitle>
                <VImg
                  :src="getPhotoUrl(demandeCourante.photoTableauDeBord)"
                  max-width="300"
                  max-height="200"
                  cover
                  class="mt-2"
                />
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="demandeCourante.validations?.length">
              <VListItemTitle>Circuit de validation</VListItemTitle>
              <VListItemSubtitle>
                <div v-for="v in demandeCourante.validations" :key="v.idValidation" class="d-flex align-center gap-2 mt-1">
                  <VChip size="x-small" :color="statutColor(v.statutValidation)">
                    Niveau {{ v.niveauValidation }}
                  </VChip>
                  <span class="text-caption">
                    {{ v.utilisateur?.prenomUtilisateur }} {{ v.utilisateur?.nomUtilisateur }} — {{ v.statutValidation }}
                  </span>
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

    <!-- Dialogue de validation -->
    <VDialog v-model="showValidationDialog" max-width="420" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle :class="validationAction === 'valider' ? 'text-success' : 'text-error'">
            {{ validationAction === 'valider' ? 'Valider la demande' : 'Rejeter la demande' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ validationAction === 'valider' ? 'Confirmez la validation de cette demande' : 'Confirmez le rejet de cette demande' }}
          </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VAlert v-if="validationErreurEtape" type="warning" density="compact" class="mb-4">
            Aucune étape de validation "en attente" trouvée pour cette demande. L'opération risque d'échouer.
          </VAlert>
          <p class="text-medium-emphasis">
            {{ validationAction === 'valider' ? 'Voulez-vous valider cette demande de carburant ?' : 'Voulez-vous rejeter cette demande de carburant ?' }}
          </p>
          <VTextField
            v-if="validationAction === 'valider'"
            v-model="validationQuantiteAccordee"
            label="Quantité accordée (Litres)"
            type="number"
            min="0"
            step="0.1"
            class="mt-2"
          />
          <VTextarea
            v-model="validationCommentaire"
            label="Commentaire (optionnel)"
            placeholder="Ex: Demande approuvée"
            rows="2"
            class="mt-4"
          />
        </VCardText>
        <VCardActions class="d-flex justify-end gap-2 pa-4">
          <VBtn variant="tonal" color="secondary" @click="showValidationDialog = false" :disabled="isSubmitting">
            Annuler
          </VBtn>
          <VBtn
            :color="validationAction === 'valider' ? 'success' : 'error'"
            @click="executerValidation"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ validationAction === 'valider' ? 'Valider' : 'Rejeter' }}
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