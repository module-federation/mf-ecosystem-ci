import { createRemoteAppComponent } from '@module-federation/bridge-vue3';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { h } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';

const RemoteApp = createRemoteAppComponent({
  loader: () => loadRemote('remote3/export-app'),
  rootAttrs: { 'data-testid': 'remote-slot' },
});

const MemoryRemoteApp = createRemoteAppComponent({
  loader: () => loadRemote('remote3/export-app'),
  rootAttrs: { 'data-testid': 'memory-slot' },
  memoryRoute: { entryPath: '/detail' },
});

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    // `/:pathMatch(.*)*` makes the bridge derive basename `/remote` for the remote router.
    {
      path: '/remote/:pathMatch(.*)*',
      component: { render: () => h(RemoteApp, { greeting: 'hello from host' }) },
    },
    { path: '/memory/:pathMatch(.*)*', component: MemoryRemoteApp },
  ],
});
