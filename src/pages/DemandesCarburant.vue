<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import ExcelJS from 'exceljs'
import { axiosIns } from '@/plugins/axios'
import { useDemandeCarburantStore } from '@/stores/demandeCarburant'
import { useValidationDemandeStore } from '@/stores/validationDemande'
import { useEquipementsStore } from '@/stores/equipements'
import { useStationsStore } from '@/stores/stations'
import { useTypeCarburantStore } from '@/stores/typeCarburant'
import { useAuthStore } from '@/stores/auth'

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
      batch.map(item =>
        item.photoTableauDeBord
          ? loadAuthenticatedPhoto(item.idDemande, item.photoTableauDeBord)
          : Promise.resolve()
      )
    )
  }
}

const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}

// --- Helpers ---
const parseBackendDate = (value) => {
  if (!value) return null
  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0] = value
    return new Date(year, month - 1, day, hour, minute, second)
  }
  return new Date(value)
}

const formatDate = (value, withTime = false) => {
  const date = parseBackendDate(value)
  if (!date || isNaN(date.getTime())) return '-'
  return withTime ? date.toLocaleString('fr-FR') : date.toLocaleDateString('fr-FR')
}

const statutColor = (statut) => {
  if (!statut) return 'warning'
  const s = statut.toLowerCase()
  if (s.includes('rejet')) return 'error'
  if (s.includes('approuv') || s.includes('valid') || s.includes('clôtur') || s.includes('cloture')) return 'success'
  if (s.includes('cours') || s.includes('attente')) return 'warning'
  return 'secondary'
}

const statutColorExcel = (statut) => {
  if (!statut) return 'FFB45309'
  const s = statut.toLowerCase()
  if (s.includes('rejet')) return 'FFDC2626'
  if (s.includes('approuv') || s.includes('valid') || s.includes('clôtur') || s.includes('cloture')) return 'FF16A34A'
  if (s.includes('cours') || s.includes('attente')) return 'FFB45309'
  return 'FF64748B'
}

// --- Stores ---
const demandeStore = useDemandeCarburantStore()
const validationStore = useValidationDemandeStore()
const equipementsStore = useEquipementsStore()
const stationsStore = useStationsStore()
const carburantsStore = useTypeCarburantStore()
const authStore = useAuthStore()

// --- États ---
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showValidationDialog = ref(false)
const isSubmitting = ref(false)
const isExporting = ref(false)
const validationAction = ref('')
const validationCommentaire = ref('')
const validationDemandeIdUnite = ref(null)
const validationNiveauValidation = ref(null)
const validationQuantiteAccordee = ref(null)
const validationErreurEtape = ref(false)

const formData = ref({
  idEquipement: null,
  idStation: null,
  idCarburant: null,
  quantiteDemandee: null,
  photoTableauDeBord: null,
  photoFile: null,
  commentaire: '',
  clientOperationId: null
})
const formErrors = ref({})
const photoPreview = ref(null)

const demandeCourante = ref(null)
const validationDemandeId = ref(null)

const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

const activeTab = ref('a-valider')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const includeAll = ref(false)

