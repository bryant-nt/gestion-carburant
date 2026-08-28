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

const totalPermissions = computed(() => permissions.value.length)

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

const closeDialog = () => {
  if (isSubmitting.value) return
  showDialog.value = false
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

  isDeleting.value = true

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
  } finally {
    isDeleting.value = false
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
      <VCard>
        <VCardItem class="pb-2">
          <template #prepend>
            <VAvatar
              variant="tonal"
              color="primary"
              rounded
              size="42"
            >
              <VIcon icon="bx-key" size="24" />
            </VAvatar>
          </template>

          <VCardTitle>Gestion des permissions</VCardTitle>
          <VCardSubtitle>
            {{ totalPermissions }} permission(s) enregistrée(s)
          </VCardSubtitle>

          <template #append>
            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter une permission
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <!-- Barre de recherche -->
        <VCardText class="d-flex flex-wrap gap-4 py-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher une permission..."
            density="compact"
            prepend-inner-icon="bx-search"
            style="max-inline-size: 320px;"
            clearable
            hide-details
          />
        </VCardText>

        <VDivider />

        <VTable class="permissions-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center" style="inline-size: 64px;">
                N°
              </th>
              <th class="text-uppercase">
                Libellé
              </th>
              <th class="text-uppercase text-center" style="inline-size: 120px;">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="3" class="text-center pa-8">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>

            <tr v-else-if="filteredPermissions.length === 0">
              <td colspan="3" class="text-center pa-8">
                <VIcon
                  icon="bx-search-alt"
                  size="40"
                  color="disabled"
                  class="mb-2"
                />
                <p class="text-medium-emphasis mb-0">
                  {{ searchQuery ? 'Aucune permission trouvée pour cette recherche' : 'Aucune permission trouvée' }}
                </p>
              </td>
            </tr>

            <tr
              v-for="(permission, index) in filteredPermissions"
              :key="permission.idPermission"
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
                    <VIcon icon="bx-key" size="18" />
                  </VAvatar>
                  <VChip
                    color="secondary"
                    variant="tonal"
                    size="small"
                    label
                    class="font-weight-medium"
                  >
                    {{ permission.libellePermission }}
                  </VChip>
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
                      @click="openEditDialog(permission)"
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
                      @click="confirmDelete(permission)"
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
            {{ isEditing ? 'Modifier la permission' : 'Ajouter une nouvelle permission' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de la permission' : 'Saisissez le libellé de la nouvelle permission' }}
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
          <VForm @submit.prevent="savePermission">
            <VTextField
              v-model="formData.libellePermission"
              label="Libellé de la permission"
              placeholder="Ex: GERER_STOCK, VOIR_RAPPORTS, ..."
              prepend-inner-icon="bx-key"
              :error-messages="formErrors.libellePermission"
              :disabled="isSubmitting"
              autofocus
              hint="Le libellé sera automatiquement converti en majuscules"
              persistent-hint
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
            @click="savePermission"
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
            Vous êtes sur le point de supprimer la permission
            <strong class="text-high-emphasis">"{{ permissionToDelete?.libellePermission }}"</strong>.
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
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.permissions-table :deep(th) {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.permissions-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>