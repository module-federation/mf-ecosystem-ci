const { withFederation } = require('@module-federation/esbuild/build')

module.exports = withFederation({
  name: 'host',
  filename: './host/remoteEntry.js',
  remotes: {
    remote: 'http://localhost:4401/remoteEntry.js',
  },
  shared: {
    react: { singleton: true, version: '^18.2.0' },
    'react-dom': { singleton: true, version: '^18.2.0' },
  },
})
