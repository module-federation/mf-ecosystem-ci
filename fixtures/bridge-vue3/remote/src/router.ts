import { createRouter, createWebHistory } from 'vue-router';
import Detail from './pages/Detail.vue';
import Home from './pages/Home.vue';

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/detail', component: Detail },
  ],
});
