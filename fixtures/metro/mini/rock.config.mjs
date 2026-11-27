// @ts-check
import {pluginMetroModuleFederation} from '@module-federation/metro-plugin-rock';
import {platformAndroid} from '@rock-js/platform-android';
import {pluginMetro} from '@rock-js/plugin-metro';

/** @type {import('rock').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    android: platformAndroid(),
  },
  plugins: [pluginMetroModuleFederation()],
};
