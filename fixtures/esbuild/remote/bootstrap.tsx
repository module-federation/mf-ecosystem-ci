import React from 'react'
import ReactDOM from 'react-dom'
import { Widget } from './widget'

;(globalThis as any).__HOST_REACT__ = React
ReactDOM.render(<Widget />, document.getElementById('root'))
