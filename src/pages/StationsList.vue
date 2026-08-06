<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const stationsStore = useStationsStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idStation: null,
  libelleStation: '',
  adresseStation: '',
  telephoneStation: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const stationToDelete = ref(null)

// État du snackbar (notification)
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Barre de recherche
const searchQuery = ref('')

// Computed
const stations = computed(() => stationsStore.stations)
const loading = computed(() => stationsStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les stations par recherche
const filteredStations = computed(() => {
  if (!searchQuery.value) return stations.value
  const query = searchQuery.value.toLowerCase()
  return stations.value.filter(station => 
    station.libelleStation?.toLowerCase().includes(query) ||
    station.adresseStation?.toLowerCase().includes(query) ||
    station.telephoneStation?.toLowerCase().includes(query)
  )
})

// Méthodes
const loadStations = async () => {
  try {
    await stationsStore.fetchStations()
  } catch (error) {
    showNotification('Erreur lors du chargement des stations', 'error')
    console.error('Erreur lors du chargement des stations:', error)
  }
}

// Afficher une notification
const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    idStation: null,
    libelleStation: '',
    adresseStation: '',
    telephoneStation: ''
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (station) => {
  isEditing.value = true
  formData.value = {
    idStation: station.idStation,
    libelleStation: station.libelleStation,
    adresseStation: station.adresseStation,
    telephoneStation: station.telephoneStation
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleStation || formData.value.libelleStation.trim() === '') {
    errors.libelleStation = 'Le libellé de la station est requis'
  } else if (formData.value.libelleStation.length < 3) {
    errors.libelleStation = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  if (!formData.value.adresseStation || formData.value.adresseStation.trim() === '') {
    errors.adresseStation = 'L\'adresse de la station est requise'
  }
  
  if (!formData.value.telephoneStation || formData.value.telephoneStation.trim() === '') {
    errors.telephoneStation = 'Le téléphone de la station est requis'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveStation = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const stationData = {
      libelleStation: formData.value.libelleStation.trim(),
      adresseStation: formData.value.adresseStation.trim(),
      telephoneStation: formData.value.telephoneStation.trim()
    }
    
    if (isEditing.value) {
      await stationsStore.updateStation(formData.value.idStation, stationData)
      showNotification('Station modifiée avec succès ! ✅', 'success')
    } else {
      await stationsStore.createStation(stationData)
      showNotification('Station ajoutée avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadStations()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleStation = 'Une station avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de la station', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (station) => {
  stationToDelete.value = station
  showDeleteDialog.value = true
}

const deleteStation = async () => {
  if (!stationToDelete.value) return
  
  try {
    await stationsStore.deleteStation(stationToDelete.value.idStation)
    showDeleteDialog.value = false
    showNotification(`Station "${stationToDelete.value.libelleStation}" supprimée avec succès ! 🗑️`, 'success')
    stationToDelete.value = null
    await loadStations()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Cette station est utilisée et ne peut pas être supprimée', 'error')
    } else {
      showNotification('Erreur lors de la suppression de la station', 'error')
    }
  }
}

// Charger les stations au montage
onMounted(() => {
  loadStations()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Basic">
        <template #append>
          <VBtn
            color="primary"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
          >
            Ajouter une station
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher une station..."
            density="compact"
            prepend-inner-icon="bx-search"
            clearable
          />
        </div>

        <VTable>
          <thead>
            <tr>
              <th class="text-uppercase text-center">
                N°
              </th>
              <th>
                Libellé
              </th>
              <th>
                Adresse
              </th>
              <th>
                Téléphone
              </th>
              <th class="text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="filteredStations.length === 0">
              <td colspan="5" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucune station trouvée pour cette recherche' : 'Aucune station trouvée' }}
              </td>
            </tr>
            <tr
              v-for="(station, index) in filteredStations"
              :key="station.idStation"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ station.libelleStation }}
              </td>
              <td>
                {{ station.adresseStation }}
              </td>
              <td>
                {{ station.telephoneStation }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(station)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(station)"
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
      max-width="500"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle>
            {{ isEditing ? 'Modifier la station' : 'Ajouter une nouvelle station' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de la station' : 'Saisissez les informations de la nouvelle station' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveStation">
            <VTextField
              v-model="formData.libelleStation"
              label="Libellé de la station"
              placeholder="Ex: Station Partenaire Centre"
              :error-messages="formErrors.libelleStation"
              :loading="isSubmitting"
              autofocus
            />

            <VTextField
              v-model="formData.adresseStation"
              label="Adresse"
              placeholder="Ex: Avenue du Port"
              :error-messages="formErrors.adresseStation"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VTextField
              v-model="formData.telephoneStation"
              label="Téléphone"
              placeholder="Ex: +243800000001"
              :error-messages="formErrors.telephoneStation"
              :loading="isSubmitting"
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
            Êtes-vous sûr de vouloir supprimer cette station ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer la station
            <strong class="text-high-emphasis">"{{ stationToDelete?.libelleStation }}"</strong>.
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
            @click="deleteStation"
          >
            Supprimer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar (Notification) -->
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