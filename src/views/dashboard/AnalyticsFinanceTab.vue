<script setup>
import { useTheme } from 'vuetify'
import statsVerticalChart from '@images/cards/chart-success.png'
import statsVerticalPaypal from '@images/cards/paypal-error.png'
import statsVerticalWallet from '@images/cards/wallet-primary.png'
import { hexToRgb } from '@layouts/utils'
import { useChefCharroiStore } from '@/stores/chefCharroi'

const vuetifyTheme = useTheme()
const store = useChefCharroiStore()

const consommationParMois = computed(() => store.consommationParMois)
const consommationMensuelle = computed(() => store.consommationMensuelle)
const consommationAnnuelle = computed(() => store.consommationAnnuelle)
const demandesEnAttente = computed(() => store.demandesEnAttente)

const currentTab = ref('mensuel')

// La seule série mensuelle réelle disponible (consommationParMois) sert de fond
// de courbe pour les onglets "mensuel" et "annuel" ; l'onglet "demandes" n'a pas
// d'historique temporel dans l'API, donc pas de graphique fabriqué pour lui.
const series = computed(() => ({
  mensuel: [{ data: consommationParMois.value.map(m => m.litres || 0) }],
  annuel: [{ data: consommationParMois.value.map(m => m.litres || 0) }],
}))

const tabData = computed(() => {
  const data = {
    mensuel: {
      avatar: statsVerticalWallet,
      title: 'Consommation du mois',
      stats: `${consommationMensuelle.value?.litres?.toLocaleString('fr-FR') || 0} L`,
      profitLoss: consommationMensuelle.value?.variationPourcent ?? 0,
      hasChart: true,
    },
    annuel: {
      avatar: statsVerticalChart,
      title: 'Consommation annuelle',
      stats: `${consommationAnnuelle.value?.litres?.toLocaleString('fr-FR') || 0} L`,
      profitLoss: consommationAnnuelle.value?.variationPourcent ?? 0,
      hasChart: true,
    },
    demandes: {
      avatar: statsVerticalPaypal,
      title: 'Demandes en attente',
      stats: `${demandesEnAttente.value?.count ?? 0}`,
      profitLoss: null,
      hasChart: false,
      extra: demandesEnAttente.value ? `Délai moyen : ${demandesEnAttente.value.delaiMoyenJours?.toFixed(1)} j` : '',
    },
  }

  return data[currentTab.value]
})

const chartConfig = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  const variableTheme = vuetifyTheme.current.value.variables
  const disabledTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['disabled-opacity'] })`
  const borderColor = `rgba(${ hexToRgb(String(variableTheme['border-color'])) },${ variableTheme['border-opacity'] })`

  const currentSeries = series.value[currentTab.value] || [{ data: [] }]

  return {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: {
      width: 3,
      curve: 'smooth',
    },
    grid: {
      strokeDashArray: 4.5,
      borderColor,
      padding: {
        left: 0,
        top: -20,
        right: 11,
        bottom: 7,
      },
    },
    fill: {
      type: 'gradient',
      gradient: {
        opacityTo: 0.25,
        opacityFrom: 0.5,
        stops: [0, 95, 100],
        shadeIntensity: 0.6,
        colorStops: [[
          { offset: 0, opacity: 0.4, color: currentTheme.primary },
          { offset: 100, opacity: 0.2, color: currentTheme.surface },
        ]],
      },
    },
    theme: {
      monochrome: {
        enabled: true,
        shadeTo: 'light',
        shadeIntensity: 1,
        color: currentTheme.primary,
      },
    },
    xaxis: {
      axisTicks: { show: false },
      axisBorder: { show: false },
      categories: consommationParMois.value.map(m => m.libelle),
      offsetY: 20,
      offsetX: -24,
      labels: {
        style: {
          fontSize: '14px',
          colors: disabledTextColor,
          fontFamily: 'Public Sans',
        },
      },
    },
    yaxis: { show: false },
    markers: {
      size: 8,
      strokeWidth: 6,
      strokeOpacity: 1,
      offsetX: -10,
      hover: { size: 8 },
      colors: ['transparent'],
      strokeColors: 'transparent',
      discrete: [{
        size: 8,
        seriesIndex: 0,
        fillColor: '#fff',
        strokeColor: currentTheme.primary,
        dataPointIndex: Math.max(0, currentSeries[0].data.length - 1),
      }],
    },
  }
})
</script>

<template>
  <VCard>
    <VCardText>
      <VTabs
        v-model="currentTab"
        class="v-tabs-pill"
      >
        <VTab value="mensuel">
          Mensuel
        </VTab>
        <VTab value="annuel">
          Annuel
        </VTab>
        <VTab value="demandes">
          Demandes
        </VTab>
      </VTabs>
    </VCardText>

    <VCardText class="d-flex align-center gap-3">
      <VAvatar
        size="48"
        rounded
        :image="tabData.avatar"
      />

      <div>
        <p class="mb-0">
          {{ tabData.title }}
        </p>
        <div class="d-flex align-center gap-2">
          <h6 class="text-h6">
            {{ tabData.stats }}
          </h6>
          <span
            v-if="tabData.profitLoss !== null"
            class="text-sm"
            :class="tabData.profitLoss >= 0 ? 'text-success' : 'text-error'"
          >
            <VIcon
              size="24"
              :icon="tabData.profitLoss >= 0 ? 'bx-chevron-up' : 'bx-chevron-down'"
            />
            {{ tabData.profitLoss >= 0 ? '' : '' }}{{ Math.abs(tabData.profitLoss).toFixed(1) }}%
          </span>
        </div>
        <p v-if="tabData.extra" class="text-caption text-medium-emphasis mb-0">
          {{ tabData.extra }}
        </p>
      </div>
    </VCardText>

    <VCardText v-if="tabData.hasChart">
      <VueApexCharts
        type="area"
        :height="230"
        :options="chartConfig"
        :series="series[currentTab]"
      />
    </VCardText>

    <VCardText v-else class="d-flex align-center justify-center" style="min-height: 230px;">
      <div class="text-center text-medium-emphasis">
        <VIcon icon="bx-time-five" size="40" class="mb-2" />
        <div>Pas d'historique temporel disponible pour les demandes</div>
      </div>
    </VCardText>
  </VCard>
</template>