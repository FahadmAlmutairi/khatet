import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { useDocumentTitle } from '../../app/pageMeta.js'
import { LoadingState } from '../../components/ui/States.jsx'
import { DEMO_START, startDemo } from './demo.js'

// /demo opens the sample project with the guided tour; /demo?tour=off opens it without the tour.
export default function StartDemoPage() {
  useDocumentTitle('Live demo')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const tour = useSearchParams()[0].get('tour') !== 'off'

  useEffect(() => {
    startDemo(queryClient, { tour })
    navigate(DEMO_START, { replace: true })
  }, [queryClient, navigate, tour])

  return (
    <div className="min-h-dvh bg-surface px-6">
      <LoadingState label="Opening the sample project" />
    </div>
  )
}
