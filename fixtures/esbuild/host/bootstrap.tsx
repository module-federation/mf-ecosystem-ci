import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './app'

;(globalThis as any).__HOST_REACT__ = React
ReactDOM.render(<App />, document.getElementById('root'))
