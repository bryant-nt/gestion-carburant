<script setup>
import { ref, onMounted, computed } from 'vue'
import { useEquipementEtatStore } from '@/stores/equipementEtat'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Initialisation des stores
const equipementEtatStore = useEquipementEtatStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idEquipementEtat: null,
  statut: '',
  dateEnregistrement: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const etatToDelete = ref(null)

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
const etats = computed(() => equipementEtatStore.etats)
const loading = computed(() => equipementEtatStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les états par recherche
const filteredEtats = computed(() => {
  if (!searchQuery.value) return etats.value
  const query = searchQuery.value.toLowerCase()
  return etats.value.filter(etat => 
    etat.statut?.toLowerCase().includes(query)
  )
})

// Méthodes
const loadEtats = async () => {
  try {
    await equipementEtatStore.fetchEtats()
  } catch (error) {
    showNotification('Erreur lors du chargement des états d\'équipement', 'error')
    console.error('Erreur lors du chargement des états d\'équipement:', error)
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
    idEquipementEtat: null,
    statut: '',
    dateEnregistrement: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (etat) => {
  isEditing.value = true
  formData.value = {
    idEquipementEtat: etat.idEquipementEtat,
    statut: etat.statut,
    dateEnregistrement: etat.dateEnregistrement ? arrayToDate(etat.dateEnregistrement) : null
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.statut || formData.value.statut.trim() === '') {
    errors.statut = 'Le libellé de l\'état est requis'
  } else if (formData.value.statut.length < 3) {
    errors.statut = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveEtat = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const etatData = {
      statut: formData.value.statut.trim()
    }
    
    if (isEditing.value) {
      await equipementEtatStore.updateEtat(formData.value.idEquipementEtat, etatData)
      showNotification('État d\'équipement modifié avec succès ! ✅', 'success')
    } else {
      await equipementEtatStore.createEtat(etatData)
      showNotification('État d\'équipement ajouté avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadEtats()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.statut = 'Un état avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'état', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (etat) => {
  etatToDelete.value = etat
  showDeleteDialog.value = true
}

const deleteEtat = async () => {
  if (!etatToDelete.value) return
  
  try {
    await equipementEtatStore.deleteEtat(etatToDelete.value.idEquipementEtat)
    showDeleteDialog.value = false
    showNotification(`État "${etatToDelete.value.statut}" supprimé avec succès ! 🗑️`, 'success')
    etatToDelete.value = null
    await loadEtats()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Cet état est utilisé et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression de l\'état', 'error')
    }
  }
}

// Charger les états au montage
onMounted(() => {
  loadEtats()
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
            Ajouter un état
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un état d'équipement..."
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
              <th class="text-center">
                Date d'enregistrement
              </th>
              <th class="text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="filteredEtats.length === 0">
              <td colspan="4" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucun état d\'équipement trouvé pour cette recherche' : 'Aucun état d\'équipement trouvé' }}
              </td>
            </tr>
            <tr
              v-for="(etat, index) in filteredEtats"
              :key="etat.idEquipementEtat"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ etat.statut }}
              </td>
              <td class="text-center">
                {{ formatDate(etat.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(etat)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(etat)"
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
            {{ isEditing ? 'Modifier l\'état' : 'Ajouter un nouvel état' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'état' : 'Saisissez le libellé du nouvel état' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveEtat">
            <VTextField
              v-model="formData.statut"
              label="Libellé de l'état"
              placeholder="Ex: Parking, Garage, Affecte, ..."
              :error-messages="formErrors.statut"
              :loading="isSubmitting"
              autofocus
            />

            <VTextField
              v-if="isEditing && formData.dateEnregistrement"
              :model-value="formatDateOnly(formData.dateEnregistrement)"
              label="Date d'enregistrement"
              readonly
              disabled
              class="mt-4"
            >
              <template #prepend-inner>
                <VIcon icon="bx-calendar" size="20" />
              </template>
            </VTextField>

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
            Êtes-vous sûr de vouloir supprimer cet état ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer l'état
            <strong class="text-high-emphasis">"{{ etatToDelete?.statut }}"</strong>.
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
            @click="deleteEtat"
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