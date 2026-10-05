import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './routes.jsx'

function renderAt(path) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('routes', () => {
  it('shows the sign-in page', async () => {
    renderAt('/sign-in')
    expect(await screen.findByRole('heading', { name: 'Sign in to Khatet' })).toBeInTheDocument()
  })

  it('redirects the home address to the project list', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'My projects' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects')
  })

  it('shows the board for a project', async () => {
    renderAt('/projects/demo/board')
    expect(await screen.findByRole('heading', { name: 'Board' })).toBeInTheDocument()
    expect(screen.getByText('demo')).toBeInTheDocument()
  })

  it('shows a not-found page for an unknown address', async () => {
    renderAt('/nowhere')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
