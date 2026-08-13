<script setup>
import {
  useDisplay,
  useTheme,
} from 'vuetify'
import { hexToRgb } from '@core/utils/colorConverter'
import { useChefCharroiStore } from '@/stores/chefCharroi'

const vuetifyTheme = useTheme()
const display = useDisplay()
const store = useChefCharroiStore()

const consommationParMois = computed(() => store.consommationParMois)
const consommationAnnuelle = computed(() => store.consommationAnnuelle)

const series = computed(() => [
  {
    name: `${new Date().getFullYear()}`,
    data: consommationParMois.value.map(m => m.litres || 0),
  },
])

const categories = computed(() => consommationParMois.value.map(m => m.libelle))

const chartOptions = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  const variableTheme = vuetifyTheme.current.value.variables
  const disabledTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['disabled-opacity'] })`
  const primaryTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['high-emphasis-opacity'] })`
  const secondaryTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['medium-emphasis-opacity'] })`
  const borderColor = `rgba(${ hexToRgb(String(variableTheme['border-color'])) },${ variableTheme['border-opacity'] })`

  const isPositive = (consommationAnnuelle.value?.variationPourcent ?? 0) >= 0
  const radialColor = isPositive ? currentTheme.success : currentTheme.error

  return {
    bar: {
      chart: {
        stacked: false,
        parentHeightOffset: 6,
        offsetX: -12,
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: {
        width: 6,
        lineCap: 'round',
        colors: [currentTheme.surface],
      },
      colors: [`rgba(${ hexToRgb(String(currentTheme.primary)) }, 1)`],
      legend: { show: false },
      states: {
        hover: { filter: { type: 'none' } },
        active: { filter: { type: 'none' } },
      },
      grid: {
        strokeDashArray: 6,
        borderColor,
        padding: { bottom: 5 },
      },
      plotOptions: {
        bar: {
          borderRadius: 9,
          columnWidth: '30%',
          borderRadiusApplication: 'around',
          borderRadiusWhenStacked: 'all',
        },
      },
      xaxis: {
        axisTicks: { show: false },
        crosshairs: { opacity: 0 },
        axisBorder: { show: false },
        categories: categories.value,
        labels: {
          style: {
            fontSize: '13px',
            colors: disabledTextColor,
            fontFamily: 'Public Sans',
          },
        },
      },
      yaxis: {
        labels: {
          formatter: val => `${val} L`,
          style: {
            fontSize: '13px',
            colors: disabledTextColor,
            fontFamily: 'Public Sans',
          },
        },
      },
      responsive: [
        {
          breakpoint: 1980,
          options: { plotOptions: { bar: { columnWidth: '32%', borderRadius: 8 } } },
        },
        {
          breakpoint: display.thresholds.value.xl,
          options: { plotOptions: { bar: { columnWidth: '43%', borderRadius: 8 } } },
        },
        {
          breakpoint: display.thresholds.value.lg,
          options: { plotOptions: { bar: { columnWidth: '50%', borderRadius: 7 } } },
        },
        {
          breakpoint: display.thresholds.value.md,
          options: { plotOptions: { bar: { columnWidth: '48%', borderRadius: 8 } } },
        },
        {
          breakpoint: display.thresholds.value.sm,
          options: { plotOptions: { bar: { columnWidth: '44%', borderRadius: 6 } } },
        },
        {
          breakpoint: 599,
          options: { plotOptions: { bar: { columnWidth: '44%', borderRadius: 8 } } },
        },
        {
          breakpoint: 420,
          options: { plotOptions: { bar: { columnWidth: '55%', borderRadius: 6 } } },
        },
      ],
    },
    radial: {
      chart: { sparkline: { enabled: true } },
      labels: ['Variation'],
      stroke: { dashArray: 5 },
      colors: [`rgba(${ hexToRgb(String(radialColor)) }, 1)`],
      states: {
        hover: { filter: { type: 'none' } },
        active: { filter: { type: 'none' } },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          opacityTo: 0.6,
          opacityFrom: 1,
          shadeIntensity: 0.5,
          stops: [30, 70, 100],
          inverseColors: false,
          gradientToColors: [radialColor],
        },
      },
      plotOptions: {
        radialBar: {
          endAngle: 150,
          startAngle: -140,
          hollow: { size: '55%' },
          track: { background: 'transparent' },
          dataLabels: {
            name: {
              offsetY: 25,
              fontWeight: 500,
              fontSize: '15px',
              color: secondaryTextColor,
              fontFamily: 'Public Sans',
            },
            value: {
              offsetY: -15,
              fontWeight: 500,
              fontSize: '24px',
              color: primaryTextColor,
              fontFamily: 'Public Sans',
              formatter: () => {
                const v = consommationAnnuelle.value?.variationPourcent
                if (v === null || v === undefined) return '-'
                return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
              },
            },
          },
        },
      },
      responsive: [
        { breakpoint: 900, options: { chart: { height: 200 } } },
        { breakpoint: 735, options: { chart: { height: 200 } } },
        { breakpoint: 660, options: { chart: { height: 200 } } },
        { breakpoint: 600, options: { chart: { height: 200 } } },
      ],
    }
  }
})

const radialSeries = computed(() => {
  const v = consommationAnnuelle.value?.variationPourcent
  if (v === null || v === undefined) return [0]
  return [Math.max(0, Math.min(100, Math.abs(v)))]
})

const balanceData = computed(() => [
  {
    icon: 'bx-calendar-check',
    amount: `${consommationAnnuelle.value?.litres?.toLocaleString('fr-FR') || 0} L`,
    year: 'Cette année',
    color: 'primary',
  },
  {
    icon: 'bx-calendar',
    amount: `${consommationAnnuelle.value?.litresPeriodePrecedente?.toLocaleString('fr-FR') || 0} L`,
    year: 'Année précédente',
    color: 'info',
  },
])


</script>

<template>
  <VCard>
    <VRow no-gutters>
      <VCol
        cols="12"
        sm="7"
        xl="8"
        :class="$vuetify.display.smAndUp ? 'border-e' : 'border-b'"
      >
        <VCardItem class="pb-0">
          <VCardTitle>Consommation mensuelle (litres)</VCardTitle>

          <template #append>
            <MoreBtn :menu-list="moreList" />
          </template>
        </VCardItem>

        <!-- bar chart -->
        <VCardText class="pb-0">
          <VueApexCharts
            type="bar"
            :height="335"
            :options="chartOptions.bar"
            :series="series"
          />
        </VCardText>
      </VCol>

      <VCol
        cols="12"
        sm="5"
        xl="4"
      >
        <VCardText class="text-center pt-10">
          <VChip variant="tonal" class="mb-2" color="primary">
            {{ new Date().getFullYear() }}
          </VChip>

          <!-- radial chart -->
          <VueApexCharts
            type="radialBar"
            :height="200"
            :options="chartOptions.radial"
            :series="radialSeries"
          />

          <h6 class="text-h6 text-medium-emphasis mb-8 mt-1">
            Consommation annuelle
          </h6>
          <div class="d-flex align-center justify-center flex-wrap gap-x-6 gap-y-3">
            <div
              v-for="data in balanceData"
              :key="data.year"
              class="d-flex align-center gap-2"
            >
              <VAvatar
                :icon="data.icon"
                :color="data.color"
                size="38"
                rounded
                variant="tonal"
              />

              <div class="text-start">
                <span class="text-sm"> {{ data.year }}</span>
                <h6 class="text-h6">
                  {{ data.amount }}
                </h6>
              </div>
            </div>
          </div>
        </VCardText>
      </VCol>
    </VRow>
  </VCard>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss"
</style>