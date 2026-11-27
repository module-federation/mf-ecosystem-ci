import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from '@rstest/core'
import App from '../src/App'

it('renders and interacts with components from an HTTP remote and a local CommonJS remote', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Federated shop' })).toBeTruthy()
  // catalog/ProductPanel comes over HTTP; profile/ProfileCard from remote/dist/local.
  expect(screen.getByRole('heading', { name: 'Remote catalog' })).toBeTruthy()
  expect(screen.getByText('Ada Lovelace')).toBeTruthy()
  expect(screen.getByText('Member since 1843')).toBeTruthy()

  // useState inside the remote only works when react is a shared singleton.
  fireEvent.click(screen.getByRole('button', { name: 'Add item (0)' }))
  expect(screen.getByRole('button', { name: 'Add item (1)' })).toBeTruthy()
})