// --- Computed ---
const demandesAValider = computed(() => demandeStore.demandesAValider)
const equipements = computed(() => equipementsStore.equipements)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => carburantsStore.types)
const loading = computed(() => demandeStore.loading)
const pagination = computed(() => demandeStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Statistiques
const totalDemandes = computed(() => demandesAValider.value.length)
const enAttente = computed(() =>
  demandesAValider.value.filter(d => (d.statutDemande || '').toLowerCase().includes('attente')).length
)
const approuvees = computed(() =>
  demandesAValider.value.filter(d => (d.statutDemande || '').toLowerCase().includes('approuv') || (d.statutDemande || '').toLowerCase().includes('clôtur')).length
)
const rejetees = computed(() =>
  demandesAValider.value.filter(d => (d.statutDemande || '').toLowerCase().includes('rejet')).length
)

// Options
const equipementOptions = computed(() =>
  equipements.value.map(e => ({
    title: `${e.immatriculationEquipement} - ${e.marqueEquipement} ${e.modeleEquipement}`,
    value: e.idEquipement
  }))
)

const stationOptions = computed(() =>
  stations.value.map(s => ({
    title: s.libelleStation,
    value: s.idStation
  }))
)

const carburantOptions = computed(() =>
  carburants.value.map(c => ({
    title: c.libelleCarburant,
    value: c.idCarburant
  }))
)

// --- Méthodes ---
const loadData = async () => {
  try {
    await Promise.all([
      demandeStore.fetchDemandesAValider({ page: currentPage.value - 1, size: itemsPerPage.value }),
      equipementsStore.fetchEquipements(),
      stationsStore.fetchStations(),
      carburantsStore.fetchTypes()
    ])
    await loadPhotosInBatches(demandeStore.demandesAValider, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement des données', 'error')
    console.error('Erreur:', error)
  }
}

const loadDemandesAValider = async () => {
  try {
    const params = {
      page: currentPage.value - 1,
      size: itemsPerPage.value
    }
    if (includeAll.value) params.includeAll = true
    if (searchQuery.value) params.search = searchQuery.value
    await demandeStore.fetchDemandesAValider(params)
    await loadPhotosInBatches(demandeStore.demandesAValider, 3)
  } catch (error) {
    showNotification('Erreur lors du chargement des demandes', 'error')
  }
}

const showNotification = (message, color = 'success') => {
  snackbar.value = { show: true, message, color, timeout: 3000 }
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const findEtapeEnAttente = (demande) => {
  const validations = demande?.validations || []
  return validations.find(v => (v.statutValidation || '').toLowerCase().includes('attente')) || null
}

const getEtapeEnAttente = (demande) => {
  const etape = findEtapeEnAttente(demande)
  if (!etape) return null
  return {
    niveau: etape.niveauValidation,
    utilisateur: etape.utilisateur
      ? `${etape.utilisateur.prenomUtilisateur} ${etape.utilisateur.nomUtilisateur}`
      : null
  }
}

// Export Excel
const exportToExcel = async () => {
  if (isExporting.value) return
  isExporting.value = true

  const savedPage = currentPage.value

  try {
    const dataSource = []
    const exportPageSize = 200
    let page = 0
    let totalPages = 1

    do {
      const params = { page, size: exportPageSize }
      if (includeAll.value) params.includeAll = true
      if (searchQuery.value) params.search = searchQuery.value

      await demandeStore.fetchDemandesAValider(params)
      dataSource.push(...(demandeStore.demandesAValider || []))
      totalPages = demandeStore.pagination?.totalPages || 1
      page += 1
    } while (page < totalPages)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SI GESCAR'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Demandes carburant', {
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    })

    const NAVY = 'FF0B2545'
    const AMBER = 'FFE8A33D'
    const LIGHT = 'FFF4F7FB'
    const BORDER = 'FFD9E2EC'
    const headers = [
      'N°', 'Demandeur', 'Équipement', 'Station', 'Carburant',
      'Qté demandée (L)', 'Qté accordée (L)', 'Statut', 'Étape', 'Date', 'Commentaire'
    ]

    worksheet.columns = [
      { width: 6 }, { width: 26 }, { width: 20 }, { width: 20 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 14 }, { width: 34 }
    ]

    worksheet.mergeCells('A1:K1')
    const titleCell = worksheet.getCell('A1')
    titleCell.value = "MINISTÈRE DES FINANCES, DU BUDGET ET DE L'ÉCONOMIE NUMÉRIQUE"
    titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    worksheet.getRow(1).height = 30

    worksheet.mergeCells('A2:K2')
    const subtitleCell = worksheet.getCell('A2')
    subtitleCell.value = 'SI GESCAR — Rapport des demandes de carburant'
    subtitleCell.font = { bold: true, italic: true, size: 11, color: { argb: 'FF1E3A5F' } }
    subtitleCell.alignment = { horizontal: 'center' }
    worksheet.getRow(2).height = 20

    worksheet.mergeCells('A3:K3')
    const dateCell = worksheet.getCell('A3')
    dateCell.value = `Généré le ${new Date().toLocaleString('fr-FR')} — ${dataSource.length} demande(s)`
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

    dataSource.forEach((d, i) => {
      const etapeValidee = (d.validations || []).find(v => v.quantiteAccordee != null)
      const etapeEnAttente = getEtapeEnAttente(d)

      let etapeStr = '-'
      if (etapeEnAttente) {
        etapeStr = `Niveau ${etapeEnAttente.niveau}`
        if (etapeEnAttente.utilisateur) {
          etapeStr += ` - ${etapeEnAttente.utilisateur}`
        }
      }

      const rowIndex = headerRowIndex + 1 + i
      const row = worksheet.getRow(rowIndex)
      row.values = [
        i + 1,
        `${d.utilisateur?.prenomUtilisateur || ''} ${d.utilisateur?.nomUtilisateur || ''}`.trim() || '-',
        d.equipement?.immatriculationEquipement || '-',
        d.station?.libelleStation || '-',
        d.equipement?.carburant?.libelleCarburant || '-',
        d.quantiteDemandee ?? '-',
        etapeValidee?.quantiteAccordee ?? '-',
        d.statutDemande || '-',
        etapeStr,
        formatDate(d.dateEnregistrement),
        d.descriptionDemande || d.commentaire || ''
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
          horizontal: (colNumber === 2 || colNumber === 11) ? 'left' : 'center',
          wrapText: colNumber === 11
        }
        cell.font = { size: 10, color: { argb: 'FF1E293B' } }
      })

      if (i % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
        })
      }

      row.getCell(6).font = { ...row.getCell(6).font, bold: true }
      row.getCell(7).font = { ...row.getCell(7).font, bold: true }

      const statutCell = row.getCell(8)
      statutCell.font = { bold: true, size: 10, color: { argb: statutColorExcel(d.statutDemande) } }
    })

    const lastDataRow = headerRowIndex + dataSource.length
    if (dataSource.length > 0) {
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: lastDataRow, column: 11 }
      }
    }

    const totalRowIndex = lastDataRow + 2
    worksheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`)
    const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`)
    totalLabelCell.value = `Total des demandes : ${dataSource.length}`
    totalLabelCell.font = { bold: true, size: 10.5, color: { argb: NAVY } }

    const totalQteDemandee = dataSource.reduce((sum, d) => sum + (Number(d.quantiteDemandee) || 0), 0)
    const totalQteAccordee = dataSource.reduce((sum, d) => {
      const etape = (d.validations || []).find(v => v.quantiteAccordee != null)
      return sum + (Number(etape?.quantiteAccordee) || 0)
    }, 0)

    const totalDemandeeCell = worksheet.getCell(`F${totalRowIndex}`)
    totalDemandeeCell.value = `${totalQteDemandee.toFixed(1)} L`
    totalDemandeeCell.font = { bold: true, size: 10.5, color: { argb: NAVY } }
    totalDemandeeCell.alignment = { horizontal: 'center' }

    const totalAccordeeCell = worksheet.getCell(`G${totalRowIndex}`)
    totalAccordeeCell.value = `${totalQteAccordee.toFixed(1)} L`
    totalAccordeeCell.font = { bold: true, size: 10.5, color: { argb: NAVY } }
    totalAccordeeCell.alignment = { horizontal: 'center' }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const fileName = `demandes_carburant_${new Date().toISOString().slice(0, 10)}.xlsx`

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
    currentPage.value = savedPage
    await loadDemandesAValider()
    isExporting.value = false
  }
}

