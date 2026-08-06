<script setup>
import { ref, onMounted, computed } from 'vue'
import { useEquipementsStore } from '@/stores/equipements'
import { useTypeEquipementStore } from '@/stores/typeEquipement'
import { useStatutEquipementStore } from '@/stores/statutEquipement'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const equipementsStore = useEquipementsStore()
const typeEquipementStore = useTypeEquipementStore()
const statutEquipementStore = useStatutEquipementStore()
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idEquipement: null,
  immatriculationEquipement: '',
  marqueEquipement: '',
  modeleEquipement: '',
  idTypeEquipement: null,
  idStatut: null,
  idCarburant: null,
  photoEquipement: null,
  photoFile: null
})
const formErrors = ref({})
const isSubmitting = ref(false)
const photoPreview = ref(null)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const equipementToDelete = ref(null)

// État du snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const searchQuery = ref('')
const filterType = ref(null)
const filterStatut = ref(null)

// Computed
const equipements = computed(() => {
  console.log('📦 Équipements dans le computed:', equipementsStore.equipements)
  return equipementsStore.equipements
})

const types = computed(() => typeEquipementStore.types)
const statuts = computed(() => statutEquipementStore.statuts)
const carburants = computed(() => typeCarburantStore.types)
const loading = computed(() => equipementsStore.loading || typeEquipementStore.loading || statutEquipementStore.loading || typeCarburantStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Options pour les selects
const typeOptions = computed(() => {
  return types.value.map(type => ({
    title: type.libelleTypeEquipement,
    value: type.idTypeEquipement
  }))
})

const statutOptions = computed(() => {
  return statuts.value.map(statut => ({
    title: statut.libelleStatut,
    value: statut.idStatut
  }))
})

const carburantOptions = computed(() => {
  return carburants.value.map(carburant => ({
    title: carburant.libelleCarburant,
    value: carburant.idCarburant
  }))
})

// Filtrer les équipements
const filteredEquipements = computed(() => {
  let result = equipements.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e => 
      e.immatriculationEquipement?.toLowerCase().includes(query) ||
      e.marqueEquipement?.toLowerCase().includes(query) ||
      e.modeleEquipement?.toLowerCase().includes(query)
    )
  }
  
  if (filterType.value) {
    result = result.filter(e => e.idTypeEquipement === filterType.value)
  }
  
  if (filterStatut.value) {
    result = result.filter(e => e.idStatut === filterStatut.value)
  }
  
  console.log('🔍 Équipements filtrés:', result)
  return result
})

