import React from 'react'

export function Widget() {
  // A hook inside a remote component only works when host and remote share one React.
  const [status, setStatus] = React.useState('pending')
  React.useEffect(() => setStatus('hooks work'), [])
  const sameReact = (globalThis as any).__HOST_REACT__ === React
  return (
    <section id="remote-widget">
      <h2>Remote widget</h2>
      <p id="remote-hooks">{status}</p>
      <p id="remote-react">{sameReact ? 'react singleton' : 'react duplicated'}</p>
      <p id="remote-react-version">{React.version}</p>
    </section>
  )
}

export const remoteValue = 'exported from the esbuild remote'
