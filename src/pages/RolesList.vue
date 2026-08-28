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

const totalRoles = computed(() => roles.value.length)
const totalUsersAssigned = computed(() =>
  roles.value.reduce((sum, r) => sum + (r.nombreUtilisateurs || 0), 0)
)

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

const closeDialog = () => {
  if (isSubmitting.value) return
  showDialog.value = false
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

  isDeleting.value = true

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
  } finally {
    isDeleting.value = false
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
      <VCard>
        <VCardItem class="pb-2">
          <template #prepend>
            <VAvatar
              variant="tonal"
              color="primary"
              rounded
              size="42"
            >
              <VIcon icon="bx-shield-quarter" size="24" />
            </VAvatar>
          </template>

          <VCardTitle>Gestion des rôles</VCardTitle>
          <VCardSubtitle>
            {{ totalRoles }} rôle(s) · {{ totalUsersAssigned }} utilisateur(s) affecté(s)
          </VCardSubtitle>

          <template #append>
            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter un rôle
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <!-- Barre de recherche -->
        <VCardText class="d-flex flex-wrap gap-4 py-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un rôle..."
            density="compact"
            prepend-inner-icon="bx-search"
            style="max-inline-size: 320px;"
            clearable
            hide-details
          />
        </VCardText>

        <VDivider />

        <VTable class="roles-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center" style="inline-size: 64px;">
                N°
              </th>
              <th class="text-uppercase">
                Libellé du rôle
              </th>
              <th class="text-uppercase text-center">
                Utilisateurs
              </th>
              <th class="text-uppercase text-center" style="inline-size: 120px;">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="text-center pa-8">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>

            <tr v-else-if="filteredRoles.length === 0">
              <td colspan="4" class="text-center pa-8">
                <VIcon
                  icon="bx-search-alt"
                  size="40"
                  color="disabled"
                  class="mb-2"
                />
                <p class="text-medium-emphasis mb-0">
                  {{ searchQuery ? 'Aucun rôle trouvé pour cette recherche' : 'Aucun rôle trouvé' }}
                </p>
              </td>
            </tr>

            <tr
              v-for="(role, index) in filteredRoles"
              :key="role.idRole"
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
                    <VIcon icon="bx-shield" size="18" />
                  </VAvatar>
                  <span class="font-weight-medium">{{ role.libelleRole }}</span>
                </div>
              </td>
              <td class="text-center">
                <VChip
                  :color="role.nombreUtilisateurs ? 'primary' : 'secondary'"
                  variant="tonal"
                  size="small"
                  label
                >
                  {{ role.nombreUtilisateurs || 0 }}
                </VChip>
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
                      @click="openEditDialog(role)"
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
                      @click="confirmDelete(role)"
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
      max-width="480"
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
            {{ isEditing ? 'Modifier le rôle' : 'Ajouter un nouveau rôle' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du rôle' : 'Saisissez le libellé du nouveau rôle' }}
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
          <VForm @submit.prevent="saveRole">
            <VTextField
              v-model="formData.libelleRole"
              label="Libellé du rôle"
              placeholder="Ex: Contrôleur, Validateur, ..."
              prepend-inner-icon="bx-shield"
              :error-messages="formErrors.libelleRole"
              :disabled="isSubmitting"
              autofocus
            />
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
            @click="saveRole"
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
            Vous êtes sur le point de supprimer le rôle
            <strong class="text-high-emphasis">"{{ roleToDelete?.libelleRole }}"</strong>.
          </p>
          <VAlert
            v-if="roleToDelete?.nombreUtilisateurs"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-4 text-start"
          >
            Ce rôle est affecté à {{ roleToDelete.nombreUtilisateurs }} utilisateur(s). La suppression pourrait échouer.
          </VAlert>
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
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.roles-table :deep(th) {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.roles-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>