<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatDateOnly, arrayToDate } from '@/utils/dateHelpers'

// Initialisation des stores
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idCarburant: null,
  libelleCarburant: '',
  dateEnregistrement: null
})
const formErrors = ref({})
const isSubmitting = ref(false)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const typeToDelete = ref(null)
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
const types = computed(() => typeCarburantStore.types)
const loading = computed(() => typeCarburantStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Filtrer les types de carburant par recherche
const filteredTypes = computed(() => {
  if (!searchQuery.value) return types.value
  const query = searchQuery.value.toLowerCase()
  return types.value.filter(type =>
    type.libelleCarburant.toLowerCase().includes(query)
  )
})

const totalTypes = computed(() => types.value.length)

// Méthodes
const loadTypes = async () => {
  try {
    await typeCarburantStore.fetchTypes()
  } catch (error) {
    showNotification('Erreur lors du chargement des types de carburant', 'error')
    console.error('Erreur lors du chargement des types de carburant:', error)
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
    idCarburant: null,
    libelleCarburant: '',
    dateEnregistrement: null
  }
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (type) => {
  isEditing.value = true
  formData.value = {
    idCarburant: type.idCarburant,
    libelleCarburant: type.libelleCarburant,
    dateEnregistrement: type.dateEnregistrement ? arrayToDate(type.dateEnregistrement) : null
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
  if (!formData.value.libelleCarburant || formData.value.libelleCarburant.trim() === '') {
    errors.libelleCarburant = 'Le libellé du type de carburant est requis'
  } else if (formData.value.libelleCarburant.length < 2) {
    errors.libelleCarburant = 'Le libellé doit contenir au moins 2 caractères'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveType = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const typeData = {
      libelleCarburant: formData.value.libelleCarburant.trim()
    }

    if (isEditing.value) {
      await typeCarburantStore.updateType(formData.value.idCarburant, typeData)
      showNotification('Type de carburant modifié avec succès ! ✅', 'success')
    } else {
      await typeCarburantStore.createType(typeData)
      showNotification('Type de carburant ajouté avec succès ! ✅', 'success')
    }

    showDialog.value = false
    await loadTypes()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.libelleCarburant = 'Un type de carburant avec ce libellé existe déjà'
      showNotification('Ce libellé existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde du type de carburant', 'error')
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

  isDeleting.value = true

  try {
    await typeCarburantStore.deleteType(typeToDelete.value.idCarburant)
    showDeleteDialog.value = false
    showNotification(`Type "${typeToDelete.value.libelleCarburant}" supprimé avec succès ! 🗑️`, 'success')
    typeToDelete.value = null
    await loadTypes()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    if (error.response?.status === 409) {
      showNotification('Ce type de carburant est utilisé et ne peut pas être supprimé', 'error')
    } else {
      showNotification('Erreur lors de la suppression du type de carburant', 'error')
    }
  } finally {
    isDeleting.value = false
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
      <VCard>
        <VCardItem class="pb-2">
          <template #prepend>
            <VAvatar
              variant="tonal"
              color="primary"
              rounded
              size="42"
            >
              <VIcon icon="bx-droplet" size="24" />
            </VAvatar>
          </template>

          <VCardTitle>Types de carburant</VCardTitle>
          <VCardSubtitle>
            {{ totalTypes }} type(s) enregistré(s)
          </VCardSubtitle>

          <template #append>
            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter un type
            </VBtn>
          </template>
        </VCardItem>

        <VDivider />

        <!-- Barre de recherche -->
        <VCardText class="d-flex flex-wrap gap-4 py-4">
          <VTextField
            v-model="searchQuery"
            placeholder="Rechercher un type de carburant..."
            density="compact"
            prepend-inner-icon="bx-search"
            style="max-inline-size: 320px;"
            clearable
            hide-details
          />
        </VCardText>

        <VDivider />

        <VTable class="types-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center" style="inline-size: 64px;">
                N°
              </th>
              <th class="text-uppercase">
                Libellé
              </th>
              <th class="text-uppercase text-center">
                Date d'enregistrement
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

            <tr v-else-if="filteredTypes.length === 0">
              <td colspan="4" class="text-center pa-8">
                <VIcon
                  icon="bx-search-alt"
                  size="40"
                  color="disabled"
                  class="mb-2"
                />
                <p class="text-medium-emphasis mb-0">
                  {{ searchQuery ? 'Aucun type de carburant trouvé pour cette recherche' : 'Aucun type de carburant trouvé' }}
                </p>
              </td>
            </tr>

            <tr
              v-for="(type, index) in filteredTypes"
              :key="type.idCarburant"
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
                    <VIcon icon="bx-droplet" size="18" />
                  </VAvatar>
                  <VChip
                    color="primary"
                    variant="tonal"
                    size="small"
                    label
                    class="font-weight-medium"
                  >
                    {{ type.libelleCarburant }}
                  </VChip>
                </div>
              </td>
              <td class="text-center">
                <div class="d-flex align-center justify-center gap-2 text-medium-emphasis">
                  <VIcon icon="bx-calendar" size="16" />
                  <span>{{ formatDate(type.dateEnregistrement) }}</span>
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
                      @click="openEditDialog(type)"
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
                      @click="confirmDelete(type)"
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
            {{ isEditing ? 'Modifier le type' : 'Ajouter un nouveau type' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations du type' : 'Saisissez le libellé du nouveau type' }}
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
          <VForm @submit.prevent="saveType">
            <VTextField
              v-model="formData.libelleCarburant"
              label="Libellé du type"
              placeholder="Ex: Essence, Gasoil, Mazout, ..."
              prepend-inner-icon="bx-droplet"
              :error-messages="formErrors.libelleCarburant"
              :disabled="isSubmitting"
              autofocus
            />

            <VTextField
              v-if="isEditing && formData.dateEnregistrement"
              :model-value="formatDateOnly(formData.dateEnregistrement)"
              label="Date d'enregistrement"
              prepend-inner-icon="bx-calendar"
              readonly
              disabled
              class="mt-4"
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
            @click="saveType"
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
            Vous êtes sur le point de supprimer le type
            <strong class="text-high-emphasis">"{{ typeToDelete?.libelleCarburant }}"</strong>.
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
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.types-table :deep(th) {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.types-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}
</style>