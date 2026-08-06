<script setup>
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
</script>

<template>
  <!-- 👉 Dashboard -->
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'bx-home-smile',
      badgeContent: '5',
      badgeClass: 'bg-error',
      
      to: '/dashboard',
    }"
  />

  <!-- 👉 Apps & Pagessss -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Apps & Pages',
    }"
  />

  <VerticalNavLink
  :item="{
    title: 'Utilisateurs',
    icon: 'bx-user',
    to: '/users',
  }"
/>

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
      icon: 'bx-shield',
      to: '/permissions',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Stations',
      icon: 'bx-gas-pump',
      to: '/stations',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Types carburant',
      icon: 'bx-droplet',
      to: '/types-carburant',
    }"
  />

  

  <VerticalNavLink
    :item="{
      title: 'Types équipement',
      icon: 'bx-cog',
      to: '/types-equipement',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Statuts équipement',
      icon: 'bx-check-circle',
      to: '/statuts-equipement',
    }"
  />

   <VerticalNavLink
    :item="{
      title: 'États équipement',
      icon: 'bx-refresh',
      to: '/etats-equipement',
    }"
  />

  <VerticalNavLink
    :item="{
      title: 'Unités',
      icon: 'bx-building',
      to: '/unites',
    }"
  />

   <VerticalNavLink
    :item="{
      title: 'Seuils carburant',
      icon: 'bx-line-chart',
      to: '/seuils-carburant',
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
      title: 'Error',
      icon: 'bx-info-circle',
      to: '/no-existence',
    }"
  />

  <!-- 👉 Forms & Tables -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Forms & Tables',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Form Layouts',
      icon: 'bx-layout',
      to: '/form-layouts',
    }"
  />
  
  
  <VerticalNavLink
    :item="{
      title: 'Tables',
      icon: 'bx-table',
      to: '/tables',
    }"
  />
</template>