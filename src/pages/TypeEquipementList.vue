<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTypeEquipementStore } from '@/stores/typeEquipement'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const typeEquipementStore = useTypeEquipementStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idTypeEquipement: null,
  libelleTypeEquipement: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const typeToDelete = ref(null)

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
const types = computed(() => typeEquipementStore.types)
const loading = computed(() => typeEquipementStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les types d'équipement par recherche
const filteredTypes = computed(() => {
  if (!searchQuery.value) return types.value
  const query = searchQuery.value.toLowerCase()
  return types.value.filter(type => 
    type.libelleTypeEquipement.toLowerCase().includes(query)
  )
})

// Méthodes
const loadTypes = async () => {
  try {
    await typeEquipementStore.fetchTypes()
  } catch (error) {
    showNotification('Erreur lors du chargement des types d\'équipement', 'error')
    console.error('Erreur lors du chargement des types d\'équipement:', error)
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
    idTypeEquipement: null,
    libelleTypeEquipement: ''
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (type) => {
  isEditing.value = true
  formData.value = {
    idTypeEquipement: type.idTypeEquipement,
    libelleTypeEquipement: type.libelleTypeEquipement
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleTypeEquipement || formData.value.libelleTypeEquipement.trim() === '') {
    errors.libelleTypeEquipement = 'Le libellé du type d\'équipement est requis'
  } else if (formData.value.libelleTypeEquipement.length < 3) {
    errors.libelleTypeEquipement = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveType = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const typeData = {
      libelleTypeEquipement: formData.value.libelleTypeEquipement.trim()
    }
    
    if (isEditing.value) {
      await typeEquipementStore.updateType(formData.value.idTypeEquipement, typeData)
      showNotification('Type d\'équipement modifié avec succès ! ✅', 'success')
    } else {
      await typeEquipementStore.createType(typeData)
      showNotification('Type d\'équipement ajouté avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadTypes()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleTypeEquipement = 'Un type d\'équipement avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du type d\'équipement', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (type) => {
  typeToDelete.value = type
  showDeleteDialog.value = true
}

const deleteType = async () => {
  if (!typeToDelete.value) return
  
  try {
    await typeEquipementStore.deleteType(typeToDelete.value.idTypeEquipement)
    showDeleteDialog.value = false
    showNotification(`Type "${typeToDelete.value.libelleTypeEquipement}" supprimé avec succès ! 🗑️`, 'success')
    typeToDelete.value = null
    await loadTypes()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Ce type d\'équipement est utilisé et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du type d\'équipement', 'error')
    }
  }
}

// Charger les types au montage
onMounted(() => {
  loadTypes()
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
            Ajouter un type
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un type d'équipement..."
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
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="filteredTypes.length === 0">
              <td colspan="3" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucun type d\'équipement trouvé pour cette recherche' : 'Aucun type d\'équipement trouvé' }}
              </td>
            </tr>
            <tr
              v-for="(type, index) in filteredTypes"
              :key="type.idTypeEquipement"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ type.libelleTypeEquipement }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(type)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(type)"
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
            {{ isEditing ? 'Modifier le type' : 'Ajouter un nouveau type' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du type' : 'Saisissez le libellé du nouveau type' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveType">
            <VTextField
              v-model="formData.libelleTypeEquipement"
              label="Libellé du type"
              placeholder="Ex: Véhicule léger, Camion, Groupe électrogène, ..."
              :error-messages="formErrors.libelleTypeEquipement"
              :loading="isSubmitting"
              autofocus
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
            Êtes-vous sûr de vouloir supprimer ce type ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer le type
            <strong class="text-high-emphasis">"{{ typeToDelete?.libelleTypeEquipement }}"</strong>.
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
            @click="deleteType"
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