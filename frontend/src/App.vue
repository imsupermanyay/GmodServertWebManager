<template>
  <div id="app" class="min-h-screen bg-gray-100">
    <router-view />
    <NotificationContainer />
  </div>
</template>

<script setup>
import NotificationContainer from './components/NotificationContainer.vue'
</script>
