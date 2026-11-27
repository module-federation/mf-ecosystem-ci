import React from 'react'

export function Counter() {
  const [count, setCount] = React.useState(0)
  return (
    <button id="provider-counter" type="button" onClick={() => setCount((c) => c + 1)}>
      clicked {count}
    </button>
  )
}
