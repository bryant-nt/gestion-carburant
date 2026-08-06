<script setup>
import { ref, onMounted, computed } from 'vue'
import { useSeuilCarburantStore } from '@/stores/seuilCarburant'
import { useStationsStore } from '@/stores/stations'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Initialisation des stores
const seuilCarburantStore = useSeuilCarburantStore()
const stationsStore = useStationsStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idSeuil: null,
  idStation: null,
  seuilMinimal: null,
  seuilMaximal: null,
  stationCarburant: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const seuilToDelete = ref(null)

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
const seuils = computed(() => seuilCarburantStore.seuils)
const stations = computed(() => stationsStore.allStations)
const loading = computed(() => seuilCarburantStore.loading || stationsStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les seuils par recherche (par nom de station)
const filteredSeuils = computed(() => {
  if (!searchQuery.value) return seuils.value
  const query = searchQuery.value.toLowerCase()
  return seuils.value.filter(seuil => 
    seuil.stationCarburant?.libelleStation?.toLowerCase().includes(query) ||
    seuil.idStation?.toString().includes(query)
  )
})

// Options pour les stations
const stationOptions = computed(() => {
  return stations.value.map(station => ({
    title: station.libelleStation,
    value: station.idStation
  }))
})

// Méthodes
const loadData = async () => {
  try {
    await Promise.all([
      seuilCarburantStore.fetchSeuils(),
      stationsStore.fetchStations()
    ])
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur lors du chargement des données:', error)
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
    idSeuil: null,
    idStation: null,
    seuilMinimal: null,
    seuilMaximal: null,
    stationCarburant: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (seuil) => {
  isEditing.value = true
  formData.value = {
    idSeuil: seuil.idSeuil,
    idStation: seuil.idStation,
    seuilMinimal: seuil.seuilMinimal,
    seuilMaximal: seuil.seuilMaximal,
    stationCarburant: seuil.stationCarburant
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.idStation) {
    errors.idStation = 'La station est requise'
  }
  if (formData.value.seuilMinimal === null || formData.value.seuilMinimal === undefined || formData.value.seuilMinimal < 0) {
    errors.seuilMinimal = 'Le seuil minimal est requis et doit être >= 0'
  }
  if (formData.value.seuilMaximal === null || formData.value.seuilMaximal === undefined || formData.value.seuilMaximal < 0) {
    errors.seuilMaximal = 'Le seuil maximal est requis et doit être >= 0'
  }
  if (formData.value.seuilMinimal > formData.value.seuilMaximal) {
    errors.seuilMaximal = 'Le seuil maximal doit être supérieur ou égal au seuil minimal'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveSeuil = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const seuilData = {
      idStation: formData.value.idStation,
      seuilMinimal: parseFloat(formData.value.seuilMinimal),
      seuilMaximal: parseFloat(formData.value.seuilMaximal)
    }
    
    if (isEditing.value) {
      await seuilCarburantStore.updateSeuil(formData.value.idSeuil, seuilData)
      showNotification('Seuil modifié avec succès ! ✅', 'success')
    } else {
      await seuilCarburantStore.createSeuil(seuilData)
      showNotification('Seuil ajouté avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadData()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.idStation = 'Un seuil existe déjà pour cette station'
      showNotification('Un seuil existe déjà pour cette station !', 'warning')
    } else if (error.response?.status === 400) {
      showNotification('Veuillez vérifier les valeurs saisies (seuilMinimal <= seuilMaximal)', 'error')
    } else {
      showNotification('Erreur lors de la sauvegarde du seuil', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (seuil) => {
  seuilToDelete.value = seuil
  showDeleteDialog.value = true
}

const deleteSeuil = async () => {
  if (!seuilToDelete.value) return
  
  try {
    await seuilCarburantStore.deleteSeuil(seuilToDelete.value.idSeuil)
    showDeleteDialog.value = false
    showNotification(`Seuil supprimé avec succès ! 🗑️`, 'success')
    seuilToDelete.value = null
    await loadData()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    showNotification('Erreur lors de la suppression du seuil', 'error')
  }
}

// Charger les données au montage
onMounted(() => {
  loadData()
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
            Ajouter un seuil
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un seuil (station)..."
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
                Station
              </th>
              <th class="text-center">
                Seuil Minimal
              </th>
              <th class="text-center">
                Seuil Maximal
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
            <tr v-else-if="filteredSeuils.length === 0">
              <td colspan="5" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucun seuil trouvé pour cette recherche' : 'Aucun seuil trouvé' }}
              </td>
            </tr>
            <tr
              v-for="(seuil, index) in filteredSeuils"
              :key="seuil.idSeuil"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ seuil.stationCarburant?.libelleStation || '-' }}
              </td>
              <td class="text-center">
                <VChip
                  color="warning"
                  size="small"
                  label
                >
                  {{ seuil.seuilMinimal }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip
                  color="success"
                  size="small"
                  label
                >
                  {{ seuil.seuilMaximal }}
                </VChip>
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(seuil)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(seuil)"
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
            {{ isEditing ? 'Modifier le seuil' : 'Ajouter un nouveau seuil' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du seuil' : 'Saisissez les informations du nouveau seuil' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveSeuil">
            <VSelect
              v-model="formData.idStation"
              label="Station"
              :items="stationOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une station"
              :error-messages="formErrors.idStation"
              :loading="loading"
              :disabled="isEditing"
              class="mt-4"
            />

            <VTextField
              v-model="formData.seuilMinimal"
              label="Seuil Minimal"
              placeholder="Ex: 500"
              type="number"
              :error-messages="formErrors.seuilMinimal"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VTextField
              v-model="formData.seuilMaximal"
              label="Seuil Maximal"
              placeholder="Ex: 10000"
              type="number"
              :error-messages="formErrors.seuilMaximal"
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
            Êtes-vous sûr de vouloir supprimer ce seuil ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer le seuil de la station
            <strong class="text-high-emphasis">"{{ seuilToDelete?.stationCarburant?.libelleStation }}"</strong>.
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
            @click="deleteSeuil"
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