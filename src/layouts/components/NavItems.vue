<script setup>
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue'
import VerticalNavSectionTitle from '@layouts/components/VerticalNavSectionTitle.vue'
</script>

<template>
  <!-- ============================================================ -->
  <!--  DASHBOARD                                                   -->
  <!-- ============================================================ -->
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'bx-home-smile',
      badgeContent: '',
      badgeClass: 'bg-error',
      to: '/dashboard',
    }"
  />

  <!-- ============================================================ -->
  <!--  UTILISATEURS & ADMINISTRATION                                -->
  <!-- ============================================================ -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Utilisateurs & Administration',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Utilisateurs',
      icon: 'bx-user',
      to: '/users',
    }"
  />

  <VerticalNavGroup
    :item="{
      title: 'Administration',
      icon: 'bx-shield',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Rôles',
        icon: 'bx-lock',
        to: '/roles',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Permissions',
        icon: 'bx-key',
        to: '/permissions',
      }"
    />
  </VerticalNavGroup>

  <!-- ============================================================ -->
  <!--  PARAMÈTRES                                                   -->
  <!-- ============================================================ -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Paramètres',
    }"
  />

  <VerticalNavGroup
    :item="{
      title: 'Stations',
      icon: 'bx-gas-pump',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Liste des stations',
        icon: 'bx-list-ul',
        to: '/stations',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Types de carburant',
        icon: 'bx-droplet',
        to: '/types-carburant',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Stock carburant',
        icon: 'bx-package',
        to: '/stock-carburant',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Historique achats',
        icon: 'bx-history',
        to: '/historique-achats',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Seuils carburant',
        icon: 'bx-line-chart',
        to: '/seuils-carburant',
      }"
    />
  </VerticalNavGroup>

  <VerticalNavGroup
    :item="{
      title: 'Unités',
      icon: 'bx-building',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Unités organisationnelles',
        icon: 'bx-sitemap',
        to: '/unites',
      }"
    />
  </VerticalNavGroup>

  <!-- ============================================================ -->
  <!--  ENGINS                                                       -->
  <!-- ============================================================ -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Engins',
    }"
  />

  <VerticalNavGroup
    :item="{
      title: 'Engins',
      icon: 'bx-car',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Liste des engins',
        icon: 'bx-list-ul',
        to: '/equipements',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Types d’engin',
        icon: 'bx-cog',
        to: '/types-equipement',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Statuts de l’engin',
        icon: 'bx-check-circle',
        to: '/statuts-equipement',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'États de l’engin',
        icon: 'bx-refresh',
        to: '/etats-equipement',
      }"
    />
  </VerticalNavGroup>

  <!-- ============================================================ -->
  <!--  DEMANDES & APPROVISIONNEMENTS                                -->
  <!-- ============================================================ -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Demandes & Approvisionnements',
    }"
  />

  <VerticalNavGroup
    :item="{
      title: 'Gestion des flux',
      icon: 'bx-transfer',
    }"
  >
    <!-- Les badges ont été retirés pour ces trois entrées -->
    <VerticalNavLink
      :item="{
        title: 'Affectations',
        icon: 'bx-transfer',
        to: '/affectations',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Demandes carburant',
        icon: 'bx-file',
        to: '/demandes-carburant',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Approvisionnements',
        icon: 'bx-package',
        to: '/approvisionnements',
      }"
    />
  </VerticalNavGroup>
</template>

<style scoped>
/* ============================================================
   Design professionnel pour le menu latéral
   ============================================================ */

:deep(.v-list-subheader) {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.4);
  padding-left: 16px;
  padding-top: 12px;
  padding-bottom: 6px;
}

:deep(.v-list-group__header .v-list-item-title) {
  font-weight: 600;
  letter-spacing: 0.02em;
}

:deep(.v-list-item__prepend .v-icon) {
  font-size: 22px;
  transition: color 0.2s ease;
}

:deep(.v-list-item--link:hover) {
  background-color: rgba(var(--v-theme-primary), 0.06) !important;
}
:deep(.v-list-item--link:hover .v-icon) {
  color: rgb(var(--v-theme-primary)) !important;
}

:deep(.v-badge__badge) {
  font-size: 0.65rem;
  padding: 0 6px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  font-weight: 600;
}

:deep(.v-list-group__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.bg-error .v-badge__badge {
  background-color: rgb(var(--v-theme-error)) !important;
}
.bg-warning .v-badge__badge {
  background-color: rgb(var(--v-theme-warning)) !important;
}
.bg-info .v-badge__badge {
  background-color: rgb(var(--v-theme-info)) !important;
}
</style>