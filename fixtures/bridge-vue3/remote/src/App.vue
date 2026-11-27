<template>
  <div>
    <router-link to="/" data-testid="remote-home-link">Remote home</router-link> |
    <router-link to="/detail" data-testid="remote-detail-link">Remote detail</router-link>
    <p data-testid="remote-greeting">greeting: {{ greeting ?? 'none' }}</p>
    <router-view />
  </div>
</template>

<script setup lang="ts">
defineProps<{ greeting?: string }>();
</script>
