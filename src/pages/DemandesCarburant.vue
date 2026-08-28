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

// --- Gestion des photos protégées (JWT via Axios), identique à equipement ---
const photoUrlCache = reactive(new Map())

const loadAuthenticatedPhoto = async (id, photoPath) => {
  if (!photoPath || photoUrlCache.has(id)) return

  try {
    const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`
    const response = await axiosIns.get(cleanPath, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(response.data)
    photoUrlCache.set(id, objectUrl)
  } catch (error) {
    console.error('❌ Impossible de charger la photo protégée pour ID', id, error)
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

const brokenPhotos = ref(new Set())
const onPhotoError = (id) => {
  console.error('❌ Échec d\'affichage de la photo pour ID', id)
  brokenPhotos.value.add(id)
}

// Le backend renvoie parfois les dates en tableau [annee, mois, jour, heure, minute, seconde]
// (ex: dans "validations"), et parfois en string ISO (ex: dateEnregistrement de la demande elle-même).
// Cette fonction gère les deux cas.
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

// Couleur de chip selon le statut réel renvoyé par le backend (statutDemande)
// Valeurs observées : "traitement En cours", potentiellement "Approuvée", "Rejetée", "Clôturée", etc.
const statutColor = (statut) => {
  if (!statut) return 'warning'
  const s = statut.toLowerCase()
  if (s.includes('rejet')) return 'error'
  if (s.includes('approuv') || s.includes('valid') || s.includes('clôtur') || s.includes('cloture')) return 'success'
  if (s.includes('cours') || s.includes('attente')) return 'warning'
  return 'secondary'
}

// Couleur ARGB (pour Excel) selon le statut, en cohérence avec statutColor()
const statutColorExcel = (statut) => {
  if (!statut) return 'FFB45309'
  const s = statut.toLowerCase()
  if (s.includes('rejet')) return 'FFDC2626'
  if (s.includes('approuv') || s.includes('valid') || s.includes('clôtur') || s.includes('cloture')) return 'FF16A34A'
  if (s.includes('cours') || s.includes('attente')) return 'FFB45309'
  return 'FF64748B'
}

// Stores
const demandeStore = useDemandeCarburantStore()
const validationStore = useValidationDemandeStore()
const equipementsStore = useEquipementsStore()
const stationsStore = useStationsStore()
const carburantsStore = useTypeCarburantStore()
const authStore = useAuthStore()

// États
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showValidationDialog = ref(false)
const isSubmitting = ref(false)
const isExporting = ref(false)
const validationAction = ref('') // 'valider' | 'rejeter'
const validationCommentaire = ref('')
const validationDemandeIdUnite = ref(null)
const validationNiveauValidation = ref(null)
const validationQuantiteAccordee = ref(null)
const validationErreurEtape = ref(false) // true si aucune étape "en_attente" trouvée

// Formulaire
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

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
  timeout: 3000
})

// Filtres
const activeTab = ref('a-valider')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const includeAll = ref(false)

// Computed
const demandesAValider = computed(() => demandeStore.demandesAValider)
const equipements = computed(() => equipementsStore.equipements)
const stations = computed(() => stationsStore.allStations)
const carburants = computed(() => carburantsStore.types)
const loading = computed(() => demandeStore.loading)
const pagination = computed(() => demandeStore.pagination)
const isAdmin = computed(() => authStore.isAdmin)

// Options
const equipementOptions = computed(() => {
  return equipements.value.map(e => ({
    title: `${e.immatriculationEquipement} - ${e.marqueEquipement} ${e.modeleEquipement}`,
    value: e.idEquipement
  }))
})

const stationOptions = computed(() => {
  return stations.value.map(s => ({
    title: s.libelleStation,
    value: s.idStation
  }))
})

const carburantOptions = computed(() => {
  return carburants.value.map(c => ({
    title: c.libelleCarburant,
    value: c.idCarburant
  }))
})

// Méthodes
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
    console.error('Erreur lors du chargement des données:', error)
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
  snackbar.value = {
    show: true,
    message,
    color,
    timeout: 3000
  }
}

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Trouve l'étape de validation "en attente" dans le tableau validations[] de la demande
const findEtapeEnAttente = (demande) => {
  const validations = demande?.validations || []
  return validations.find(v => (v.statutValidation || '').toLowerCase().includes('attente')) || null
}

// Retourne les infos de l'étape de validation en attente pour une demande donnée
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

// -----------------------------------------------------------------------
// Export Excel (ExcelJS) — version avec la colonne "Étape"
// -----------------------------------------------------------------------
const exportToExcel = async () => {
  if (isExporting.value) return
  isExporting.value = true

  const savedPage = currentPage.value

  try {
    // Récupération de TOUTES les demandes
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

    // --- En‑têtes : 11 colonnes (ajout de "Étape") ---
    const headers = [
      'N°', 'Demandeur', 'Équipement', 'Station', 'Carburant',
      'Qté demandée (L)', 'Qté accordée (L)', 'Statut', 'Étape', 'Date', 'Commentaire'
    ]

    worksheet.columns = [
      { width: 6 }, { width: 26 }, { width: 20 }, { width: 20 }, { width: 14 },
      { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 14 }, { width: 34 }
    ]

    // --- En‑tête institutionnel (fusion sur A1:K1) ---
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

    worksheet.getRow(4).height = 6 // séparateur

    // --- Ligne d'en‑tête des colonnes (ligne 5) ---
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

    // --- Lignes de données ---
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

      // Alternance des couleurs de fond
      if (i % 2 === 1) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
        })
      }

      // Quantités en gras
      row.getCell(6).font = { ...row.getCell(6).font, bold: true }
      row.getCell(7).font = { ...row.getCell(7).font, bold: true }

      // Statut colorié (colonne 8)
      const statutCell = row.getCell(8)
      statutCell.font = { bold: true, size: 10, color: { argb: statutColorExcel(d.statutDemande) } }
    })

    const lastDataRow = headerRowIndex + dataSource.length

    // --- Filtre automatique sur les 11 colonnes ---
    if (dataSource.length > 0) {
      worksheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: lastDataRow, column: 11 }
      }
    }

    // --- Ligne de total ---
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

    // --- Téléchargement ---
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

// Upload photo
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

// Créer une demande
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

    if (photoPath) {
      data.photoTableauDeBord = photoPath
    }

    if (formData.value.commentaire) {
      data.commentaire = formData.value.commentaire
    }

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

// Valider/Refuser une demande via /api/validationDemande/valider ou /refuser
const executerValidation = async () => {
  if (!validationDemandeId.value) {
    showNotification('ID de demande invalide', 'error')
    return
  }

  if (validationErreurEtape.value) {
    showNotification('Impossible de déterminer l\'étape de validation en attente pour cette demande', 'error')
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

// Pagination
const changePage = (newPage) => {
  currentPage.value = newPage
  loadDemandesAValider()
}

const applyFilters = () => {
  currentPage.value = 1
  loadDemandesAValider()
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
      <VCard title="Demandes de carburant">
        <template #append>
          <div class="d-flex gap-2">
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
              prepend-icon="bx-plus"
              @click="openCreateDialog"
            >
              Nouvelle demande
            </VBtn>
          </div>
        </template>

        <!-- Onglets -->
        <VTabs
          v-model="activeTab"
          color="primary"
          class="px-4"
        >
          <VTab value="a-valider">
            À valider
          </VTab>
          <VTab value="historique">
            Historique
          </VTab>
        </VTabs>

        <!-- Filtres -->
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VTextField
                v-model="searchQuery"
                label="Rechercher..."
                placeholder="Numéro demande, équipement..."
                density="compact"
                prepend-inner-icon="bx-search"
                clearable
                @keyup.enter="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSwitch
                v-model="includeAll"
                label="Tout voir"
                density="compact"
                class="mt-2"
                @change="applyFilters"
              />
            </VCol>
            <VCol cols="12" md="auto">
              <VBtn color="primary" variant="tonal" @click="applyFilters">
                Appliquer
              </VBtn>
              <VBtn color="secondary" variant="tonal" class="ml-2" @click="searchQuery = ''; includeAll = false; applyFilters()">
                Réinitialiser
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>

        <!-- Tableau des demandes à valider -->
        <VTable v-if="activeTab === 'a-valider'">
          <thead>
            <tr>
              <th class="text-uppercase text-center">N°</th>
              <th>Photo</th>
              <th>Demandeur</th>
              <th>Équipement</th>
              <th>Station</th>
              <th>Carburant</th>
              <th class="text-center">Qté</th>
              <th class="text-center">Statut</th>
              <th class="text-uppercase text-center">Étape</th>
              <th class="text-center">Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="text-center pa-4">
                <VProgressCircular indeterminate color="primary" />
              </td>
            </tr>
            <tr v-else-if="demandesAValider.length === 0">
              <td colspan="11" class="text-center pa-4 text-medium-emphasis">
                Aucune demande en attente de validation
              </td>
            </tr>
            <tr v-for="(demande, index) in demandesAValider" :key="demande.idDemande || index">
              <td class="text-center">{{ (pagination.page * pagination.size) + index + 1 }}</td>
              <td>
                <!-- Photo en cercle 48px -->
                <div
                  class="photo-thumbnail"
                  :style="{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5'
                  }"
                >
                  <VImg
                    v-if="photoUrlCache.get(demande.idDemande) && !brokenPhotos.has(demande.idDemande)"
                    :src="photoUrlCache.get(demande.idDemande)"
                    cover
                    @error="onPhotoError(demande.idDemande)"
                  />
                  <VIcon v-else icon="bx-image" size="24" color="grey" />
                </div>
              </td>
              <td>{{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }}</td>
              <td>{{ demande.equipement?.immatriculationEquipement || '-' }}</td>
              <td>{{ demande.station?.libelleStation || '-' }}</td>
              <td>{{ demande.equipement?.carburant?.libelleCarburant || '-' }}</td>
              <td class="text-center">
                <VChip size="small" label color="primary">
                  {{ demande.quantiteDemandee }} L
                </VChip>
              </td>
              <td class="text-center">
                <VChip size="small" label :color="statutColor(demande.statutDemande)">
                  {{ demande.statutDemande || '-' }}
                </VChip>
              </td>
              <!-- Colonne Étape -->
              <td class="text-center">
                <template v-if="getEtapeEnAttente(demande)">
                  <VChip size="small" label color="warning">
                    Niveau {{ getEtapeEnAttente(demande).niveau }}
                  </VChip>
                  <div class="text-caption" v-if="getEtapeEnAttente(demande).utilisateur">
                    {{ getEtapeEnAttente(demande).utilisateur }}
                  </div>
                </template>
                <span v-else class="text-caption">-</span>
              </td>
              <td class="text-center">{{ formatDate(demande.dateEnregistrement) }}</td>
              <td class="text-center">
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="info"
                  @click="openDetailDialog(demande.idDemande)"
                >
                  <VIcon size="20" icon="bx-detail" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="success"
                  @click="openValidationDialog('valider', demande)"
                >
                  <VIcon size="20" icon="bx-check" />
                </VBtn>
                <VBtn
                  icon
                  variant="text"
                  size="small"
                  color="error"
                  @click="openValidationDialog('rejeter', demande)"
                >
                  <VIcon size="20" icon="bx-x" />
                </VBtn>
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div v-if="activeTab === 'a-valider' && pagination.totalPages > 1" class="pa-4 d-flex justify-space-between align-center">
          <span class="text-caption text-medium-emphasis">
            {{ pagination.total }} élément(s)
          </span>
          <VPagination
            v-model="currentPage"
            :length="pagination.totalPages"
            :total-visible="5"
            @update:model-value="changePage"
          />
        </div>
      </VCard>
    </VCol>

    <!-- Dialogue de création -->
    <VDialog v-model="showCreateDialog" max-width="600" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle>Nouvelle demande de carburant</VCardTitle>
          <VCardSubtitle>Saisissez les informations de la demande</VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VForm @submit.prevent="createDemande">
            <!-- Photo (aperçu local avant envoi : FileReader, indépendant du cache authentifié) -->
            <div class="d-flex align-center mb-4">
              <div
                class="photo-preview"
                :style="{
                  width: '80px',
                  height: '80px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                  marginRight: '16px'
                }"
              >
                <VImg v-if="photoPreview" :src="photoPreview" cover />
                <VIcon v-else icon="bx-image" size="40" color="grey" />
              </div>
              <div>
                <div class="text-caption text-medium-emphasis">Photo tableau de bord</div>
                <div class="d-flex gap-2 mt-1">
                  <VBtn size="small" variant="tonal" color="primary" @click="$refs.fileInput.click()">
                    <VIcon icon="bx-upload" size="16" class="me-1" />
                    Choisir
                  </VBtn>
                  <VBtn v-if="photoPreview" size="small" variant="tonal" color="error" @click="removePhoto">
                    <VIcon icon="bx-trash" size="16" class="me-1" />
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
              :error-messages="formErrors.idEquipement"
              :loading="loading"
              required
            />

            <VSelect
              v-model="formData.idStation"
              label="Station"
              :items="stationOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner une station"
              :error-messages="formErrors.idStation"
              :loading="loading"
              class="mt-4"
              required
            />

            <VSelect
              v-model="formData.idCarburant"
              label="Type de carburant"
              :items="carburantOptions"
              item-title="title"
              item-value="value"
              placeholder="Sélectionner un carburant"
              :error-messages="formErrors.idCarburant"
              :loading="loading"
              class="mt-4"
              required
            />

            <VTextField
              v-model="formData.quantiteDemandee"
              label="Quantité demandée (Litres)"
              placeholder="Ex: 40"
              type="number"
              min="0"
              step="0.1"
              :error-messages="formErrors.quantiteDemandee"
              class="mt-4"
              required
            />

            <VTextarea
              v-model="formData.commentaire"
              label="Commentaire (optionnel)"
              placeholder="Ex: Mission terrain"
              rows="2"
              class="mt-4"
            />

            <div class="d-flex justify-end gap-2 mt-4">
              <VBtn variant="tonal" color="secondary" @click="showCreateDialog = false" :disabled="isSubmitting">
                Annuler
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isSubmitting" :disabled="isSubmitting">
                Créer la demande
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Dialogue de détail -->
    <VDialog v-model="showDetailDialog" max-width="600">
      <VCard>
        <VCardItem>
          <VCardTitle>Détail de la demande</VCardTitle>
          <VCardSubtitle>Informations complètes de la demande</VCardSubtitle>
        </VCardItem>
        <VCardText v-if="demandeCourante">
          <VList>
            <VListItem>
              <VListItemTitle>Demandeur</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.utilisateur?.prenomUtilisateur }} {{ demandeCourante.utilisateur?.nomUtilisateur }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Équipement</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.equipement?.immatriculationEquipement || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Station</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.station?.libelleStation || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Carburant</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.equipement?.carburant?.libelleCarburant || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Quantité demandée</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.quantiteDemandee }} L</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Description</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.descriptionDemande || '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Kilométrage</VListItemTitle>
              <VListItemSubtitle>{{ demandeCourante.kilometrage ?? '-' }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Date</VListItemTitle>
              <VListItemSubtitle>{{ formatDate(demandeCourante.dateEnregistrement, true) }}</VListItemSubtitle>
            </VListItem>
            <VListItem>
              <VListItemTitle>Statut</VListItemTitle>
              <VListItemSubtitle>
                <VChip :color="statutColor(demandeCourante.statutDemande)">
                  {{ demandeCourante.statutDemande || '-' }}
                </VChip>
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="demandeCourante.photoTableauDeBord">
              <VListItemTitle>Photo</VListItemTitle>
              <VListItemSubtitle>
                <div
                  class="detail-photo"
                  :style="{
                    maxWidth: '350px',
                    maxHeight: '250px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '2px solid #e0e0e0',
                    marginTop: '8px'
                  }"
                >
                  <VImg
                    v-if="photoUrlCache.get(demandeCourante.idDemande)"
                    :src="photoUrlCache.get(demandeCourante.idDemande)"
                    cover
                    width="100%"
                    height="100%"
                  />
                  <VProgressCircular v-else indeterminate color="primary" size="24" class="mt-2" />
                </div>
              </VListItemSubtitle>
            </VListItem>
            <VListItem v-if="demandeCourante.validations?.length">
              <VListItemTitle>Circuit de validation</VListItemTitle>
              <VListItemSubtitle>
                <div v-for="v in demandeCourante.validations" :key="v.idValidation" class="d-flex align-center gap-2 mt-1">
                  <VChip size="x-small" :color="statutColor(v.statutValidation)">
                    Niveau {{ v.niveauValidation }}
                  </VChip>
                  <span class="text-caption">
                    {{ v.utilisateur?.prenomUtilisateur }} {{ v.utilisateur?.nomUtilisateur }} — {{ v.statutValidation }}
                  </span>
                </div>
              </VListItemSubtitle>
            </VListItem>
          </VList>
        </VCardText>
        <VCardActions class="d-flex justify-end pa-4">
          <VBtn variant="tonal" color="secondary" @click="showDetailDialog = false">
            Fermer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Dialogue de validation -->
    <VDialog v-model="showValidationDialog" max-width="420" persistent>
      <VCard>
        <VCardItem>
          <VCardTitle :class="validationAction === 'valider' ? 'text-success' : 'text-error'">
            {{ validationAction === 'valider' ? 'Valider la demande' : 'Rejeter la demande' }}
          </VCardTitle>
          <VCardSubtitle>
            {{ validationAction === 'valider' ? 'Confirmez la validation de cette demande' : 'Confirmez le rejet de cette demande' }}
          </VCardSubtitle>
        </VCardItem>
        <VCardText>
          <VAlert v-if="validationErreurEtape" type="warning" density="compact" class="mb-4">
            Aucune étape de validation "en attente" trouvée pour cette demande. L'opération risque d'échouer.
          </VAlert>
          <p class="text-medium-emphasis">
            {{ validationAction === 'valider' ? 'Voulez-vous valider cette demande de carburant ?' : 'Voulez-vous rejeter cette demande de carburant ?' }}
          </p>
          <VTextField
            v-if="validationAction === 'valider'"
            v-model="validationQuantiteAccordee"
            label="Quantité accordée (Litres)"
            type="number"
            min="0"
            step="0.1"
            class="mt-2"
          />
          <VTextarea
            v-model="validationCommentaire"
            label="Commentaire (optionnel)"
            placeholder="Ex: Demande approuvée"
            rows="2"
            class="mt-4"
          />
        </VCardText>
        <VCardActions class="d-flex justify-end gap-2 pa-4">
          <VBtn variant="tonal" color="secondary" @click="showValidationDialog = false" :disabled="isSubmitting">
            Annuler
          </VBtn>
          <VBtn
            :color="validationAction === 'valider' ? 'success' : 'error'"
            @click="executerValidation"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ validationAction === 'valider' ? 'Valider' : 'Rejeter' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout" location="top end" variant="flat">
      <VIcon :icon="snackbar.color === 'success' ? 'bx-check-circle' : 'bx-x-circle'" size="24" class="me-2" />
      {{ snackbar.message }}
      <template #actions>
        <VBtn variant="text" icon="bx-x" @click="snackbar.show = false" />
      </template>
    </VSnackbar>
  </VRow>
</template>

<style scoped>
.gap-2 {
  gap: 8px;
}
.photo-thumbnail {
  transition: transform 0.2s;
}
.photo-thumbnail:hover {
  transform: scale(1.1);
  border-color: #1976d2;
}
.detail-photo {
  background: #f5f5f5;
}
.photo-preview {
  transition: border-color 0.2s;
}
.photo-preview:hover {
  border-color: #1976d2;
}
</style>