<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import ExcelJS from 'exceljs'
import { axiosIns } from '@/plugins/axios'
import { useEquipementsStore } from '@/stores/equipements'
import { useTypeEquipementStore } from '@/stores/typeEquipement'
import { useStatutEquipementStore } from '@/stores/statutEquipement'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'

// Initialisation des stores
const equipementsStore = useEquipementsStore()
const typeEquipementStore = useTypeEquipementStore()
const statutEquipementStore = useStatutEquipementStore()
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// État du dialogue
const showDialog = ref(false)
const isEditing = ref(false)
const formData = ref({
  idEquipement: null,
  immatriculationEquipement: '',
  marqueEquipement: '',
  modeleEquipement: '',
  idTypeEquipement: null,
  idStatut: null,
  idCarburant: null,
  photoEquipement: null,
  photoFile: null
})
const formErrors = ref({})
const isSubmitting = ref(false)
const isExporting = ref(false)
const photoPreview = ref(null)

// État du dialogue de confirmation de suppression
const showDeleteDialog = ref(false)
const equipementToDelete = ref(null)

// État du snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const searchQuery = ref('')
const filterType = ref(null)
const filterStatut = ref(null)

// --- Gestion des photos protégées (JWT via Axios) -----------------------
// Les fichiers uploadés sont derrière Spring Security -> une balise <img>
// classique ne peut pas envoyer le token. On récupère donc chaque photo
// via Axios (qui ajoute le Bearer token via l'intercepteur), on la
// transforme en blob, puis en URL locale utilisable par VAvatar/<img>.
// Utilisation de `reactive` (au lieu de `ref`) pour une réactivité fiable
// sur les mutations de Map (set/delete/clear).
const photoUrlCache = reactive(new Map())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return

  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
    console.log('✅ Photo protégée chargée pour ID', id)
  } catch (error) {
    console.error('❌ Impossible de charger la photo protégée pour ID', id, error)
    brokenPhotos.value.add(id)
  }
}

const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}

// Charge les photos protégées par petits lots successifs (au lieu de tout
// lancer en parallèle) pour éviter de saturer le backend.
const loadPhotosInBatches = async (items, batchSize = 3) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await Promise.all(
      batch.map(e =>
        e.photoEquipement
          ? loadAuthenticatedPhoto(e.idEquipement, e.photoEquipement)
          : Promise.resolve()
      )
    )
  }
}

// Suivi des photos qui échouent au chargement pour basculer sur l'icône par défaut
const brokenPhotos = ref(new Set())
const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}

// Computed
const equipements = computed(() => equipementsStore.equipements)
const types = computed(() => typeEquipementStore.types)
const statuts = computed(() => statutEquipementStore.statuts)
const carburants = computed(() => typeCarburantStore.types)
const loading = computed(() => equipementsStore.loading || typeEquipementStore.loading || statutEquipementStore.loading || typeCarburantStore.loading)
const isAdmin = computed(() => authStore.isAdmin)

// Options pour les selects
const typeOptions = computed(() => {
  return types.value.map(type => ({
    title: type.libelleTypeEquipement,
    value: type.idTypeEquipement
  }))
})

const statutOptions = computed(() => {
  return statuts.value.map(statut => ({
    title: statut.libelleStatut,
    value: statut.idStatut
  }))
})

const carburantOptions = computed(() => {
  return carburants.value.map(carburant => ({
    title: carburant.libelleCarburant,
    value: carburant.idCarburant
  }))
})

// Filtrer les équipements
const filteredEquipements = computed(() => {
  let result = equipements.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(e =>
      e.immatriculationEquipement?.toLowerCase().includes(query) ||
      e.marqueEquipement?.toLowerCase().includes(query) ||
      e.modeleEquipement?.toLowerCase().includes(query)
    )
  }

  if (filterType.value) {
    result = result.filter(e => e.idTypeEquipement === filterType.value)
  }

  if (filterStatut.value) {
    result = result.filter(e => e.idStatut === filterStatut.value)
  }

  return result
})

