//@ts-nocheck
import React from 'react'
import { Widget, remoteValue } from 'remote/widget'

export function App() {
  return (
    <main>
      <h1 id="host-title">esbuild host</h1>
      <p id="remote-value">{remoteValue}</p>
      <React.Suspense fallback="loading remote">
        <Widget />
      </React.Suspense>
    </main>
  )
}
