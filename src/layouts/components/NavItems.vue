<script setup>
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
import VerticalNavGroup from '@layouts/components/VerticalNavGroup.vue'
import VerticalNavSectionTitle from '@layouts/components/VerticalNavSectionTitle.vue'
</script>

<template>
  <!--  Dashboard -->
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'bx-home-smile',
      badgeContent: '5',
      badgeClass: 'bg-error',
      to: '/dashboard',
    }"
  />

  <!--  Gestion des utilisateurs -->
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

  <!--  Paramètres -->
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

  <!--  Engins -->
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
        title: 'Types d\'engin',
        icon: 'bx-cog',
        to: '/types-equipement',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'Statuts de l\'engin',
        icon: 'bx-check-circle',
        to: '/statuts-equipement',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'États de l\'engin',
        icon: 'bx-refresh',
        to: '/etats-equipement',
      }"
    />
    
  </VerticalNavGroup>

  <!--  Demandes & Approvisionnements -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Demandes & Approvisionnements',
    }"
  />

  <VerticalNavGroup
    :item="{
      title: 'Demandes',
      icon: 'bx-file',
    }"
  >

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