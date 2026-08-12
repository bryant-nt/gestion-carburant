<script setup>
import { useTheme } from 'vuetify'
import { hexToRgb } from '@core/utils/colorConverter'
import { useChefCharroiStore } from '@/stores/chefCharroi'

const vuetifyTheme = useTheme()
const store = useChefCharroiStore()

const consommationParTypeEngin = computed(() => store.consommationParTypeEngin)
const parc = computed(() => store.parc)

const paletteKeys = ['primary', 'success', 'secondary', 'info', 'warning', 'error']
const iconByType = {
  voiture: 'bx-car',
  moto: 'bx-cycling',
  'groupe electrogène': 'bx-power-off',
  'groupe électrogène': 'bx-power-off',
}
const getIcon = type => iconByType[(type || '').toLowerCase()] || 'bx-category'

const totalLitres = computed(() => consommationParTypeEngin.value.reduce((s, t) => s + (t.litres || 0), 0))

const series = computed(() => consommationParTypeEngin.value.map(t => t.litres || 0))

const chartOptions = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  const variableTheme = vuetifyTheme.current.value.variables
  const secondaryTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['medium-emphasis-opacity'] })`
  const primaryTextColor = `rgba(${ hexToRgb(String(currentTheme['on-surface'])) },${ variableTheme['high-emphasis-opacity'] })`

  return {
    chart: {
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: {
      width: 6,
      colors: [currentTheme.surface],
    },
    legend: { show: false },
    tooltip: {
      enabled: true,
      y: { formatter: val => `${val.toLocaleString('fr-FR')} L` },
    },
    dataLabels: { enabled: false },
    labels: consommationParTypeEngin.value.map(t => t.type),
    colors: consommationParTypeEngin.value.map((_, i) => currentTheme[paletteKeys[i % paletteKeys.length]]),
    grid: {
      padding: {
        top: -7,
        bottom: 5,
      },
    },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    plotOptions: {
      pie: {
        expandOnClick: false,
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              offsetY: 17,
              fontSize: '13px',
              color: secondaryTextColor,
              fontFamily: 'Public Sans',
            },
            value: {
              offsetY: -17,
              fontSize: '18px',
              color: primaryTextColor,
              fontFamily: 'Public Sans',
              fontWeight: 500,
              formatter: val => `${Number(val).toLocaleString('fr-FR')} L`,
            },
            total: {
              show: true,
              label: 'Total',
              fontSize: '13px',
              lineHeight: '18px',
              formatter: () => `${totalLitres.value.toLocaleString('fr-FR')} L`,
              color: secondaryTextColor,
              fontFamily: 'Public Sans',
            },
          },
        },
      },
    },
  }
})

const moreList = [
  { title: 'Actualiser', value: 'Refresh' },
]
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>
        Consommation par type d'engin
      </VCardTitle>
      <VCardSubtitle>{{ totalLitres.toLocaleString('fr-FR') }} L au total cette année</VCardSubtitle>

      <template #append>
        <MoreBtn :menu-list="moreList" />
      </template>
    </VCardItem>

    <VCardText>
      <div class="d-flex align-center justify-space-between mb-6">
        <div class="">
          <h3 class="text-h3 mb-1">
            {{ parc?.totalEngins ?? '-' }}
          </h3>
          <div class="text-caption text-medium-emphasis">
            Parc total
          </div>
        </div>

        <div>
          <VueApexCharts
            type="donut"
            :height="120"
            width="100"
            :options="chartOptions"
            :series="series"
          />
        </div>
      </div>

      <VList class="card-list">
        <VListItem
          v-for="(item, index) in consommationParTypeEngin"
          :key="item.type"
        >
          <template #prepend>
            <VAvatar
              size="40"
              rounded
              variant="tonal"
              :color="paletteKeys[index % paletteKeys.length]"
            >
              <VIcon :icon="getIcon(item.type)" />
            </VAvatar>
          </template>

          <VListItemTitle class="font-weight-medium">
            {{ item.type }}
          </VListItemTitle>
          <VListItemSubtitle class="text-body-2">
            {{ totalLitres > 0 ? ((item.litres / totalLitres) * 100).toFixed(0) : 0 }}% du total
          </VListItemSubtitle>

          <template #append>
            <span>{{ item.litres?.toLocaleString('fr-FR') }} L</span>
          </template>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
.card-list {
  --v-card-list-gap: 1.25rem;
}
</style>