// Méthodes
const loadData = async () => {
  console.log('🔄 Chargement des données...')
  try {
    await Promise.all([
      equipementsStore.fetchEquipements(),
      typeEquipementStore.fetchTypes(),
      statutEquipementStore.fetchStatuts(),
      typeCarburantStore.fetchTypes()
    ])

    console.log('✅ Données chargées avec succès')

    // Charger les photos protégées par lots
    await loadPhotosInBatches(equipementsStore.equipements, 3)

  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error)
    showNotification('Erreur lors du chargement des données', 'error')
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

// -----------------------------------------------------------------------
// Export Excel (ExcelJS)
// -----------------------------------------------------------------------
const exportToExcel = async () => {
  if (isExporting.value) return
  isExporting.value = true

  try {
    const dataSource = filteredEquipements.value || []

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SI GESCAR'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Parc équipements', {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    })

    const NAVY = 'FF0B2545'
    const AMBER = 'FFE8A33D'
    const LIGHT = 'FFF4F7FB'
    const BORDER = 'FFD9E2EC'

    const headers = [
      'N°', 'Immatriculation', 'Marque', 'Modèle', 'Type', 'Carburant', 'Statut'
    ]

    worksheet.columns = [
      { width: 6 }, { width: 20 }, { width: 18 }, { width: 20 },
      { width: 20 }, { width: 16 }, { width: 16 }
    ]

    worksheet.mergeCells('A1:G1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = "MINISTÈRE DES FINANCES, DU BUDGET ET DE L'ÉCONOMIE NUMÉRIQUE"
    titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    worksheet.getRow(1).height = 30

    worksheet.mergeCells('A2:G2')
    const subtitleCell = worksheet.getCell('A2')
    subtitleCell.value = 'SI GESCAR — Parc des équipements'
    subtitleCell.font = { bold: true, italic: true, size: 11, color: { argb: 'FF1E3A5F' } }
    subtitleCell.alignment = { horizontal: 'center' }
    worksheet.getRow(2).height = 20

    worksheet.mergeCells('A3:G3')
    const dateCell = worksheet.getCell('A3')
    dateCell.value = `Généré le ${new Date().toLocaleString('fr-FR')} — ${dataSource.length} équipement(s)`
    dateCell.font = { size: 9, color: { argb: 'FF64748B' } }
    dateCell.alignment = { horizontal: 'center' }
    worksheet.getRow(3).height = 16

    worksheet.getRow(4).height = 6

    const headerRowIndex = 5
    const headerRow = worksheet.getRow(headerRowIndex)
    headerRow.values = headers
    headerRow.height = 26
    headerRow.eachCell(cell => {
      cell.font = { bold: true, size: 10.5, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: NAVY } },
        left: { style: 'thin', color: { argb: NAVY } },
        bottom: { style: 'medium', color: { argb: AMBER } },
        right: { style: 'thin', color: { argb: NAVY } }
      }
    })

    dataSource.forEach((e, i) => {
      const rowIndex = headerRowIndex + 1 + i
      const row = worksheet.getRow(rowIndex)
      row.values = [
        i + 1,
        e.immatriculationEquipement || '-',
        e.marqueEquipement || '-',
        e.modeleEquipement || '-',
        e.typeEquipement?.libelleTypeEquipement || '-',
        e.carburant?.libelleCarburant || '-',
        e.statut?.libelleStatut || '-'
      ]
      row.height = 20

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER } },
          left: { style: 'thin', color: { argb: BORDER } },
          bottom: { style: 'thin', color: { argb: BORDER } },
          right: { style: 'thin', color: { argb: BORDER } }
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: (colNumber === 2 || colNumber === 3 || colNumber === 4) ? 'left' : 'center'
        }
        cell.font = { size: 10, color: { argb: 'FF1E293B' } }
      })

      if (i % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
        })
      }

      row.getCell(2).font = { ...row.getCell(2).font, bold: true }

      const statutLibelle = e.statut?.libelleStatut
      const isActif = statutLibelle === 'Actif' || statutLibelle === 'VIP'
      row.getCell(7).font = {
        bold: true,
        size: 10,
        color: { argb: isActif ? 'FF16A34A' : 'FFDC2626' }
      }
    })

    const lastDataRow = headerRowIndex + dataSource.length

    if (dataSource.length > 0) {
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: lastDataRow, column: 7 }
      }
    }

    const totalRowIndex = lastDataRow + 2
    worksheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`)
    const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`)
    totalLabelCell.value = `Total des équipements : ${dataSource.length}`
    totalLabelCell.font = { bold: true, size: 10.5, color: { argb: NAVY } }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const fileName = `parc_equipements_${new Date().toISOString().slice(0, 10)}.xlsx`

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showNotification('Export Excel généré avec succès ✅', 'success')
  } catch (error) {
    console.error('Erreur export Excel:', error)
    showNotification("Erreur lors de l'export Excel", 'error')
  } finally {
    isExporting.value = false
  }
}

