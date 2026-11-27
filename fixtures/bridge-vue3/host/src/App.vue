<template>
  <div>
    <h1>Bridge Vue3 host</h1>
    <nav>
      <router-link to="/" data-testid="host-home-link">Host home</router-link> |
      <router-link to="/remote" data-testid="host-remote-link">Remote</router-link> |
      <router-link to="/remote/detail" data-testid="host-remote-detail-link">Remote detail</router-link> |
      <router-link to="/memory" data-testid="host-memory-link">Memory route</router-link> |
      <button type="button" data-testid="host-popstate-button" @click="goRemoteHome">
        pushState + dispatchPopstateEnv
      </button>
    </nav>
    <p>host route: <span data-testid="host-route">{{ route.fullPath }}</span></p>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { dispatchPopstateEnv } from '@module-federation/bridge-shared';
import { useRoute } from 'vue-router';

const route = useRoute();

// Change the URL outside of any router, then use bridge-shared's helper to let both the
// host router and the bridged remote router pick it up.
function goRemoteHome() {
  window.history.pushState(null, '', '/remote');
  dispatchPopstateEnv();
}
</script>
