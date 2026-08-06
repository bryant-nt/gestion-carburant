<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStatutEquipementStore } from '@/stores/statutEquipement'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Initialisation des stores
const statutEquipementStore = useStatutEquipementStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idStatut: null,
  libelleStatut: '',
  dateEnregistrement: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const statutToDelete = ref(null)

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
const statuts = computed(() => statutEquipementStore.statuts)
const loading = computed(() => statutEquipementStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les statuts d'équipement par recherche
const filteredStatuts = computed(() => {
  if (!searchQuery.value) return statuts.value
  const query = searchQuery.value.toLowerCase()
  return statuts.value.filter(statut => 
    statut.libelleStatut?.toLowerCase().includes(query)
  )
})

// Méthodes
const loadStatuts = async () => {
  try {
    await statutEquipementStore.fetchStatuts()
  } catch (error) {
    showNotification('Erreur lors du chargement des statuts d\'équipement', 'error')
    console.error('Erreur lors du chargement des statuts d\'équipement:', error)
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
    idStatut: null,
    libelleStatut: '',
    dateEnregistrement: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (statut) => {
  isEditing.value = true
  formData.value = {
    idStatut: statut.idStatut,
    libelleStatut: statut.libelleStatut,
    dateEnregistrement: statut.dateEnregistrement ? arrayToDate(statut.dateEnregistrement) : null
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleStatut || formData.value.libelleStatut.trim() === '') {
    errors.libelleStatut = 'Le libellé du statut d\'équipement est requis'
  } else if (formData.value.libelleStatut.length < 3) {
    errors.libelleStatut = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveStatut = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const statutData = {
      libelleStatut: formData.value.libelleStatut.trim()
    }
    
    if (isEditing.value) {
      await statutEquipementStore.updateStatut(formData.value.idStatut, statutData)
      showNotification('Statut d\'équipement modifié avec succès ! ✅', 'success')
    } else {
      await statutEquipementStore.createStatut(statutData)
      showNotification('Statut d\'équipement ajouté avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadStatuts()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleStatut = 'Un statut d\'équipement avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du statut d\'équipement', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (statut) => {
  statutToDelete.value = statut
  showDeleteDialog.value = true
}

const deleteStatut = async () => {
  if (!statutToDelete.value) return
  
  try {
    await statutEquipementStore.deleteStatut(statutToDelete.value.idStatut)
    showDeleteDialog.value = false
    showNotification(`Statut "${statutToDelete.value.libelleStatut}" supprimé avec succès ! 🗑️`, 'success')
    statutToDelete.value = null
    await loadStatuts()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Ce statut d\'équipement est utilisé et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du statut d\'équipement', 'error')
    }
  }
}

// Charger les statuts au montage
onMounted(() => {
  loadStatuts()
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
            Ajouter un statut
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un statut d'équipement..."
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
            <tr v-else-if="filteredStatuts.length === 0">
              <td colspan="4" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucun statut d\'équipement trouvé pour cette recherche' : 'Aucun statut d\'équipement trouvé' }}
              </td>
            </tr>
            <tr
              v-for="(statut, index) in filteredStatuts"
              :key="statut.idStatut"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ statut.libelleStatut }}
              </td>
              <td class="text-center">
                {{ formatDate(statut.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(statut)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(statut)"
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
            {{ isEditing ? 'Modifier le statut' : 'Ajouter un nouveau statut' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du statut' : 'Saisissez le libellé du nouveau statut' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveStatut">
            <VTextField
              v-model="formData.libelleStatut"
              label="Libellé du statut"
              placeholder="Ex: VIP, Ordinaire, ..."
              :error-messages="formErrors.libelleStatut"
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
            Êtes-vous sûr de vouloir supprimer ce statut ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer le statut
            <strong class="text-high-emphasis">"{{ statutToDelete?.libelleStatut }}"</strong>.
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
            @click="deleteStatut"
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