const openCreateDialog = () => {
  isEditing.value = false
  formData.value = {
    idEquipement: null,
    immatriculationEquipement: '',
    marqueEquipement: '',
    modeleEquipement: '',
    idTypeEquipement: null,
    idStatut: null,
    idCarburant: null,
    photoEquipement: null,
    photoFile: null
  }
  photoPreview.value = null
  formErrors.value = {}
  showDialog.value = true
}

const openEditDialog = (equipement) => {
  isEditing.value = true
  formData.value = {
    idEquipement: equipement.idEquipement,
    immatriculationEquipement: equipement.immatriculationEquipement || '',
    marqueEquipement: equipement.marqueEquipement || '',
    modeleEquipement: equipement.modeleEquipement || '',
    idTypeEquipement: equipement.idTypeEquipement || null,
    idStatut: equipement.idStatut || null,
    idCarburant: equipement.idCarburant || null,
    photoEquipement: equipement.photoEquipement || null,
    photoFile: null
  }

  // Prévisualisation de la photo existante : on réutilise le cache si déjà
  // chargé, sinon on va la chercher
  if (equipement.photoEquipement) {
    const cached = photoUrlCache.get(equipement.idEquipement)
    if (cached) {
      photoPreview.value = cached
    } else {
      photoPreview.value = null
      loadAuthenticatedPhoto(equipement.idEquipement, equipement.photoEquipement)
        .then(() => {
          photoPreview.value = photoUrlCache.get(equipement.idEquipement) || null
        })
    }
  } else {
    photoPreview.value = null
  }

  formErrors.value = {}
  showDialog.value = true
}

