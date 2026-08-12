<script setup>
import { onMounted, computed } from 'vue'
import AnalyticsCongratulations from '@/views/dashboard/AnalyticsCongratulations.vue'
import AnalyticsFinanceTabs from '@/views/dashboard/AnalyticsFinanceTab.vue'
import AnalyticsOrderStatistics from '@/views/dashboard/AnalyticsOrderStatistics.vue'
import AnalyticsProfitReport from '@/views/dashboard/AnalyticsProfitReport.vue'
import AnalyticsTotalRevenue from '@/views/dashboard/AnalyticsTotalRevenue.vue'
import AnalyticsTransactions from '@/views/dashboard/AnalyticsTransactions.vue'
import { useChefCharroiStore } from '@/stores/chefCharroi'

// 👉 Images (réutilisées telles quelles pour les 4 cartes stats, seul le contenu change)
import chart from '@images/cards/chart-success.png'
import card from '@images/cards/credit-card-primary.png'
import paypal from '@images/cards/paypal-error.png'
import wallet from '@images/cards/wallet-info.png'

const store = useChefCharroiStore()

const consommationMensuelle = computed(() => store.consommationMensuelle)
const consommationAnnuelle = computed(() => store.consommationAnnuelle)
const vehiculesEnService = computed(() => store.vehiculesEnService)
const demandesEnAttente = computed(() => store.demandesEnAttente)

onMounted(() => {
  store.fetchWebDashboard()
})
</script>

<template>
  <VRow>
    <!-- 👉 Congratulations -->
    <VCol
      cols="12"
      md="8"
    >
      <AnalyticsCongratulations />
    </VCol>

    <VCol
      cols="12"
      sm="4"
    >
      <VRow>
        <!-- 👉 Consommation mensuelle -->
        <VCol
          cols="12"
          md="6"
        >
          <CardStatisticsVertical
            v-bind="{
              title: 'Consommation mensuelle',
              image: chart,
              stats: `${consommationMensuelle?.litres?.toLocaleString('fr-FR') || 0} L`,
              change: consommationMensuelle?.variationPourcent ?? 0,
            }"
          />
        </VCol>

        <!-- 👉 Consommation annuelle -->
        <VCol
          cols="12"
          md="6"
        >
          <CardStatisticsVertical
            v-bind="{
              title: 'Consommation annuelle',
              image: wallet,
              stats: `${consommationAnnuelle?.litres?.toLocaleString('fr-FR') || 0} L`,
              change: consommationAnnuelle?.variationPourcent ?? 0,
            }"
          />
        </VCol>
      </VRow>
    </VCol>

    <!-- 👉 Total Revenue -->
    <VCol
      cols="12"
      md="8"
      order="2"
      order-md="1"
    >
      <AnalyticsTotalRevenue />
    </VCol>

    <VCol
      cols="12"
      sm="8"
      md="4"
      order="1"
      order-md="2"
    >
      <VRow>
        <!-- 👉 Véhicules en service -->
        <VCol
          cols="12"
          sm="6"
        >
          <CardStatisticsVertical
            v-bind="{
              title: 'Véhicules en service',
              image: paypal,
              stats: vehiculesEnService ? `${vehiculesEnService.enService}/${vehiculesEnService.total}` : '-',
              change: vehiculesEnService?.pourcentage ?? 0,
            }"
          />
        </VCol>

        <!-- 👉 Demandes en attente -->
        <VCol
          cols="12"
          sm="6"
        >
          <CardStatisticsVertical
            v-bind="{
              title: 'Demandes en attente',
              image: card,
              stats: `${demandesEnAttente?.count ?? 0}`,
              change: 0,
            }"
          />
        </VCol>
      </VRow>

      <VRow>
        <!-- 👉 Profit Report -->
        <VCol
          cols="12"
          sm="12"
        >
          <AnalyticsProfitReport />
        </VCol>
      </VRow>
    </VCol>

    <!-- 👉 Order Statistics -->
    <VCol
      cols="12"
      md="4"
      sm="6"
      order="3"
    >
      <AnalyticsOrderStatistics />
    </VCol>

    <!-- 👉 Tabs chart -->
    <VCol
      cols="12"
      md="4"
      sm="6"
      order="3"
    >
      <AnalyticsFinanceTabs />
    </VCol>

    <!-- 👉 Transactions -->
    <VCol
      cols="12"
      md="4"
      sm="6"
      order="3"
    >
      <AnalyticsTransactions />
    </VCol>
  </VRow>
</template>