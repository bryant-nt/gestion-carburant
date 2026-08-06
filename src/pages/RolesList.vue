<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const rolesStore = useRolesStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idRole: null,
  libelleRole: ''
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const roleToDelete = ref(null)

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
const roles = computed(() => rolesStore.roles)
const loading = computed(() => rolesStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les rôles par recherche
const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  const query = searchQuery.value.toLowerCase()
  return roles.value.filter(role => 
    role.libelleRole.toLowerCase().includes(query)
  )
})

// Méthodes
const loadRoles = async () => {
  try {
    await rolesStore.fetchRoles()
  } catch (error) {
    showNotification('Erreur lors du chargement des rôles', 'error')
    console.error('Erreur lors du chargement des rôles:', error)
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
    idRole: null,
    libelleRole: ''
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (role) => {
  isEditing.value = true
  formData.value = {
    idRole: role.idRole,
    libelleRole: role.libelleRole
  }
  formErrors.value = {}
  showDialog.value = true
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.libelleRole || formData.value.libelleRole.trim() === '') {
    errors.libelleRole = 'Le libellé du rôle est requis'
  } else if (formData.value.libelleRole.length < 3) {
    errors.libelleRole = 'Le libellé doit contenir au moins 3 caractères'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveRole = async () => {
  if (!validateForm()) return
  
  isSubmitting.value = true
  
  try {
    const roleData = {
      libelleRole: formData.value.libelleRole.trim()
    }
    
    if (isEditing.value) {
      await rolesStore.updateRole(formData.value.idRole, roleData)
      showNotification('Rôle modifié avec succès ! ✅', 'success')
    } else {
      await rolesStore.createRole(roleData)
      showNotification('Rôle ajouté avec succès ! ✅', 'success')
    }
    
    showDialog.value = false
    await loadRoles()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleRole = 'Un rôle avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du rôle', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (role) => {
  roleToDelete.value = role
  showDeleteDialog.value = true
}

const deleteRole = async () => {
  if (!roleToDelete.value) return
  
  try {
    await rolesStore.deleteRole(roleToDelete.value.idRole)
    showDeleteDialog.value = false
    showNotification(`Rôle "${roleToDelete.value.libelleRole}" supprimé avec succès ! 🗑️`, 'success')
    roleToDelete.value = null
    await loadRoles()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Ce rôle est utilisé par des utilisateurs et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du rôle', 'error')
    }
  }
}

// Charger les rôles au montage
onMounted(() => {
  loadRoles()
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
            Ajouter un rôle
          </VBtn>
        </template>

        <!-- Barre de recherche -->
        <div class="pa-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un rôle..."
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
                Nombre d'utilisateurs
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
            <tr v-else-if="filteredRoles.length === 0">
              <td colspan="4" class="text-center pa-4 text-medium-emphasis">
                {{ searchQuery ? 'Aucun rôle trouvé pour cette recherche' : 'Aucun rôle trouvé' }}
              </td>
            </tr>
            <tr
              v-for="(role, index) in filteredRoles"
              :key="role.idRole"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
                {{ role.libelleRole }}
              </td>
              <td class="text-center">
                {{ role.nombreUtilisateurs || 0 }}
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(role)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(role)"
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
            {{ isEditing ? 'Modifier le rôle' : 'Ajouter un nouveau rôle' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du rôle' : 'Saisissez le libellé du nouveau rôle' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveRole">
            <VTextField
              v-model="formData.libelleRole"
              label="Libellé du rôle"
              placeholder="Ex: Contrôleur, Validateur, ..."
              :error-messages="formErrors.libelleRole"
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
            Êtes-vous sûr de vouloir supprimer ce rôle ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer le rôle
            <strong class="text-high-emphasis">"{{ roleToDelete?.libelleRole }}"</strong>.
          </p>
          <p class="text-error text-caption">
            <VIcon icon="bx-error-circle" size="16" class="me-1" />
            Cette action est irréversible. Les utilisateurs ayant ce rôle pourraient être affectés.
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
            @click="deleteRole"
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