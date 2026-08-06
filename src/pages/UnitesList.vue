<script setup>
import { ref, onMounted, computed } from 'vue'
import { useUnitesStore } from '@/stores/unites'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Initialisation des stores
const unitesStore = useUnitesStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idUnite: null,
  libelleUnite: '',
  parentId: null,
  statutUnite: 'Activer',
  dateEnregistrement: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const uniteToDelete = ref(null)

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
const unites = computed(() => unitesStore.unites)
const loading = computed(() => unitesStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les unités par recherche
const filteredUnites = computed(() => {
  if (!searchQuery.value) return unites.value
  const query = searchQuery.value.toLowerCase()
  return unites.value.filter(unite => 
    unite.libelleUnite?.toLowerCase().includes(query)
  )
})

// Options pour le parent
const parentOptions = computed(() => {
  return unites.value.map(unite => ({
    title: unite.libelleUnite,
    value: unite.idUnite
  }))
})

// Méthodes
const loadUnites = async () => {
  try {
    await unitesStore.fetchUnites()
  } catch (error) {
    showNotification('Erreur lors du chargement des unités', 'error')
    console.error('Erreur lors du chargement des unités:', error)
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
    idUnite: null,
    libelleUnite: '',
    parentId: null,
    statutUnite: 'Activer',
    dateEnregistrement: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (unite) => {
  isEditing.value = true
  formData.value = {
    idUnite: unite.idUnite,
    libelleUnite: unite.libelleUnite,
    parentId: unite.parentId || null,
    statutUnite: unite.statutUnite || 'Activer',
    dateEnregistrement: unite.dateEnregistrement ? arrayToDate(unite.dateEnregistrement) : null
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleUnite || formData.value.libelleUnite.trim() === '') {
    errors.libelleUnite = 'Le libellé de l\'unité est requis'
  } else if (formData.value.libelleUnite.length < 3) {
    errors.libelleUnite = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveUnite = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const uniteData = {
      libelleUnite: formData.value.libelleUnite.trim()
    }
    
    if (formData.value.parentId) {
      uniteData.parentId = formData.value.parentId
    }
    
    if (formData.value.statutUnite) {
      uniteData.statutUnite = formData.value.statutUnite
    }
    
    if (isEditing.value) {
      await unitesStore.updateUnite(formData.value.idUnite, uniteData)
      showNotification('Unité modifiée avec succès ! ✅', 'success')
    } else {
      await unitesStore.createUnite(uniteData)
      showNotification('Unité ajoutée avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadUnites()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleUnite = 'Une unité avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'unité', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (unite) => {
  uniteToDelete.value = unite
  showDeleteDialog.value = true
}

const deleteUnite = async () => {
  if (!uniteToDelete.value) return
  
  try {
    await unitesStore.deleteUnite(uniteToDelete.value.idUnite)
    showDeleteDialog.value = false
    showNotification(`Unité "${uniteToDelete.value.libelleUnite}" supprimée avec succès ! 🗑️`, 'success')
    uniteToDelete.value = null
    await loadUnites()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Cette unité est utilisée et ne peut pas être supprimée', 'error')
    } else {
      showNotification('Erreur lors de la suppression de l\'unité', 'error')
    }
  }
}

// Charger les unités au montage
onMounted(() => {
  loadUnites()
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
            Ajouter une unité
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher une unité..."
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
                Parent
              </th>
              <th class="text-center">
                Statut
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
              <td colspan="6" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="filteredUnites.length === 0">
              <td colspan="6" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucune unité trouvée pour cette recherche' : 'Aucune unité trouvée' }}
              </td>
            </tr>
            <tr
              v-for="(unite, index) in filteredUnites"
              :key="unite.idUnite"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ unite.libelleUnite }}
              </td>
              <td>
                {{ unite.parent?.libelleUnite || '-' }}
              </td>
              <td class="text-center">
                {{ unite.statutUnite || 'Activer' }}
              </td>
              <td class="text-center">
                {{ formatDate(unite.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(unite)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(unite)"
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
            {{ isEditing ? 'Modifier l\'unité' : 'Ajouter une nouvelle unité' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'unité' : 'Saisissez les informations de la nouvelle unité' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveUnite">
            <VTextField
              v-model="formData.libelleUnite"
              label="Libellé de l'unité"
              placeholder="Ex: Direction des Transports"
              :error-messages="formErrors.libelleUnite"
              :loading="isSubmitting"
              autofocus
            />

            <VSelect
              v-model="formData.parentId"
              label="Unité parente"
              :items="parentOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une unité parente"
              :loading="loading"
              clearable
              class="mt-4"
            />

            <VSelect
              v-model="formData.statutUnite"
              label="Statut"
              :items="['Activer', 'Desactiver']"
              placeholder="Sélectionner un statut"
              class="mt-4"
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
            Êtes-vous sûr de vouloir supprimer cette unité ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer l'unité
            <strong class="text-high-emphasis">"{{ uniteToDelete?.libelleUnite }}"</strong>.
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
            @click="deleteUnite"
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