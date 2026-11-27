const { withFederation } = require('@module-federation/esbuild/build')

module.exports = withFederation({
  name: 'remote',
  filename: './remote/remoteEntry.js',
  exposes: {
    './widget': './remote/widget',
  },
  shared: {
    react: { singleton: true, version: '^18.2.0' },
    'react-dom': { singleton: true, version: '^18.2.0' },
  },
})
