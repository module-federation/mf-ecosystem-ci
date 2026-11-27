// @ts-check
import {pluginMetroModuleFederation} from '@module-federation/metro-plugin-rnef';
import {platformAndroid} from '@rnef/platform-android';
import {pluginMetro} from '@rnef/plugin-metro';

/** @type {import('@rnef/config').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    android: platformAndroid(),
  },
  plugins: [pluginMetroModuleFederation()],
};
