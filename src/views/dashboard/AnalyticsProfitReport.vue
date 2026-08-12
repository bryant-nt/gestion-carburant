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
const consommationMensuelle = computed(() => store.consommationMensuelle)

const series = computed(() => [{
  data: consommationParMois.value.map(m => m.litres || 0),
}])

const variation = computed(() => consommationMensuelle.value?.variationPourcent ?? 0)
const isPositive = computed(() => variation.value >= 0)

const chartOptions = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  const color = isPositive.value ? currentTheme.warning : currentTheme.warning

  return {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false },
      dropShadow: {
        top: 12,
        blur: 4,
        left: 0,
        enabled: true,
        opacity: 0.12,
        color,
      },
    },
    tooltip: {
      enabled: true,
      y: { formatter: val => `${val} L` },
    },
    colors: [`rgba(${ hexToRgb(String(color)) }, 1)`],
    stroke: {
      width: 4,
      curve: 'smooth',
      lineCap: 'round',
    },
    grid: {
      show: false,
      padding: {
        top: -21,
        left: -5,
        bottom: -8,
      },
    },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    yaxis: { labels: { show: false } },
    responsive: [
      {
        breakpoint: display.thresholds.value.lg,
        options: { chart: { height: 151, width: '100%' } },
      },
      {
        breakpoint: display.thresholds.value.md,
        options: { chart: { height: 131, width: '100%' } },
      },
    ],
  }
})
</script>

<template>
  <VCard>
    <VCardText class="d-flex justify-space-between h-100">
      <div class="d-flex flex-column justify-space-between gap-y-4">
        <div>
          <h5 class="text-h5 mb-1">
            Tendance consommation
          </h5>
          <VChip
            color="warning"
            size="small"
          >
            Année {{ new Date().getFullYear() }}
          </VChip>
        </div>

        <div>
          <div
            class="d-flex gap-1 align-center"
            :class="isPositive ? 'text-error' : 'text-success'"
          >
            <VIcon
              :icon="isPositive ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt'"
              size="20"
            />
            <span class="text-base d-inline-block">{{ isPositive ? '+' : '' }}{{ variation.toFixed(1) }}%</span>
          </div>

          <h4 class="text-h4">
            {{ consommationMensuelle?.litres?.toLocaleString('fr-FR') || 0 }} L
          </h4>
        </div>
      </div>

      <div class="h-100 d-flex align-center">
        <VueApexCharts
          type="line"
          :height="131"
          width="80%"
          :options="chartOptions"
          :series="series"
        />
      </div>
    </VCardText>
  </VCard>
</template>