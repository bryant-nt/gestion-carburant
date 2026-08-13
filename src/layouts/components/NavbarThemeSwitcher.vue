<script setup>
const themes = [
{
    name: 'dark',
    icon: 'bx-moon',
  },
  {
    name: 'light',
    icon: 'bx-sun',
  },
  
]
</script>

<template>
  <ThemeSwitcher :themes="themes" />
</template>
