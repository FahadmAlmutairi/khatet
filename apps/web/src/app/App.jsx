import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '../components/ui/Toast.jsx'
import { createQueryClient } from './queryClient.js'
import { routes } from './routes.jsx'

const router = createBrowserRouter(routes)

export default function App() {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
