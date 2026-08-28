<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import ExcelJS from 'exceljs'
import { axiosIns } from '@/plugins/axios'
import { useEquipementsStore } from '@/stores/equipements'
import { useTypeEquipementStore } from '@/stores/typeEquipement'
import { useStatutEquipementStore } from '@/stores/statutEquipement'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'

// Stores
const equipementsStore = useEquipementsStore()
const typeEquipementStore = useTypeEquipementStore()
const statutEquipementStore = useStatutEquipementStore()
const typeCarburantStore = useTypeCarburantStore()
const authStore = useAuthStore()

// Dialog state
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

// Delete confirmation
const showDeleteDialog = ref(false)
const equipementToDelete = ref(null)

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filters & Pagination
const searchQuery = ref('')
const filterType = ref(null)
const filterStatut = ref(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)

// --- Gestion des photos protégées ---
const photoUrlCache = reactive(new Map())
const brokenPhotos = ref(new Set())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return
  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
  } catch (error) {
    console.error('❌ Impossible de charger la photo pour ID', id, error)
    brokenPhotos.value.add(id)
  }
}

const revokeAllPhotoUrls = () => {
  photoUrlCache.forEach(url => URL.revokeObjectURL(url))
  photoUrlCache.clear()
}

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

const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}

// Computed
const equipements = computed(() => equipementsStore.equipements)
const types = computed(() => typeEquipementStore.types)
const statuts = computed(() => statutEquipementStore.statuts)
const carburants = computed(() => typeCarburantStore.types)
const loading = computed(() =>
  equipementsStore.loading ||
  typeEquipementStore.loading ||
  statutEquipementStore.loading ||
  typeCarburantStore.loading
)
const isAdmin = computed(() => authStore.isAdmin)

// Stats
const totalEquipements = computed(() => equipements.value.length)
const activeEquipements = computed(() =>
  equipements.value.filter(e =>
    e.statut?.libelleStatut === 'Actif' || e.statut?.libelleStatut === 'VIP'
  ).length
)
const inactiveEquipements = computed(() =>
  equipements.value.filter(e =>
    e.statut?.libelleStatut !== 'Actif' && e.statut?.libelleStatut !== 'VIP'
  ).length
)
const distinctTypesCount = computed(() => {
  const typeIds = new Set(equipements.value.map(e => e.idTypeEquipement).filter(id => id))
  return typeIds.size
})

// Options for selects
const typeOptions = computed(() =>
  types.value.map(type => ({
    title: type.libelleTypeEquipement,
    value: type.idTypeEquipement
  }))
)

const statutOptions = computed(() =>
  statuts.value.map(statut => ({
    title: statut.libelleStatut,
    value: statut.idStatut
  }))
)

const carburantOptions = computed(() =>
  carburants.value.map(carburant => ({
    title: carburant.libelleCarburant,
    value: carburant.idCarburant
  }))
)

// Filtering & Pagination
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

const totalPages = computed(() =>
  Math.ceil(filteredEquipements.value.length / itemsPerPage.value)
)

const paginatedEquipements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredEquipements.value.slice(start, end)
})

// Methods
const loadData = async () => {
  try {
    await Promise.all([
      equipementsStore.fetchEquipements(),
      typeEquipementStore.fetchTypes(),
      statutEquipementStore.fetchStatuts(),
      typeCarburantStore.fetchTypes()
    ])
    await loadPhotosInBatches(equipementsStore.equipements, 3)
  } catch (error) {
    console.error('❌ Erreur lors du chargement:', error)
    showNotification('Erreur lors du chargement des données', 'error')
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color, timeout: 3000 }
}

// Export Excel
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

    const headers = ['N°', 'Immatriculation', 'Marque', 'Modèle', 'Type', 'Carburant', 'Statut']
    worksheet.columns = [
      { width: 6 }, { width: 20 }, { width: 18 }, { width: 20 },
      { width: 20 }, { width: 16 }, { width: 16 }
    ]

    // Title
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
    reader.onload = (e) => { photoPreview.value = e.target.result }
    reader.readAsDataURL(file)
  }
}

const removePhoto = () => {
  formData.value.photoFile = null
  photoPreview.value = null
  const fileInput = document.getElementById('photoInput')
  if (fileInput) fileInput.value = ''
}