const onFileChange = (event) => {
  const file = event.target.files[0]

  if (file) {
    if (!file.type.startsWith('image/')) {
      showNotification('Veuillez sélectionner une image', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('L\'image ne doit pas dépasser 5MB', 'error')
      return
    }
    formData.value.photoFile = file
    const reader = new FileReader()
    reader.onload = (e) => {
      photoPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  formData.value.photoFile = null
  photoPreview.value = null
  const fileInput = document.getElementById('photoInput')
  if (fileInput) {
    fileInput.value = ''
  }
}

const validateForm = () => {
  const errors = {}

  if (!formData.value.immatriculationEquipement || formData.value.immatriculationEquipement.trim() === '') {
    errors.immatriculationEquipement = 'L\'immatriculation est requise'
  }

  if (!formData.value.marqueEquipement || formData.value.marqueEquipement.trim() === '') {
    errors.marqueEquipement = 'La marque est requise'
  }

  if (!formData.value.modeleEquipement || formData.value.modeleEquipement.trim() === '') {
    errors.modeleEquipement = 'Le modèle est requis'
  }

  if (!formData.value.idTypeEquipement) {
    errors.idTypeEquipement = 'Le type d\'équipement est requis'
  }

  if (!formData.value.idStatut) {
    errors.idStatut = 'Le statut est requis'
  }

  if (!formData.value.idCarburant) {
    errors.idCarburant = 'Le carburant est requis'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const saveEquipement = async () => {
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    let photoPath = null
    if (formData.value.photoFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('file', formData.value.photoFile)
      const photoResponse = await equipementsStore.uploadPhoto(formDataPhoto)
      photoPath = photoResponse?.photoEquipement
    }

    const equipementData = {
      immatriculationEquipement: formData.value.immatriculationEquipement.trim(),
      marqueEquipement: formData.value.marqueEquipement.trim(),
      modeleEquipement: formData.value.modeleEquipement.trim(),
      idTypeEquipement: formData.value.idTypeEquipement,
      idStatut: formData.value.idStatut,
      idCarburant: formData.value.idCarburant
    }

    if (photoPath) {
      equipementData.photoEquipement = photoPath
    } else if (isEditing.value && formData.value.photoEquipement) {
      equipementData.photoEquipement = formData.value.photoEquipement
    }

    let savedId = formData.value.idEquipement

    if (!isEditing.value) {
      const response = await equipementsStore.createEquipement(equipementData)
      savedId = response.idEquipement
      showNotification('Équipement créé avec succès ! ✅', 'success')
    } else {
      await equipementsStore.updateEquipement(formData.value.idEquipement, equipementData)
      showNotification('Équipement modifié avec succès ! ✅', 'success')
    }

    // Si une nouvelle photo a été uploadée, on invalide l'ancienne entrée
    // du cache pour forcer un rechargement de la bonne image
    if (photoPath && savedId) {
      const oldUrl = photoUrlCache.get(savedId)
      if (oldUrl) URL.revokeObjectURL(oldUrl)
      photoUrlCache.delete(savedId)
      brokenPhotos.value.delete(savedId)
    }

    showDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error)
    if (error.response?.status === 409) {
      formErrors.value.immatriculationEquipement = 'Cette immatriculation existe déjà'
      showNotification('Cette immatriculation existe déjà !', 'warning')
    } else {
      showNotification('Erreur lors de la sauvegarde de l\'équipement', 'error')
    }
  } finally {
    isSubmitting.value = false
  }
}

const confirmDelete = (equipement) => {
  equipementToDelete.value = equipement
  showDeleteDialog.value = true
}

const deleteEquipement = async () => {
  if (!equipementToDelete.value) return

  try {
    await equipementsStore.deleteEquipement(equipementToDelete.value.idEquipement)

    // Nettoyage du cache pour l'équipement supprimé
    const url = photoUrlCache.get(equipementToDelete.value.idEquipement)
    if (url) URL.revokeObjectURL(url)
    photoUrlCache.delete(equipementToDelete.value.idEquipement)

    showDeleteDialog.value = false
    showNotification(`Équipement "${equipementToDelete.value.immatriculationEquipement}" supprimé avec succès ! 🗑️`, 'success')
    equipementToDelete.value = null
    await loadData()
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    showNotification('Erreur lors de la suppression de l\'équipement', 'error')
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  filterType.value = null
  filterStatut.value = null
}

// Charger les données au montage
onMounted(() => {
  loadData()
})

// Libérer la mémoire des Object URLs au démontage du composant
onUnmounted(() => {
  revokeAllPhotoUrls()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard title="Gestion du parc d'équipements">
        <template #append>
          <div class="d-flex gap-2">
            <VBtn
              color="success"
              variant="tonal"
              prepend-icon="bx-file"
              :loading="isExporting"
              :disabled="isExporting || filteredEquipements.length === 0"
              @click="exportToExcel"
            >
              Exporter Excel
            </VBtn>
            <VBtn
              color="primary"
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Ajouter un équipement
            </VBtn>
          </div>
        </template>

        <!-- Filtres -->
        <VCardText>
          <VRow>
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Immatriculation, marque..."
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterType"
                label="Type"
                :items="typeOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les types"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="3">
              <VSelect
                v-model="filterStatut"
                label="Statut"
                :items="statutOptions"
                item-title="title"
                item-value="value"
                placeholder="Tous les statuts"
                clearable
                density="compact"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn
                color="secondary"
                variant="tonal"
                @click="resetFilters"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des équipements -->
        <VTable>
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Immatriculation</th>
              <th>Marque</th>
              <th>Modèle</th>
              <th>Type</th>
              <th>Carburant</th>
              <th>Statut</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
                <div class="mt-2 text-caption">Chargement...</div>
              </td>
            </tr>
            <tr v-else-if="filteredEquipements.length === 0">
              <td colspan="9" class="text-center pa-4 text-medium-emphasis">
                Aucun équipement trouvé
              </td>
            </tr>
            <tr
              v-for="(equipement, index) in filteredEquipements"
              :key="equipement.idEquipement"
            >
              <td class="text-center">
                {{ index + 1 }}
              </td>
              <td>
  <VAvatar
    size="64"
    :color="(!photoUrlCache.get(equipement.idEquipement) || brokenPhotos.has(equipement.idEquipement)) ? 'primary' : undefined"
    :variant="(!photoUrlCache.get(equipement.idEquipement) || brokenPhotos.has(equipement.idEquipement)) ? 'tonal' : undefined"
  >
    <VImg
      v-if="photoUrlCache.get(equipement.idEquipement) && !brokenPhotos.has(equipement.idEquipement)"
      :src="photoUrlCache.get(equipement.idEquipement)"
      cover
      @error="onPhotoError(equipement.idEquipement)"
    />
    <VIcon v-else icon="bx-image" size="32" />
  </VAvatar>
</td>
              <td>
                <div class="font-weight-medium">
                  {{ equipement.immatriculationEquipement }}
                </div>
              </td>
              <td>
                {{ equipement.marqueEquipement || '-' }}
              </td>
              <td>
                {{ equipement.modeleEquipement || '-' }}
              </td>
              <td>
                <VChip size="small" label color="primary">
                  {{ equipement.typeEquipement?.libelleTypeEquipement || '-' }}
                </VChip>
              </td>
              <td>
                <VChip size="small" label color="info">
                  {{ equipement.carburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td>
                <VChip
                  size="small"
                  label
                  :color="equipement.statut?.libelleStatut === 'Actif' || equipement.statut?.libelleStatut === 'VIP' ? 'success' : 'error'"
                >
                  {{ equipement.statut?.libelleStatut || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="primary"
                  @click="openEditDialog(equipement)"
                >
                  <VIcon size="20" icon="bx-edit" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="confirmDelete(equipement)"
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
      max-width="600"
      persistent
    >
      <VCard>
        <VCardItem>
          <VCardTitle>
            {{ isEditing ? 'Modifier l\'équipement' : 'Ajouter un équipement' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ isEditing ? 'Modifiez les informations de l\'équipement' : 'Saisissez les informations du nouvel équipement' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <VForm @submit.prevent="saveEquipement">
            <!-- Photo de l'équipement -->
            <div class="d-flex align-center mb-4">
              <VAvatar
  size="80"
  :color="!photoPreview ? 'primary' : undefined"
  :variant="!photoPreview ? 'tonal' : undefined"
  class="me-4"
>
  <VImg v-if="photoPreview" :src="photoPreview" cover />
  <VIcon v-else icon="bx-image" size="40" />
</VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis">Photo de l'équipement</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    @click="$refs.fileInput.click()"
                  >
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn
                    v-if="photoPreview"
                    size="small"
                    variant="tonal"
                    color="error"
                    @click="removePhoto"
                  >
                    <VIcon icon="bx-trash" size="16" class="me-1" />
                    Supprimer
                  </VBtn>
                </div>
                <input
                  ref="fileInput"
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  class="d-none"
                  @change="onFileChange"
                />
                <div class="text-caption text-medium-emphasis mt-1">
                  JPG, PNG ou GIF (max 5MB)
                </div>
              </div>
            </div>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.immatriculationEquipement"
                  label="Immatriculation"
                  placeholder="Ex: E1327A"
                  :error-messages="formErrors.immatriculationEquipement"
                  :loading="isSubmitting"
                  autofocus
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.marqueEquipement"
                  label="Marque"
                  placeholder="Ex: Toyota"
                  :error-messages="formErrors.marqueEquipement"
                  :loading="isSubmitting"
                />
              </VCol>
            </VRow>

            <VTextField
              v-model="formData.modeleEquipement"
              label="Modèle"
              placeholder="Ex: Land Cruise"
              :error-messages="formErrors.modeleEquipement"
              :loading="isSubmitting"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idTypeEquipement"
              label="Type d'équipement"
              :items="typeOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un type"
              :error-messages="formErrors.idTypeEquipement"
              :loading="loading"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idStatut"
              label="Statut"
              :items="statutOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un statut"
              :error-messages="formErrors.idStatut"
              :loading="loading"
              class="mt-4"
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
            Êtes-vous sûr de vouloir supprimer cet équipement ?
          </VCardSubtitle>
        </VCardItem>

        <VCardText>
          <p class="text-medium-emphasis">
            Vous êtes sur le point de supprimer l'équipement
            <strong class="text-high-emphasis">"{{ equipementToDelete?.immatriculationEquipement }}"</strong>.
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
            @click="deleteEquipement"
          >
            Supprimer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
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