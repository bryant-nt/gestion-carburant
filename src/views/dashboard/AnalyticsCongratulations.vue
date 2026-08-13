<script setup>
import { useTheme } from 'vuetify'
import illustrationJohnDark from '@images/cards/test.png'
import illustrationJohnLight from '@images/cards/test.png'
import { useChefCharroiStore } from '@/stores/chefCharroi'

const { global } = useTheme()
const illustrationJohn = computed(() => global.name.value === 'dark' ? illustrationJohnDark : illustrationJohnLight)

const store = useChefCharroiStore()
const consommationMensuelle = computed(() => store.consommationMensuelle)
const vehiculesEnService = computed(() => store.vehiculesEnService)
</script>

<template>
  <VCard class="text-center text-sm-start">
    <VRow no-gutters>
      <VCol
        cols="12"
        sm="8"
        order="2"
        order-sm="1"
      >
        <VCardItem class="pb-3">
          <VCardTitle class="text-primary">
            Tableau de bord
          </VCardTitle>
        </VCardItem>

        <VCardText class="pa-4">
  <!-- Indicateur consommation -->
  <div v-if="consommationMensuelle" class="d-flex align-center justify-space-between mb-3">
    <span class="text-body-1 text-medium-emphasis">
      ⛽ Consommation du mois
    </span>
    <div class="text-right">
      <span class="text-h6 font-weight-bold text-primary">
        {{ consommationMensuelle.litres?.toLocaleString('fr-FR') }} L
      </span>
      <VChip
        :color="consommationMensuelle.variationPourcent >= 0 ? 'error' : 'success'"
        size="small"
        class="ml-2"
      >
        {{ consommationMensuelle.variationPourcent >= 0 ? '+' : '' }}{{ consommationMensuelle.variationPourcent?.toFixed(1) }}%
      </VChip>
      <span class="text-caption text-medium-emphasis d-block">vs mois précédent</span>
    </div>
  </div>

  <VDivider class="my-3" />

  <!-- Indicateur véhicules -->
  <div v-if="vehiculesEnService" class="d-flex align-center justify-space-between">
    <span class="text-body-1 text-medium-emphasis">
      🚗 Véhicules en service
    </span>
    <div class="text-right">
      <span class="text-h6 font-weight-bold text-success">
        {{ vehiculesEnService.enService }}
      </span>
      <span class="text-body-2 text-medium-emphasis">
        / {{ vehiculesEnService.total }}
      </span>
      <VChip color="info" size="small" class="ml-2">
        {{ vehiculesEnService.pourcentage?.toFixed(0) }}%
      </VChip>
    </div>
  </div>

  <!-- État chargement -->
  <div v-if="!consommationMensuelle || !vehiculesEnService" class="text-center py-4">
    <VProgressCircular indeterminate size="32" color="primary" />
    <p class="text-caption text-medium-emphasis mt-2">Chargement des données...</p>
  </div>
</VCardText>
      </VCol>

      <VCol
        cols="12"
        sm="4"
        order="1"
        order-sm="2"
        class="text-center"
      >
        <img
          :src="illustrationJohn"
          :height="$vuetify.display.xs ? '150' : '182'"
          :class="$vuetify.display.xs ? 'mt-6 mb-n2' : 'position-absolute'"
          class="john-illustration flip-in-rtl"
        >
      </VCol>
    </VRow>
  </VCard>
</template>

<style lang="scss" scoped>
.john-illustration {
  inset-block-end: -0.125rem;
  inset-inline-end: 3.5rem;
}
.john-illustration {
  inset-block-end: -0.125rem;
  inset-inline-end: 3.5rem;
}

/* Agrandir la carte vers le bas */
.v-card {
  min-height: 215px; /* ou plus, selon ce que vous voulez */
  height: auto; /* garde le responsive */
}

</style>