// Méthodes
const loadData = async () => {
  console.log('🔄 Chargement des données...')
  try {
    await Promise.all([
      equipementsStore.fetchEquipements(),
      typeEquipementStore.fetchTypes(),
      statutEquipementStore.fetchStatuts(),
      typeCarburantStore.fetchTypes()
    ])
    
    // DEBUG : Afficher les équipements avec leurs photos
    console.log('✅ Données chargées avec succès')
    console.log('📸 Vérification des photos des équipements:')
    equipementsStore.equipements.forEach((e, index) => {
      console.log(`  ${index + 1}. ${e.immatriculationEquipement}:`)
      console.log(`     - photoEquipement: ${e.photoEquipement}`)
      console.log(`     - URL complète: ${e.photoEquipement ? `http://localhost:8080/${e.photoEquipement}` : 'AUCUNE PHOTO'}`)
      console.log(`     - Type: ${e.typeEquipement?.libelleTypeEquipement || 'N/A'}`)
      console.log(`     - Statut: ${e.statut?.libelleStatut || 'N/A'}`)
      console.log('---')
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error)
    showNotification('Erreur lors du chargement des données', 'error')
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

const openCreateDialog = () => {
  console.log('➕ Ouverture du dialogue de création')
  isEditing.value = false
  formData.value = {
    idEquipement: null,
    immatriculationEquipement: '',
    marqueEquipement: '',
    modeleEquipement: '',
    idTypeEquipement: null,
    idStatut: null,
    idCarburant: null,
    photoEquipement: null,
    photoFile: null
  }
  photoPreview.value = null
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (equipement) => {
  console.log('✏️ Ouverture du dialogue de modification pour:', equipement.immatriculationEquipement)
  console.log('📸 Photo existante:', equipement.photoEquipement)
  
  isEditing.value = true
  formData.value = {
    idEquipement: equipement.idEquipement,
    immatriculationEquipement: equipement.immatriculationEquipement || '',
    marqueEquipement: equipement.marqueEquipement || '',
    modeleEquipement: equipement.modeleEquipement || '',
    idTypeEquipement: equipement.idTypeEquipement || null,
    idStatut: equipement.idStatut || null,
    idCarburant: equipement.idCarburant || null,
    photoEquipement: equipement.photoEquipement || null,
    photoFile: null
  }
  
  // Prévisualisation de la photo existante
  if (equipement.photoEquipement) {
    const photoUrl = `http://localhost:8080/${equipement.photoEquipement}`
    console.log('🖼️ URL de la photo existante:', photoUrl)
    photoPreview.value = photoUrl
  } else {
    console.log('⚠️ Aucune photo existante pour cet équipement')
    photoPreview.value = null
  }
  
  formErrors.value = {}
  showDialog.value = true
}

const onFileChange = (event) => {
  const file = event.target.files[0]
  console.log('📁 Fichier sélectionné:', file ? file.name : 'Aucun fichier')
  
  if (file) {
    if (!file.type.startsWith('image/')) {
      console.log('❌ Type de fichier invalide:', file.type)
      showNotification('Veuillez sélectionner une image', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ Fichier trop grand:', file.size, 'bytes')
      showNotification('L\'image ne doit pas dépasser 5MB', 'error')
      return
    }
    console.log('✅ Fichier valide:', file.name, file.size, 'bytes')
    formData.value.photoFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target.result
      console.log('🖼️ Prévisualisation chargée')
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  console.log('🗑️ Suppression de la photo sélectionnée')
  formData.value.photoFile = null
  photoPreview.value = null
  const fileInput = document.getElementById('photoInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

const validateForm = () => {
  const errors = {}
  
  if (!formData.value.immatriculationEquipement || formData.value.immatriculationEquipement.trim() === '') {
    errors.immatriculationEquipement = 'L\'immatriculation est requise'
  }
  
  if (!formData.value.marqueEquipement || formData.value.marqueEquipement.trim() === '') {
    errors.marqueEquipement = 'La marque est requise'
  }
  
  if (!formData.value.modeleEquipement || formData.value.modeleEquipement.trim() === '') {
    errors.modeleEquipement = 'Le modèle est requis'
  }
  
  if (!formData.value.idTypeEquipement) {
    errors.idTypeEquipement = 'Le type d\'équipement est requis'
  }
  
  if (!formData.value.idStatut) {
    errors.idStatut = 'Le statut est requis'
  }
  
  if (!formData.value.idCarburant) {
    errors.idCarburant = 'Le carburant est requis'
  }
  
  formErrors.value = errors
  console.log('📝 Validation du formulaire:', Object.keys(errors).length === 0 ? '✅ Valide' : '❌ Erreurs:', errors)
  return Object.keys(errors).length === 0
}

const saveEquipement = async () => {
  console.log('💾 Sauvegarde de l\'équipement...')
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    // Upload de la photo en premier si une nouvelle photo est sélectionnée
    let photoPath = null
    if (formData.value.photoFile) {
      console.log('📤 Upload de la photo en cours...')
      const formDataPhoto = new FormData()
      formDataPhoto.append('file', formData.value.photoFile)
      const photoResponse = await equipementsStore.uploadPhoto(formDataPhoto)
      photoPath = photoResponse?.photoEquipement
      console.log('✅ Photo uploadée avec succès:', photoPath)
    }
    
    const equipementData = {
      immatriculationEquipement: formData.value.immatriculationEquipement.trim(),
      marqueEquipement: formData.value.marqueEquipement.trim(),
      modeleEquipement: formData.value.modeleEquipement.trim(),
      idTypeEquipement: formData.value.idTypeEquipement,
      idStatut: formData.value.idStatut,
      idCarburant: formData.value.idCarburant
    }
    
    // Ajouter la photo si elle a été uploadée
    if (photoPath) {
      equipementData.photoEquipement = photoPath
      console.log('📸 Photo ajoutée aux données:', photoPath)
    } else if (isEditing.value && formData.value.photoEquipement) {
      equipementData.photoEquipement = formData.value.photoEquipement
      console.log('📸 Photo existante conservée:', formData.value.photoEquipement)
    }
    
    console.log('📦 Données à envoyer:', equipementData)
    
    if (!isEditing.value) {
      const response = await equipementsStore.createEquipement(equipementData)
      console.log('✅ Équipement créé:', response)
      showNotification('Équipement créé avec succès ! ✅', 'success')
    } else {
      const response = await equipementsStore.updateEquipement(formData.value.idEquipement, equipementData)
      console.log('✅ Équipement modifié:', response)
      showNotification('Équipement modifié avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.immatriculationEquipement = 'Cette immatriculation existe déjà'
      showNotification('Cette immatriculation existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'équipement', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (equipement) => {
  console.log('🗑️ Confirmation de suppression pour:', equipement.immatriculationEquipement)
  equipementToDelete.value = equipement
  showDeleteDialog.value = true
}

const deleteEquipement = async () => {
  if (!equipementToDelete.value) return
  
  console.log('🗑️ Suppression de l\'équipement:', equipementToDelete.value.immatriculationEquipement)
  
  try {
    await equipementsStore.deleteEquipement(equipementToDelete.value.idEquipement)
    showDeleteDialog.value = false
    showNotification(`Équipement "${equipementToDelete.value.immatriculationEquipement}" supprimé avec succès ! 🗑️`, 'success')
    equipementToDelete.value = null
    await loadData()
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    showNotification('Erreur lors de la suppression de l\'équipement', 'error')
  }
}

const resetFilters = () => {
  console.log('🔄 Réinitialisation des filtres')
  searchQuery.value = ''
  filterType.value = null
  filterStatut.value = null
}

// Charger les données au montage
onMounted(() => {
  console.log('🚀 Composant EquipementsList monté')
  loadData()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion du parc d'équipements">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
          >
            Ajouter un équipement
          </VBtn>
        </template>

        <!-- Filtres -->
        <VCardText>
          <VRow>
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Immatriculation, marque..."
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterType"
                label="Type"
                :items="typeOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les types"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStatut"
                label="Statut"
                :items="statutOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les statuts"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn
                color="secondary"
                variant="tonal"
                @click="resetFilters"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des équipements -->
        <VTable>
          <thead>
            <tr>
              <th class="text-uppercase text-center">
                N°
              </th>
              <th>
                Photo
              </th>
              <th>
                Immatriculation
              </th>
              <th>
                Marque
              </th>
              <th>
                Modèle
              </th>
              <th>
                Type
              </th>
              <th>
                Carburant
              </th>
              <th>
                Statut
              </th>
              <th class="text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
                <div class="mt-2 text-caption">Chargement...</div>
              </td>
            </tr>
            <tr v-else-if="filteredEquipements.length === 0">
              <td colspan="9" class="text-center pa-4 text-medium-emphasis">
                Aucun équipement trouvé
              </td>
            </tr>
            <tr
              v-for="(equipement, index) in filteredEquipements"
              :key="equipement.idEquipement"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                <!-- DEBUG : Afficher l'URL de la photo dans la console -->
                <div v-if="equipement.photoEquipement" style="display: none;">
                  {{ console.log('🖼️ Équipement', equipement.immatriculationEquipement, 'Photo:', equipement.photoEquipement, 'URL:', `http://localhost:8080/${equipement.photoEquipement}`) }}
                </div>
                
                <VAvatar
                  size="40"
                  :image="equipement.photoEquipement ? `http://localhost:8080/${equipement.photoEquipement}` : null"
                  color="primary"
                  variant="tonal"
                >
                  <span v-if="!equipement.photoEquipement" class="text-caption font-weight-medium">
                    <VIcon icon="bx-image" size="20" />
                  </span>
                </VAvatar>
              </td>
              <td>
                <div class="font-weight-medium">
                  {{ equipement.immatriculationEquipement }}
                </div>
              </td>
              <td>
                {{ equipement.marqueEquipement || '-' }}
              </td>
              <td>
                {{ equipement.modeleEquipement || '-' }}
              </td>
              <td>
                <VChip size="small" label color="primary">
                  {{ equipement.typeEquipement?.libelleTypeEquipement || '-' }}
                </VChip>
              </td>
              <td>
                <VChip size="small" label color="info">
                  {{ equipement.carburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td>
                <VChip
                  size="small"
                  label
                  :color="equipement.statut?.libelleStatut === 'Actif' || equipement.statut?.libelleStatut === 'VIP' ? 'success' : 'error'"
                >
                  {{ equipement.statut?.libelleStatut || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(equipement)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(equipement)"
                >
                  <VIcon size="20" icon="bx-trash" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <!-- Dialogue d'ajout/édition -->
    <VDialog
      v-model="showDialog"
      max-width="600"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle>
            {{ isEditing ? 'Modifier l\'équipement' : 'Ajouter un équipement' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'équipement' : 'Saisissez les informations du nouvel équipement' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveEquipement">
            <!-- Photo de l'équipement -->
            <div class="d-flex align-center mb-4">
              <VAvatar
                size="80"
                :image="photoPreview"
                color="primary"
                variant="tonal"
                class="me-4"
              >
                <span v-if="!photoPreview" class="text-h4">
                  <VIcon icon="bx-image" size="40" />
                </span>
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo de l'équipement</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="$refs.fileInput.click()"
                  >
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn
                    v-if="photoPreview"
                    size="small"
                    variant="tonal"
                    color="error"
                    @click="removePhoto"
                  >
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input
                  ref="fileInput"
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="onFileChange"
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  JPG, PNG ou GIF (max 5MB)
                </div>
              </div>
            </div>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.immatriculationEquipement"
                  label="Immatriculation"
                  placeholder="Ex: E1327A"
                  :error-messages="formErrors.immatriculationEquipement"
                  :loading="isSubmitting"
                  autofocus
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.marqueEquipement"
                  label="Marque"
                  placeholder="Ex: Toyota"
                  :error-messages="formErrors.marqueEquipement"
                  :loading="isSubmitting"
                />
              </VCol>
            </VRow>

            <VTextField
              v-model="formData.modeleEquipement"
              label="Modèle"
              placeholder="Ex: Land Cruise"
              :error-messages="formErrors.modeleEquipement"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idTypeEquipement"
              label="Type d'équipement"
              :items="typeOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un type"
              :error-messages="formErrors.idTypeEquipement"
              :loading="loading"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idStatut"
              label="Statut"
              :items="statutOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un statut"
              :error-messages="formErrors.idStatut"
              :loading="loading"
              class="mt-4"
            />

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="showDialog = false"
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
                {{ isEditing ? 'Modifier' : 'Ajouter' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de confirmation de suppression -->
    <VDialog
      v-model="showDeleteDialog"
      max-width="420"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle class="text-error">
            Confirmer la suppression
          </VCardTitle>
          <VCardSubtitle>
            Êtes-vous sûr de vouloir supprimer cet équipement ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer l'équipement
            <strong class="text-high-emphasis">"{{ equipementToDelete?.immatriculationEquipement }}"</strong>.
          </p>
          <p class="text-error text-caption">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            Cette action est irréversible.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-end gap-2 pa-4">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="showDeleteDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            @click="deleteEquipement"
          >
            Supprimer
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
    >
      <VIcon
        :icon="snackbar.color === 'success' ? 'bx-check-circle' : snackbar.color === 'warning' ? 'bx-error-circle' : 'bx-x-circle'"
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