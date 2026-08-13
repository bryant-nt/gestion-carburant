<script setup>
import { useTheme } from 'vuetify'
import illustrationJohnDark from '@images/cards/illustration-john-dark.png'
import illustrationJohnLight from '@images/cards/illustration-john-light.png'
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
            Tableau de bord 🚛
          </VCardTitle>
        </VCardItem>

        <VCardText>
          <template v-if="consommationMensuelle">
            Consommation du mois : <strong>{{ consommationMensuelle.litres?.toLocaleString('fr-FR') }} L</strong>
            ({{ consommationMensuelle.variationPourcent >= 0 ? '+' : '' }}{{ consommationMensuelle.variationPourcent?.toFixed(1) }}% vs mois précédent)
          </template>
          <template v-else>
            Chargement des données...
          </template>
          <br>
          <template v-if="vehiculesEnService">
            {{ vehiculesEnService.enService }} véhicules en service sur {{ vehiculesEnService.total }} ({{ vehiculesEnService.pourcentage?.toFixed(0) }}%).
          </template>
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
</style>