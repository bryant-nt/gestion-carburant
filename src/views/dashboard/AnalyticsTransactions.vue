<script setup>
import { useChefCharroiStore } from '@/stores/chefCharroi'

const store = useChefCharroiStore()
const stocksStations = computed(() => store.stocksStations)

const colorByCarburant = {
  mazouts: 'warning',
  essence: 'info',
}
const getColor = carburant => colorByCarburant[(carburant || '').toLowerCase()] || 'primary'

const moreList = [
  { title: 'Actualiser', value: 'Refresh' },
]
</script>

<template>
  <VCard title="Stocks par station">
    <template #append>
      <MoreBtn :menu-list="moreList" />
    </template>

    <VCardText>
      <VList class="card-list">
        <VListItem
          v-for="item in stocksStations"
          :key="item.libelle || `${item.idStation}-${item.idCarburant}`"
        >
          <template #prepend>
            <VAvatar
              rounded
              variant="tonal"
              :color="getColor(item.carburant)"
              size="40"
            >
              <VIcon icon="bx-gas-pump" />
            </VAvatar>
          </template>

          <VListItemSubtitle>
            {{ item.station }}
          </VListItemSubtitle>
          <VListItemTitle>
            {{ item.carburant }}
          </VListItemTitle>

          <template #append>
            <VListItemAction>
              <span class="me-2">{{ item.litres?.toLocaleString('fr-FR') }}</span>
              <span class="text-disabled">L</span>
            </VListItemAction>
          </template>
        </VListItem>
      </VList>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
  .card-list {
    --v-card-list-gap: 1.5rem;
  }
</style>