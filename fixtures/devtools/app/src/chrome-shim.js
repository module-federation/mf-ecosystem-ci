// `@module-federation/devtools` is the panel UI of the Chrome extension. Embedded in a
// plain page it needs the extension APIs it calls; this shim makes the "inspected tab"
// the current page, so the panel reads this page's real `window.__FEDERATION__`.
const events = () => {
  const listeners = new Set();
  return {
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    hasListener: (fn) => listeners.has(fn),
  };
};

const storageArea = () => {
  const data = {};
  return {
    get(keys, callback) {
      const list = keys == null ? Object.keys(data) : [].concat(keys);
      const result = Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
      callback?.(result);
      return Promise.resolve(result);
    },
    set(items, callback) {
      Object.assign(data, items);
      callback?.();
      return Promise.resolve();
    },
    remove(keys, callback) {
      for (const k of [].concat(keys)) delete data[k];
      callback?.();
      return Promise.resolve();
    },
    onChanged: events(),
  };
};

const tab = { id: 1, windowId: 1, index: 0, active: true, title: 'MF devtools fixture', url: location.href };
const calls = (window.__CHROME_SHIM_CALLS__ = []);

window.chrome = {
  runtime: {
    id: 'mf-devtools-fixture',
    onMessage: events(),
    onInstalled: events(),
    sendMessage: async () => undefined,
    getURL: (file) => `${location.origin}/__extension__/${file}`,
    getManifest: () => ({ manifest_version: 3, version: '0.0.0' }),
  },
  tabs: {
    query: async () => [tab],
    get: async () => tab,
    onActivated: events(),
    onUpdated: events(),
    onRemoved: events(),
  },
  storage: { sync: storageArea(), local: storageArea(), onChanged: events() },
  scripting: {
    executeScript: async ({ func, args = [] }) => {
      calls.push(func.name);
      return [{ result: await func(...args) }];
    },
  },
};