const validateForm = () => {
  const errors = {}
  if (!formData.value.immatriculationEquipement?.trim()) {
    errors.immatriculationEquipement = 'L\'immatriculation est requise'
  }
  if (!formData.value.marqueEquipement?.trim()) {
    errors.marqueEquipement = 'La marque est requise'
  }
  if (!formData.value.modeleEquipement?.trim()) {
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
    const url = photoUrlCache.get(equipementToDelete.value.idEquipement)
    if (url) URL.revokeObjectURL(url)
    photoUrlCache.delete(equipementToDelete.value.idEquipement)
    showDeleteDialog.value = false
    showNotification(`Équipement "${equipementToDelete.value.immatriculationEquipement}" supprimé ! 🗑️`, 'success')
    equipementToDelete.value = null
    await loadData()
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
    showNotification('Erreur lors de la suppression', 'error')
  }
}

const resetFilters = () => {
  searchQuery.value = ''
  filterType.value = null
  filterStatut.value = null
  currentPage.value = 1
}

const changePage = (page) => {
  currentPage.value = page
}

// Lifecycle
onMounted(() => {
  loadData()
})
onUnmounted(() => {
  revokeAllPhotoUrls()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <!-- Page Header -->
      <div class="d-flex align-center justify-space-between mb-6 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold text-primary">Gestion du parc d'équipements</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Gérez l'ensemble des véhicules et équipements roulants
          </p>
        </div>
        <div class="d-flex gap-3">
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
            size="large"
            prepend-icon="bx-plus"
            @click="openCreateDialog"
            elevation="2"
          >
            Ajouter un équipement
          </VBtn>
        </div>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-car" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total équipements
                </div>
                <div class="text-h4 font-weight-bold">{{ totalEquipements }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="success" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-success-light pa-3 me-4">
                <VIcon icon="bx-check-circle" size="28" color="success" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  VIP
                </div>
                <div class="text-h4 font-weight-bold">{{ activeEquipements }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="error" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-error-light pa-3 me-4">
                <VIcon icon="bx-x-circle" size="28" color="error" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Ordinaire
                </div>
                <div class="text-h4 font-weight-bold">{{ inactiveEquipements }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="info" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-info-light pa-3 me-4">
                <VIcon icon="bx-category" size="28" color="info" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Types distincts
                </div>
                <div class="text-h4 font-weight-bold">{{ distinctTypesCount }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <VCardItem class="border-bottom">
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 w-100">
            <VCardTitle class="text-h6 font-weight-semibold">
              Liste des équipements
              <VChip size="small" color="primary" variant="tonal" class="ms-2">
                {{ filteredEquipements.length }}
              </VChip>
            </VCardTitle>
            <div class="d-flex align-center gap-2">
              <VBtn
                variant="text"
                icon="bx-refresh"
                size="small"
                @click="loadData"
                :loading="loading"
              />
            </div>
          </div>
        </VCardItem>

        <!-- Filters -->
        <VCardText class="pt-4 pb-2">
          <VRow>
            <VCol cols="12" md="3">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Immatriculation, marque…"
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
                @update:model-value="currentPage = 1"
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
                density="comfortable"
                variant="outlined"
                hide-details
                @update:model-value="currentPage = 1"
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
                density="comfortable"
                variant="outlined"
                hide-details
                @update:model-value="currentPage = 1"
              />
            </VCol>
            <VCol cols="12" md="3" class="d-flex align-center gap-2">
              <VBtn
                color="secondary"
                variant="tonal"
                prepend-icon="bx-undo"
                @click="resetFilters"
                :disabled="!searchQuery && !filterType && !filterStatut"
                class="flex-grow-1"
              >
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Table -->
        <VTable class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width: 60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width: 80px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Immatriculation</th>
              <th class="text-uppercase text-caption font-weight-bold">Marque</th>
              <th class="text-uppercase text-caption font-weight-bold">Modèle</th>
              <th class="text-uppercase text-caption font-weight-bold">Type</th>
              <th class="text-uppercase text-caption font-weight-bold">Carburant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Statut</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="9" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des équipements…</div>
              </td>
            </tr>
            <tr v-else-if="filteredEquipements.length === 0">
              <td colspan="9" class="text-center pa-8">
                <VIcon icon="bx-car" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  {{ searchQuery || filterType || filterStatut ? 'Aucun équipement trouvé' : 'Aucun équipement enregistré' }}
                </div>
                <p class="text-caption text-medium-emphasis">
                  {{ searchQuery || filterType || filterStatut ? 'Ajustez vos filtres' : 'Ajoutez un nouvel équipement' }}
                </p>
              </td>
            </tr>
            <tr
              v-for="(equipement, index) in paginatedEquipements"
              :key="equipement.idEquipement"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (currentPage - 1) * itemsPerPage + index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="48"
                  :color="(!photoUrlCache.get(equipement.idEquipement) || brokenPhotos.has(equipement.idEquipement)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get(equipement.idEquipement) || brokenPhotos.has(equipement.idEquipement)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get(equipement.idEquipement) && !brokenPhotos.has(equipement.idEquipement)"
                    :src="photoUrlCache.get(equipement.idEquipement)"
                    cover
                    @error="onPhotoError(equipement.idEquipement)"
                  />
                  <VIcon v-else icon="bx-image" size="24" />
                </VAvatar>
              </td>
              <td>
                <div class="font-weight-medium">{{ equipement.immatriculationEquipement }}</div>
              </td>
              <td>{{ equipement.marqueEquipement || '-' }}</td>
              <td>{{ equipement.modeleEquipement || '-' }}</td>
              <td>
                <VChip size="small" label color="primary" variant="tonal">
                  {{ equipement.typeEquipement?.libelleTypeEquipement || '-' }}
                </VChip>
              </td>
              <td>
                <VChip size="small" label color="info" variant="tonal">
                  {{ equipement.carburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="equipement.statut?.libelleStatut === 'Actif' || equipement.statut?.libelleStatut === 'VIP' ? 'success' : 'error'"
                  variant="tonal"
                >
                  <VIcon
                    :icon="equipement.statut?.libelleStatut === 'Actif' || equipement.statut?.libelleStatut === 'VIP' ? 'bx-check-circle' : 'bx-x-circle'"
                    size="14"
                    start
                  />
                  {{ equipement.statut?.libelleStatut || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <VTooltip text="Modifier">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="primary"
                        @click="openEditDialog(equipement)"
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
                        @click="confirmDelete(equipement)"
                      >
                        <VIcon size="20" icon="bx-trash" />
                      </VBtn>
                    </template>
                  </VTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
          v-if="filteredEquipements.length > 0"
        >
          <span class="text-caption text-medium-emphasis">
            {{ filteredEquipements.length }} équipement(s) — Page {{ currentPage }} / {{ totalPages || 1 }}
          </span>
          <VPagination
            v-model="currentPage"
            :length="totalPages || 1"
            :total-visible="5"
            @update:model-value="changePage"
            color="primary"
            variant="tonal"
            size="small"
          />
        </div>
      </VCard>
    </VCol>

    <!-- Dialog: Créer / Modifier -->
    <VDialog
      v-model="showDialog"
      max-width="620"
      persistent
      transition="fade-transition"
    >
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon
              :icon="isEditing ? 'bx-edit' : 'bx-plus-circle'"
              color="primary"
              size="28"
            />
            {{ isEditing ? 'Modifier l\'équipement' : 'Ajouter un équipement' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ isEditing ? 'Modifiez les informations de l\'équipement' : 'Saisissez les informations du nouvel équipement' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="saveEquipement">
            <!-- Photo -->
            <div class="d-flex align-center mb-6">
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
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                  Photo de l'équipement
                </div>
                <div class="d-flex gap-2 mt-2">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="bx-upload"
                    @click="$refs.fileInput.click()"
                  >
                    Choisir
                  </VBtn>
                  <VBtn
                    v-if="photoPreview"
                    size="small"
                    variant="tonal"
                    color="error"
                    prepend-icon="bx-trash"
                    @click="removePhoto"
                  >
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
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.immatriculationEquipement"
                  label="Immatriculation"
                  placeholder="Ex: E1327A"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.immatriculationEquipement"
                  :disabled="isSubmitting"
                  autofocus
                  hide-details="auto"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="formData.marqueEquipement"
                  label="Marque"
                  placeholder="Ex: Toyota"
                  variant="outlined"
                  density="comfortable"
                  :error-messages="formErrors.marqueEquipement"
                  :disabled="isSubmitting"
                  hide-details="auto"
                />
              </VCol>
            </VRow>

            <VTextField
              v-model="formData.modeleEquipement"
              label="Modèle"
              placeholder="Ex: Land Cruiser"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.modeleEquipement"
              :disabled="isSubmitting"
              hide-details="auto"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idTypeEquipement"
              label="Type d'équipement"
              :items="typeOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un type"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idTypeEquipement"
              :loading="loading"
              hide-details="auto"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              hide-details="auto"
              class="mt-4"
            />

            <VSelect
              v-model="formData.idStatut"
              label="Statut"
              :items="statutOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un statut"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idStatut"
              :loading="loading"
              hide-details="auto"
              class="mt-4"
            />

            <VDivider class="mt-4 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn
                variant="tonal"
                color="secondary"
                :disabled="isSubmitting"
                @click="showDialog = false"
                size="large"
              >
                Annuler
              </VBtn>
              <VBtn
                type="submit"
                color="primary"
                :loading="isSubmitting"
                :disabled="isSubmitting"
                size="large"
                prepend-icon="bx-save"
              >
                {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Confirmation Dialog -->
    <VDialog
      v-model="showDeleteDialog"
      max-width="420"
      persistent
      transition="fade-transition"
    >
      <VCard rounded="lg" class="dialog-card">
        <VCardText class="text-center pt-8">
          <VAvatar
            variant="tonal"
            color="error"
            size="56"
            class="mb-4"
          >
            <VIcon icon="bx-trash" size="28" />
          </VAvatar>

          <h6 class="text-h6 mb-1">Confirmer la suppression</h6>
          <p class="text-medium-emphasis mb-1">
            Vous êtes sur le point de supprimer l'équipement
            <strong class="text-high-emphasis">"{{ equipementToDelete?.immatriculationEquipement }}"</strong>.
          </p>

          <p class="text-error text-caption mt-4 d-flex align-center justify-center gap-1">
            <VIcon icon="bx-error-circle" size="16" />
            Cette action est irréversible.
          </p>
        </VCardText>

        <VCardActions class="d-flex justify-center gap-2 pa-4 pt-2">
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
      rounded="lg"
      class="snackbar-custom"
    >
      <div class="d-flex align-center">
        <VIcon
          :icon="snackbar.color === 'success' ? 'bx-check-circle' : snackbar.color === 'warning' ? 'bx-error-circle' : 'bx-x-circle'"
          size="24"
          class="me-2"
        />
        <span class="font-weight-medium">{{ snackbar.message }}</span>
      </div>
      <template #actions>
        <VBtn
          variant="text"
          icon="bx-x"
          @click="snackbar.show = false"
          size="small"
        />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
/* ========== STATS CARDS ========== */
.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bg-primary-light {
  background-color: rgba(var(--v-theme-primary), 0.10);
}
.bg-success-light {
  background-color: rgba(var(--v-theme-success), 0.10);
}
.bg-error-light {
  background-color: rgba(var(--v-theme-error), 0.10);
}
.bg-info-light {
  background-color: rgba(var(--v-theme-info), 0.10);
}

/* ========== MAIN CARD ========== */
.main-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.border-bottom {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
.border-top {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* ========== TABLE ========== */
.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table thead th {
  background: rgba(0, 0, 0, 0.02);
  padding: 12px 16px;
  font-weight: 600;
  letter-spacing: 0.4px;
  color: rgba(0, 0, 0, 0.6);
  border-bottom: 2px solid rgba(0, 0, 0, 0.06);
  white-space: nowrap;
}

.custom-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  vertical-align: middle;
}

.custom-table tbody tr:last-child td {
  border-bottom: none;
}

.table-row {
  transition: background-color 0.15s ease;
}

.table-row:hover {
  background-color: rgba(var(--v-theme-primary), 0.03);
}

/* ========== DIALOG ========== */
.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

/* ========== SNACKBAR ========== */
.snackbar-custom {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* ========== RESPONSIVE ========== */
@media (max-width: 600px) {
  .stat-card .text-h4 {
    font-size: 1.5rem;
  }
  .stat-icon {
    width: 40px;
    height: 40px;
  }
  .stat-icon .v-icon {
    font-size: 20px !important;
  }
}

@media (max-width: 960px) {
  .custom-table thead th {
    font-size: 0.65rem;
    padding: 8px 10px;
  }
  .custom-table tbody td {
    padding: 8px 10px;
    font-size: 0.85rem;
  }
}

/* ========== UTILITY ========== */
.gap-1 {
  gap: 4px;
}
.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.gap-4 {
  gap: 16px;
}
.flex-wrap {
  flex-wrap: wrap;
}
</style>