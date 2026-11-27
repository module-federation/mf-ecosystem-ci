import { createBridgeComponent } from '@module-federation/bridge-vue3';
import App from './App.vue';
import router from './router';

// The bridge rebuilds this router with the host-provided basename / memory history.
export default createBridgeComponent({
  rootComponent: App,
  appOptions: () => ({ router }),
});