// Photo
const onPhotoChange = (event) => {
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

// Dialogues
const openCreateDialog = () => {
  formData.value = {
    idEquipement: null,
    idStation: null,
    idCarburant: null,
    quantiteDemandee: null,
    photoTableauDeBord: null,
    photoFile: null,
    commentaire: '',
    clientOperationId: generateUUID()
  }
  photoPreview.value = null
  formErrors.value = {}
  showCreateDialog.value = true
}

const openDetailDialog = async (id) => {
  try {
    const data = await demandeStore.fetchDemandeById(id)
    demandeCourante.value = data
    if (data.photoTableauDeBord) {
      await loadAuthenticatedPhoto(data.idDemande, data.photoTableauDeBord)
    }
    showDetailDialog.value = true
  } catch (error) {
    showNotification('Erreur lors du chargement du détail', 'error')
  }
}

const openValidationDialog = (action, demande) => {
  validationAction.value = action
  validationDemandeId.value = demande.idDemande
  validationCommentaire.value = ''

  const etape = findEtapeEnAttente(demande)
  if (etape) {
    validationDemandeIdUnite.value = etape.unite?.idUnite ?? null
    validationNiveauValidation.value = etape.niveauValidation ?? null
    validationQuantiteAccordee.value = etape.quantiteAccordee ?? demande.quantiteDemandee ?? null
    validationErreurEtape.value = false
  } else {
    validationDemandeIdUnite.value = null
    validationNiveauValidation.value = null
    validationQuantiteAccordee.value = demande.quantiteDemandee ?? null
    validationErreurEtape.value = true
  }

  showValidationDialog.value = true
}

// Création
const validateForm = () => {
  const errors = {}
  if (!formData.value.idEquipement) errors.idEquipement = 'L\'équipement est requis'
  if (!formData.value.idStation) errors.idStation = 'La station est requise'
  if (!formData.value.idCarburant) errors.idCarburant = 'Le carburant est requis'
  if (!formData.value.quantiteDemandee || formData.value.quantiteDemandee <= 0) {
    errors.quantiteDemandee = 'La quantité doit être supérieure à 0'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const createDemande = async () => {
  if (!validateForm()) return

  if (!formData.value.idEquipement || !formData.value.idStation || !formData.value.idCarburant) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'warning')
    return
  }

  isSubmitting.value = true

  try {
    let photoPath = null
    if (formData.value.photoFile) {
      const formDataPhoto = new FormData()
      formDataPhoto.append('file', formData.value.photoFile)
      const response = await demandeStore.uploadPhoto(formDataPhoto)
      photoPath = response?.photoTableauDeBord
    }

    const data = {
      idEquipement: Number(formData.value.idEquipement),
      idStation: Number(formData.value.idStation),
      idCarburant: Number(formData.value.idCarburant),
      quantiteDemandee: parseFloat(formData.value.quantiteDemandee) || 0,
      clientOperationId: formData.value.clientOperationId || generateUUID()
    }

    if (isNaN(data.idEquipement) || isNaN(data.idStation) || isNaN(data.idCarburant)) {
      showNotification('Veuillez sélectionner des valeurs valides', 'warning')
      isSubmitting.value = false
      return
    }

    if (photoPath) data.photoTableauDeBord = photoPath
    if (formData.value.commentaire) data.commentaire = formData.value.commentaire

    await demandeStore.createDemande(data)
    showNotification('Demande créée avec succès ! ✅', 'success')
    showCreateDialog.value = false
    await loadData()
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
    showNotification('Erreur lors de la création de la demande', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Validation
const executerValidation = async () => {
  if (!validationDemandeId.value) {
    showNotification('ID de demande invalide', 'error')
    return
  }

  if (validationErreurEtape.value) {
    showNotification('Impossible de déterminer l\'étape de validation en attente', 'error')
    return
  }

  isSubmitting.value = true

  try {
    const basePayload = {
      idDemande: validationDemandeId.value,
      idUnite: validationDemandeIdUnite.value,
      niveauValidation: validationNiveauValidation.value,
      commentaire: validationCommentaire.value || undefined
    }

    if (validationAction.value === 'valider') {
      await validationStore.validerDemande({
        ...basePayload,
        quantiteAccordee: parseFloat(validationQuantiteAccordee.value) || 0
      })
      showNotification('Demande validée avec succès ! ✅', 'success')
    } else {
      await validationStore.refuserDemande(basePayload)
      showNotification('Demande rejetée ! ❌', 'error')
    }

    showValidationDialog.value = false
    await loadDemandesAValider()
  } catch (error) {
    console.error('Erreur lors de la validation:', error.response?.data || error.message)
    showNotification(error.response?.data?.message || 'Erreur lors de l\'opération', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// Pagination & filtres
const changePage = (newPage) => {
  currentPage.value = newPage
  loadDemandesAValider()
}

const applyFilters = () => {
  currentPage.value = 1
  loadDemandesAValider()
}

const resetFilters = () => {
  searchQuery.value = ''
  includeAll.value = false
  currentPage.value = 1
  loadDemandesAValider()
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
          <h1 class="text-h4 font-weight-bold text-primary">Demandes de carburant</h1>
          <p class="text-medium-emphasis text-subtitle-1 mt-1">
            Gérez les demandes d'approvisionnement en carburant
          </p>
        </div>
        <div class="d-flex gap-3 flex-wrap">
          <VBtn
            color="success"
            variant="tonal"
            prepend-icon="bx-file"
            :loading="isExporting"
            :disabled="isExporting || demandesAValider.length === 0"
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
            Nouvelle demande
          </VBtn>
        </div>
      </div>

      <!-- Stats Cards -->
      <VRow class="mb-6">
        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="primary" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-primary-light pa-3 me-4">
                <VIcon icon="bx-file" size="28" color="primary" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  Total demandes
                </div>
                <div class="text-h4 font-weight-bold">{{ totalDemandes }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol cols="12" sm="6" md="3">
          <VCard variant="tonal" color="warning" class="stat-card" rounded="lg">
            <VCardText class="d-flex align-center pa-4">
              <div class="stat-icon rounded-circle bg-warning-light pa-3 me-4">
                <VIcon icon="bx-time" size="28" color="warning" />
              </div>
              <div>
                <div class="text-caption text-uppercase font-weight-medium text-medium-emphasis">
                  En attente
                </div>
                <div class="text-h4 font-weight-bold">{{ enAttente }}</div>
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
                  Approuvées
                </div>
                <div class="text-h4 font-weight-bold">{{ approuvees }}</div>
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
                  Rejetées
                </div>
                <div class="text-h4 font-weight-bold">{{ rejetees }}</div>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Main Card -->
      <VCard rounded="lg" elevation="0" class="main-card">
        <VTabs v-model="activeTab" color="primary" class="px-4 pt-2">
          <VTab value="a-valider">
            <VIcon icon="bx-list-check" size="18" class="me-1" />
            À valider
            <VChip v-if="enAttente > 0" size="x-small" color="warning" class="ms-1">
              {{ enAttente }}
            </VChip>
          </VTab>
          <VTab value="historique" disabled>
            <VIcon icon="bx-history" size="18" class="me-1" />
            Historique
          </VTab>
        </VTabs>

        <VDivider />

        <!-- Filtres -->
        <VCardText class="pt-4">
          <VRow align="center">
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher"
                placeholder="Numéro demande, équipement…"
                density="comfortable"
                variant="outlined"
                prepend-inner-icon="bx-search"
                clearable
                hide-details
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSwitch v-model="includeAll" label="Tout voir" density="comfortable" hide-details @change="applyFilters" />
            </VCol>
            <VCol cols="12" md="auto" class="d-flex gap-2">
              <VBtn color="primary" variant="flat" @click="applyFilters" prepend-icon="bx-filter">
                Filtrer
              </VBtn>
              <VBtn color="secondary" variant="tonal" @click="resetFilters" prepend-icon="bx-undo">
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Table -->
        <VTable class="custom-table">
          <thead>
            <tr>
              <th class="text-uppercase text-center text-caption font-weight-bold" style="width:60px;">N°</th>
              <th class="text-uppercase text-caption font-weight-bold" style="width:70px;">Photo</th>
              <th class="text-uppercase text-caption font-weight-bold">Demandeur</th>
              <th class="text-uppercase text-caption font-weight-bold">Équipement</th>
              <th class="text-uppercase text-caption font-weight-bold">Station</th>
              <th class="text-uppercase text-caption font-weight-bold">Carburant</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Qté</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Statut</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Étape</th>
              <th class="text-uppercase text-caption font-weight-bold text-center">Date</th>
              <th class="text-uppercase text-caption font-weight-bold text-center" style="width:160px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="text-center pa-6">
                <VProgressCircular indeterminate color="primary" size="40" />
                <div class="text-caption text-medium-emphasis mt-2">Chargement des demandes…</div>
              </td>
            </tr>
            <tr v-else-if="demandesAValider.length === 0">
              <td colspan="11" class="text-center pa-8">
                <VIcon icon="bx-file" size="48" color="grey-lighten-1" />
                <div class="text-h6 font-weight-medium mt-2 text-medium-emphasis">
                  Aucune demande en attente
                </div>
                <p class="text-caption text-medium-emphasis">
                  Créez une nouvelle demande ou ajustez vos filtres
                </p>
              </td>
            </tr>
            <tr
              v-for="(demande, index) in demandesAValider"
              :key="demande.idDemande || index"
              class="table-row"
            >
              <td class="text-center font-weight-medium text-caption">
                {{ (pagination.page * pagination.size) + index + 1 }}
              </td>
              <td>
                <VAvatar
                  size="40"
                  :color="(!photoUrlCache.get(demande.idDemande) || brokenPhotos.has(demande.idDemande)) ? 'primary' : undefined"
                  :variant="(!photoUrlCache.get(demande.idDemande) || brokenPhotos.has(demande.idDemande)) ? 'tonal' : undefined"
                  rounded
                >
                  <VImg
                    v-if="photoUrlCache.get(demande.idDemande) && !brokenPhotos.has(demande.idDemande)"
                    :src="photoUrlCache.get(demande.idDemande)"
                    cover
                    @error="onPhotoError(demande.idDemande)"
                  />
                  <VIcon v-else icon="bx-image" size="20" />
                </VAvatar>
              </td>
              <td>
                <div class="font-weight-medium">
                  {{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }}
                </div>
              </td>
              <td>{{ demande.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ demande.station?.libelleStation || '-' }}</td>
              <td>
                <VChip size="small" label color="info" variant="tonal">
                  {{ demande.equipement?.carburant?.libelleCarburant || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <VChip color="primary" variant="tonal" size="small" label class="font-weight-bold px-3">
                  {{ demande.quantiteDemandee }} L
                </VChip>
              </td>
              <td class="text-center">
                <VChip
                  size="small"
                  label
                  :color="statutColor(demande.statutDemande)"
                  variant="tonal"
                >
                  <VIcon
                    :icon="
                      (demande.statutDemande || '').toLowerCase().includes('rejet') ? 'bx-x-circle' :
                      (demande.statutDemande || '').toLowerCase().includes('approuv') || (demande.statutDemande || '').toLowerCase().includes('clôtur') ? 'bx-check-circle' :
                      'bx-time'
                    "
                    size="14"
                    start
                  />
                  {{ demande.statutDemande || '-' }}
                </VChip>
              </td>
              <td class="text-center">
                <template v-if="getEtapeEnAttente(demande)">
                  <VChip size="small" label color="warning" variant="tonal">
                    Niveau {{ getEtapeEnAttente(demande).niveau }}
                  </VChip>
                  <div v-if="getEtapeEnAttente(demande).utilisateur" class="text-caption text-medium-emphasis">
                    {{ getEtapeEnAttente(demande).utilisateur }}
                  </div>
                </template>
                <span v-else class="text-caption text-medium-emphasis">-</span>
              </td>
              <td class="text-center text-caption text-medium-emphasis">
                <VIcon icon="bx-calendar" size="14" class="me-1" />
                {{ formatDate(demande.dateEnregistrement) }}
              </td>
              <td class="text-center">
                <div class="d-flex justify-center gap-1">
                  <VTooltip text="Détail">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="info"
                        @click="openDetailDialog(demande.idDemande)"
                      >
                        <VIcon size="20" icon="bx-detail" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip text="Valider">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="success"
                        @click="openValidationDialog('valider', demande)"
                      >
                        <VIcon size="20" icon="bx-check" />
                      </VBtn>
                    </template>
                  </VTooltip>
                  <VTooltip text="Rejeter">
                    <template #activator="{ props }">
                      <VBtn
                        v-bind="props"
                        icon
                        variant="text"
                        size="small"
                        color="error"
                        @click="openValidationDialog('rejeter', demande)"
                      >
                        <VIcon size="20" icon="bx-x" />
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
          v-if="pagination.totalPages > 1"
        >
          <span class="text-caption text-medium-emphasis">
            {{ pagination.total }} élément(s) — Page {{ currentPage }} / {{ pagination.totalPages || 1 }}
          </span>
          <VPagination
            v-model="currentPage"
            :length="pagination.totalPages || 1"
            :total-visible="5"
            @update:model-value="changePage"
            color="primary"
            variant="tonal"
            size="small"
          />
        </div>
        <div
          v-else-if="demandesAValider.length > 0"
          class="px-4 py-3 d-flex justify-space-between align-center border-top"
        >
          <span class="text-caption text-medium-emphasis">
            {{ demandesAValider.length }} élément(s)
          </span>
        </div>
      </VCard>
    </VCol>

    <!-- Dialog: Nouvelle demande -->
    <VDialog v-model="showCreateDialog" max-width="620" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-plus-circle" color="primary" size="28" />
            Nouvelle demande de carburant
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            Saisissez les informations de la demande
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-6">
          <VForm @submit.prevent="createDemande">
            <!-- Photo -->
            <div class="d-flex align-center mb-6">
              <VAvatar
                size="64"
                :color="!photoPreview ? 'primary' : undefined"
                :variant="!photoPreview ? 'tonal' : undefined"
                class="me-4"
              >
                <VImg v-if="photoPreview" :src="photoPreview" cover />
                <VIcon v-else icon="bx-image" size="32" />
              </VAvatar>
              <div>
                <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                  Photo tableau de bord
                </div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="bx-upload"
                    @click="$refs.fileInput?.click()"
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
                <input ref="fileInput" id="photoInput" type="file" accept="image/*" class="d-none" @change="onPhotoChange" />
                <div class="text-caption text-medium-emphasis mt-1">JPG, PNG ou GIF (max 5MB)</div>
              </div>
            </div>

            <VSelect
              v-model="formData.idEquipement"
              label="Équipement"
              :items="equipementOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un équipement"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idEquipement"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
              required
            />

            <VSelect
              v-model="formData.idStation"
              label="Station"
              :items="stationOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une station"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idStation"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
              required
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Type de carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              hide-details="auto"
              class="mb-4"
              required
            />

            <VTextField
              v-model="formData.quantiteDemandee"
              label="Quantité demandée (Litres)"
              placeholder="Ex: 40"
              type="number"
              min="0"
              step="0.1"
              variant="outlined"
              density="comfortable"
              :error-messages="formErrors.quantiteDemandee"
              hide-details="auto"
              class="mb-4"
              required
            />

            <VTextarea
              v-model="formData.commentaire"
              label="Commentaire (optionnel)"
              placeholder="Ex: Mission terrain"
              rows="2"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
            />

            <VDivider class="mt-2 mb-4" />

            <div class="d-flex justify-end gap-3">
              <VBtn
                variant="tonal"
                color="secondary"
                @click="showCreateDialog = false"
                :disabled="isSubmitting"
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
                Créer la demande
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialog: Détail -->
    <VDialog v-model="showDetailDialog" max-width="640" transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon icon="bx-detail" color="info" size="28" />
            Détail de la demande
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">Informations complètes</VCardSubtitle>
        </VCardItem>

        <VCardText v-if="demandeCourante" class="pt-4">
          <div class="detail-grid">
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Demandeur</div>
              <div class="font-weight-medium">{{ demandeCourante.utilisateur?.prenomUtilisateur }} {{ demandeCourante.utilisateur?.nomUtilisateur }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Équipement</div>
              <div class="font-weight-medium">{{ demandeCourante.equipement?.immatriculationEquipement || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Station</div>
              <div>{{ demandeCourante.station?.libelleStation || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Carburant</div>
              <div>{{ demandeCourante.equipement?.carburant?.libelleCarburant || '-' }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Quantité demandée</div>
              <VChip color="primary" variant="tonal" size="small" label>{{ demandeCourante.quantiteDemandee }} L</VChip>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Statut</div>
              <VChip :color="statutColor(demandeCourante.statutDemande)" variant="tonal" size="small" label>
                {{ demandeCourante.statutDemande || '-' }}
              </VChip>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Date</div>
              <div>{{ formatDate(demandeCourante.dateEnregistrement, true) }}</div>
            </div>
            <div class="detail-item">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Kilométrage</div>
              <div>{{ demandeCourante.kilometrage ?? '-' }}</div>
            </div>
            <div class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Description</div>
              <div>{{ demandeCourante.descriptionDemande || '-' }}</div>
            </div>
            <div v-if="demandeCourante.photoTableauDeBord" class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Photo</div>
              <div class="detail-photo-wrapper">
                <VImg
                  v-if="photoUrlCache.get(demandeCourante.idDemande)"
                  :src="photoUrlCache.get(demandeCourante.idDemande)"
                  max-width="350"
                  max-height="250"
                  cover
                  rounded
                  class="detail-photo"
                />
                <VProgressCircular v-else indeterminate color="primary" size="32" />
              </div>
            </div>
            <div v-if="demandeCourante.validations?.length" class="detail-item full-width">
              <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">Circuit de validation</div>
              <div v-for="v in demandeCourante.validations" :key="v.idValidation" class="d-flex align-center gap-2 mt-1">
                <VChip size="x-small" :color="statutColor(v.statutValidation)" variant="tonal">
                  Niveau {{ v.niveauValidation }}
                </VChip>
                <span class="text-caption">
                  {{ v.utilisateur?.prenomUtilisateur }} {{ v.utilisateur?.nomUtilisateur }}
                  <span class="text-medium-emphasis">— {{ v.statutValidation }}</span>
                </span>
              </div>
            </div>
          </div>
        </VCardText>

        <VCardActions class="d-flex justify-end pa-4 pt-0">
          <VBtn variant="tonal" color="secondary" @click="showDetailDialog = false" size="large">
            Fermer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialog: Validation -->
    <VDialog v-model="showValidationDialog" max-width="460" persistent transition="fade-transition">
      <VCard rounded="lg" class="dialog-card">
        <VCardItem class="border-bottom">
          <VCardTitle class="d-flex align-center gap-2 text-h6 font-weight-bold">
            <VIcon
              :icon="validationAction === 'valider' ? 'bx-check-circle' : 'bx-x-circle'"
              :color="validationAction === 'valider' ? 'success' : 'error'"
              size="28"
            />
            {{ validationAction === 'valider' ? 'Valider la demande' : 'Rejeter la demande' }}
          </VCardTitle>
          <VCardSubtitle class="mt-1 text-medium-emphasis">
            {{ validationAction === 'valider' ? 'Confirmez la validation de cette demande' : 'Confirmez le rejet de cette demande' }}
          </VCardSubtitle>
        </VCardItem>

        <VCardText class="pt-4">
          <VAlert v-if="validationErreurEtape" type="warning" variant="tonal" density="compact" class="mb-4">
            Aucune étape de validation "en attente" trouvée pour cette demande. L'opération risque d'échouer.
          </VAlert>

          <p class="text-medium-emphasis mb-4">
            {{ validationAction === 'valider' ? 'Voulez-vous valider cette demande de carburant ?' : 'Voulez-vous rejeter cette demande de carburant ?' }}
          </p>

          <VTextField
            v-if="validationAction === 'valider'"
            v-model="validationQuantiteAccordee"
            label="Quantité accordée (Litres)"
            type="number"
            min="0"
            step="0.1"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
            class="mb-4"
          />

          <VTextarea
            v-model="validationCommentaire"
            label="Commentaire (optionnel)"
            placeholder="Ex: Demande approuvée"
            rows="2"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          />
        </VCardText>

        <VCardActions class="d-flex justify-end gap-3 pa-4 pt-2">
          <VBtn variant="tonal" color="secondary" @click="showValidationDialog = false" :disabled="isSubmitting" size="large">
            Annuler
          </VBtn>
          <VBtn
            :color="validationAction === 'valider' ? 'success' : 'error'"
            @click="executerValidation"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            size="large"
            prepend-icon="bx-check"
          >
            {{ validationAction === 'valider' ? 'Valider' : 'Rejeter' }}
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
          :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'"
          size="24"
          class="me-2"
        />
        <span class="font-weight-medium">{{ snackbar.message }}</span>
      </div>
      <template #actions>
        <VBtn variant="text" icon="bx-x" @click="snackbar.show = false" size="small" />
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
.bg-primary-light { background-color: rgba(var(--v-theme-primary), 0.10); }
.bg-warning-light { background-color: rgba(var(--v-theme-warning), 0.10); }
.bg-success-light { background-color: rgba(var(--v-theme-success), 0.10); }
.bg-error-light { background-color: rgba(var(--v-theme-error), 0.10); }

/* ========== MAIN CARD ========== */
.main-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}
.border-bottom { border-bottom: 1px solid rgba(0, 0, 0, 0.06); }
.border-top { border-top: 1px solid rgba(0, 0, 0, 0.06); }

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
.custom-table tbody tr:last-child td { border-bottom: none; }
.table-row { transition: background-color 0.15s ease; }
.table-row:hover { background-color: rgba(var(--v-theme-primary), 0.03); }

/* ========== DIALOG ========== */
.dialog-card {
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

/* ========== DETAIL ========== */
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: 1 / -1; }
.detail-photo-wrapper {
  margin-top: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px;
  display: inline-block;
}
.detail-photo {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  max-width: 350px;
  max-height: 250px;
}

/* ========== SNACKBAR ========== */
.snackbar-custom { border: 1px solid rgba(255, 255, 255, 0.12); }

/* ========== RESPONSIVE ========== */
@media (max-width: 600px) {
  .stat-card .text-h4 { font-size: 1.5rem; }
  .stat-icon { width: 40px; height: 40px; }
  .stat-icon .v-icon { font-size: 20px !important; }
}
@media (max-width: 960px) {
  .custom-table thead th { font-size: 0.65rem; padding: 8px 10px; }
  .custom-table tbody td { padding: 8px 10px; font-size: 0.85rem; }
  .detail-grid { grid-template-columns: 1fr; }
}

/* ========== UTILITY ========== */
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.flex-wrap { flex-wrap: wrap; }
</style>