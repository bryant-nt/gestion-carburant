<script setup>
import { ref, onMounted, computed } from 'vue'
import { usePermissionsStore } from '@/stores/permissions'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const permissionsStore = usePermissionsStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idPermission: null,
  libellePermission: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const permissionToDelete = ref(null)

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
const permissions = computed(() => permissionsStore.permissions)
const loading = computed(() => permissionsStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les permissions par recherche
const filteredPermissions = computed(() => {
  if (!searchQuery.value) return permissions.value
  const query = searchQuery.value.toLowerCase()
  return permissions.value.filter(permission => 
    permission.libellePermission.toLowerCase().includes(query)
  )
})

// Méthodes
const loadPermissions = async () => {
  try {
    await permissionsStore.fetchPermissions()
  } catch (error) {
    showNotification('Erreur lors du chargement des permissions', 'error')
    console.error('Erreur lors du chargement des permissions:', error)
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
    idPermission: null,
    libellePermission: ''
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (permission) => {
  isEditing.value = true
  formData.value = {
    idPermission: permission.idPermission,
    libellePermission: permission.libellePermission
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libellePermission || formData.value.libellePermission.trim() === '') {
    errors.libellePermission = 'Le libellé de la permission est requis'
  } else if (formData.value.libellePermission.length < 3) {
    errors.libellePermission = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const savePermission = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const permissionData = {
      libellePermission: formData.value.libellePermission.trim().toUpperCase()
    }
    
    if (isEditing.value) {
      await permissionsStore.updatePermission(formData.value.idPermission, permissionData)
      showNotification('Permission modifiée avec succès ! ✅', 'success')
    } else {
      await permissionsStore.createPermission(permissionData)
      showNotification('Permission ajoutée avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadPermissions()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libellePermission = 'Une permission avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de la permission', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (permission) => {
  permissionToDelete.value = permission
  showDeleteDialog.value = true
}

const deletePermission = async () => {
  if (!permissionToDelete.value) return
  
  try {
    await permissionsStore.deletePermission(permissionToDelete.value.idPermission)
    showDeleteDialog.value = false
    showNotification(`Permission "${permissionToDelete.value.libellePermission}" supprimée avec succès ! 🗑️`, 'success')
    permissionToDelete.value = null
    await loadPermissions()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Cette permission est utilisée et ne peut pas être supprimée', 'error')
    } else {
      showNotification('Erreur lors de la suppression de la permission', 'error')
    }
  }
}

// Charger les permissions au montage
onMounted(() => {
  loadPermissions()
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
            Ajouter une permission
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher une permission..."
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
            <tr v-else-if="filteredPermissions.length === 0">
              <td colspan="3" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucune permission trouvée pour cette recherche' : 'Aucune permission trouvée' }}
              </td>
            </tr>
            <tr
              v-for="(permission, index) in filteredPermissions"
              :key="permission.idPermission"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ permission.libellePermission }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(permission)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(permission)"
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
            {{ isEditing ? 'Modifier la permission' : 'Ajouter une nouvelle permission' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de la permission' : 'Saisissez le libellé de la nouvelle permission' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="savePermission">
            <VTextField
              v-model="formData.libellePermission"
              label="Libellé de la permission"
              placeholder="Ex: GERER_STOCK, VOIR_RAPPORTS, ..."
              :error-messages="formErrors.libellePermission"
              :loading="isSubmitting"
              autofocus
              hint="Le libellé sera automatiquement converti en majuscules"
              persistent-hint
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
            Êtes-vous sûr de vouloir supprimer cette permission ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer la permission
            <strong class="text-high-emphasis">"{{ permissionToDelete?.libellePermission }}"</strong>.
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
            @click="deletePermission"
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