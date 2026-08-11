<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '@/stores/notifications'

// ⚠️ Adaptez ces noms de route à votre router si besoin
const ROUTE_DEMANDES = { name: 'demande-carburant' }
const ROUTE_AFFECTATIONS = { name: 'affectations' }

const router = useRouter()
const notificationsStore = useNotificationsStore()

const demandesAValider = computed(() => notificationsStore.demandesAValider)
const equipementsAffectes = computed(() => notificationsStore.equipementsAffectes)
const totalCount = computed(() => notificationsStore.totalCount)
const loading = computed(() => notificationsStore.loading)

let pollInterval = null

const goToDemande = (idDemande) => {
  router.push(ROUTE_DEMANDES).catch(() => {})
}

const goToAffectation = () => {
  router.push(ROUTE_AFFECTATIONS).catch(() => {})
}

onMounted(() => {
  notificationsStore.fetchAll()
  // Rafraîchissement toutes les 60s (pas de WebSocket/push côté backend documenté)
  pollInterval = setInterval(() => {
    notificationsStore.fetchAll()
  }, 60000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <VMenu offset="8" location="bottom end">
    <template #activator="{ props }">
      <IconBtn v-bind="props">
        <VBadge
          v-if="totalCount > 0"
          :content="totalCount > 99 ? '99+' : totalCount"
          color="error"
          offset-x="2"
          offset-y="2"
        >
          <VIcon icon="bx-bell" />
        </VBadge>
        <VIcon v-else icon="bx-bell" />
      </IconBtn>
    </template>

    <VCard min-width="360" max-width="400" max-height="480" class="d-flex flex-column">
      <VCardItem class="py-3">
        <VCardTitle class="text-body-1 font-weight-medium">
          Notifications
        </VCardTitle>
        <template #append>
          <VChip v-if="totalCount > 0" size="small" color="error" label>
            {{ totalCount }}
          </VChip>
        </template>
      </VCardItem>

      <VDivider />

      <div class="overflow-y-auto flex-grow-1">
        <div v-if="loading && totalCount === 0" class="d-flex justify-center pa-6">
          <VProgressCircular indeterminate color="primary" size="24" />
        </div>

        <div v-else-if="totalCount === 0" class="text-center text-medium-emphasis pa-6">
          <VIcon icon="bx-check-circle" size="28" class="mb-2" />
          <div>Aucune notification</div>
        </div>

        <template v-else>
          <!-- Demandes à valider : c'est le tour de l'utilisateur connecté -->
          <div v-if="demandesAValider.length" class="px-4 pt-3 pb-1 text-caption text-medium-emphasis text-uppercase">
            À valider ({{ demandesAValider.length }})
          </div>
          <VList density="compact" lines="two">
            <VListItem
              v-for="demande in demandesAValider"
              :key="'demande-' + demande.idDemande"
              @click="goToDemande(demande.idDemande)"
            >
              <template #prepend>
                <VAvatar color="warning" variant="tonal" size="36">
                  <VIcon icon="bx-gas-pump" size="18" />
                </VAvatar>
              </template>
              <VListItemTitle class="text-body-2">
                {{ demande.utilisateur?.prenomUtilisateur }} {{ demande.utilisateur?.nomUtilisateur }} — {{ demande.quantiteDemandee }} L
              </VListItemTitle>
              <VListItemSubtitle class="text-caption">
                C'est votre tour de valider — {{ demande.equipement?.immatriculationEquipement || '-' }}
              </VListItemSubtitle>
            </VListItem>
          </VList>

          <VDivider v-if="demandesAValider.length && equipementsAffectes.length" />

          <!-- Équipements actuellement affectés au chauffeur connecté -->
          <div v-if="equipementsAffectes.length" class="px-4 pt-3 pb-1 text-caption text-medium-emphasis text-uppercase">
            Affectations ({{ equipementsAffectes.length }})
          </div>
          <VList density="compact" lines="two">
            <VListItem
              v-for="item in equipementsAffectes"
              :key="'affectation-' + (item.idEquipementUtilisateur || item.idEquipement)"
              @click="goToAffectation"
            >
              <template #prepend>
                <VAvatar color="primary" variant="tonal" size="36">
                  <VIcon icon="bx-car" size="18" />
                </VAvatar>
              </template>
              <VListItemTitle class="text-body-2">
                {{ item.equipement?.immatriculationEquipement || '-' }}
              </VListItemTitle>
              <VListItemSubtitle class="text-caption">
                Véhicule actuellement affecté à vous — niveau carburant {{ item.niveauCarburant ?? '-' }}%
              </VListItemSubtitle>
            </VListItem>
          </VList>
        </template>
      </div>

      <VDivider />
      <VCardActions class="justify-center py-2">
        <VBtn size="small" variant="text" @click="notificationsStore.fetchAll()" :loading="loading">
          Actualiser
        </VBtn>
      </VCardActions>
    </VCard>
  </VMenu>
</template>