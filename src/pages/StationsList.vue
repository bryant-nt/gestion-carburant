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
const isDeleting = ref(false)

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

const totalStations = computed(() => stations.value.length)

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

const closeDialog = () => {
  if (isSubmitting.value) return
  showDialog.value = false
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

  isDeleting.value = true

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
  } finally {
    isDeleting.value = false
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
      <VCard>
        <VCardItem class="pb-2">
          <template #prepend>
            <VAvatar
              variant="tonal"
              color="primary"
              rounded
              size="42"
            >
              <VIcon icon="bx-gas-pump" size="24" />
            </VAvatar>
          </template>

          <VCardTitle>Gestion des stations</VCardTitle>
          <VCardSubtitle>
            {{ totalStations }} station(s) enregistrée(s)
          </VCardSubtitle>

          <template #append>
            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter une station
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <!-- Barre de recherche -->
        <VCardText class="d-flex flex-wrap gap-4 py-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher une station..."
            density="compact"
            prepend-inner-icon="bx-search"
            style="max-inline-size: 320px;"
            clearable
            hide-details
          />
        </VCardText>

        <VDivider />

        <VTable class="stations-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center" style="inline-size: 64px;">
                N°
              </th>
              <th class="text-uppercase">
                Station
              </th>
              <th class="text-uppercase">
                Adresse
              </th>
              <th class="text-uppercase">
                Téléphone
              </th>
              <th class="text-uppercase text-center" style="inline-size: 120px;">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="text-center pa-8">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>

            <tr v-else-if="filteredStations.length === 0">
              <td colspan="5" class="text-center pa-8">
                <VIcon
                  icon="bx-search-alt"
                  size="40"
                  color="disabled"
                  class="mb-2"
                />
                <p class="text-medium-emphasis mb-0">
                  {{ searchQuery ? 'Aucune station trouvée pour cette recherche' : 'Aucune station trouvée' }}
                </p>
              </td>
            </tr>

            <tr
              v-for="(station, index) in filteredStations"
              :key="station.idStation"
            >
              <td class="text-center text-medium-emphasis">
                {{ index + 1 }}
              </td>
              <td>
                <div class="d-flex align-center gap-3">
                  <VAvatar
                    variant="tonal"
                    color="primary"
                    size="34"
                    rounded
                  >
                    <VIcon icon="bx-gas-pump" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ station.libelleStation }}</span>
                </div>
              </td>
              <td>
                <div class="d-flex align-center gap-2 text-medium-emphasis">
                  <VIcon icon="bx-map" size="16" />
                  <span>{{ station.adresseStation }}</span>
                </div>
              </td>
              <td>
                <div class="d-flex align-center gap-2 text-medium-emphasis">
                  <VIcon icon="bx-phone" size="16" />
                  <span>{{ station.telephoneStation }}</span>
                </div>
              </td>
              <td class="text-center">
                <VTooltip text="Modifier">
                  <template #activator="{ props }">
                    <VBtn
                      v-bind="props"
                      icon
                      variant="text"
                      size="small"
                      color="primary"
                      @click="openEditDialog(station)"
                    >
                      <VIcon size="20" icon="bx-edit" />
                    </VBtn>
                  </template>
                </VTooltip>
                <VTooltip text="Supprimer">
                  <template #activator="{ props }">
                    <VBtn
                      v-bind="props"
                      icon
                      variant="text"
                      size="small"
                      color="error"
                      @click="confirmDelete(station)"
                    >
                      <VIcon size="20" icon="bx-trash" />
                    </VBtn>
                  </template>
                </VTooltip>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </VCol>

    <!-- Dialogue d'ajout/édition -->
    <VDialog
      v-model="showDialog"
      max-width="560"
      persistent
    >
      <VCard>
        <VCardItem class="pb-2">
          <template #prepend>
            <VAvatar
              variant="tonal"
              :color="isEditing ? 'primary' : 'success'"
              rounded
              size="42"
            >
              <VIcon :icon="isEditing ? 'bx-edit' : 'bx-plus'" size="22" />
            </VAvatar>
          </template>

          <VCardTitle>
            {{ isEditing ? 'Modifier la station' : 'Ajouter une nouvelle station' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de la station' : 'Saisissez les informations de la nouvelle station' }}
          </VCardSubtitle>

          <template #append>
            <VBtn
              icon
              variant="text"
              size="small"
              :disabled="isSubmitting"
              @click="closeDialog"
            >
              <VIcon icon="bx-x" size="20" />
            </VBtn>
          </template>
        </VCardItem>

        <VDivider class="mt-3" />

        <VCardText class="pt-5">
          <VForm @submit.prevent="saveStation">
            <VRow>
              <VCol cols="12">
                <VTextField
                  v-model="formData.libelleStation"
                  label="Libellé de la station"
                  placeholder="Ex: Station Partenaire Centre"
                  prepend-inner-icon="bx-gas-pump"
                  :error-messages="formErrors.libelleStation"
                  :disabled="isSubmitting"
                  autofocus
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="formData.adresseStation"
                  label="Adresse"
                  placeholder="Ex: Avenue du Port"
                  prepend-inner-icon="bx-map"
                  :error-messages="formErrors.adresseStation"
                  :disabled="isSubmitting"
                />
              </VCol>

              <VCol cols="12">
                <VTextField
                  v-model="formData.telephoneStation"
                  label="Téléphone"
                  placeholder="Ex: +243800000001"
                  prepend-inner-icon="bx-phone"
                  :error-messages="formErrors.telephoneStation"
                  :disabled="isSubmitting"
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            variant="tonal"
            color="secondary"
            :disabled="isSubmitting"
            @click="closeDialog"
          >
            Annuler
          </VBtn>
          <VBtn
            color="primary"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="saveStation"
          >
            {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialogue de confirmation de suppression -->
    <VDialog
      v-model="showDeleteDialog"
      max-width="420"
      persistent
    >
      <VCard>
        <VCardText class="text-center pt-8 pb-2">
          <VAvatar
            variant="tonal"
            color="error"
            size="64"
            class="mb-4"
          >
            <VIcon icon="bx-trash" size="30" />
          </VAvatar>
          <h5 class="text-h5 mb-2">
            Confirmer la suppression
          </h5>
          <p class="text-medium-emphasis mb-0">
            Vous êtes sur le point de supprimer la station
            <strong class="text-high-emphasis">"{{ stationToDelete?.libelleStation }}"</strong>.
          </p>
          <p class="text-error text-caption mt-4 mb-0">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            Cette action est irréversible.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-6 pt-4">
          <VBtn
            variant="tonal"
            color="secondary"
            :disabled="isDeleting"
            @click="showDeleteDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
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
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.stations-table :deep(th) {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.stations-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>