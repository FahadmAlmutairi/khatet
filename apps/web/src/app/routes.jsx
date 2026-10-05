import { Navigate } from 'react-router'
import AppShell from './AppShell.jsx'
import RouteError from './RouteError.jsx'
import SignInPage from '../routes/SignInPage.jsx'
import ProjectsPage from '../routes/ProjectsPage.jsx'
import BoardPage from '../routes/BoardPage.jsx'
import NotFoundPage from '../routes/NotFoundPage.jsx'

export const routes = [
  {
    path: '/sign-in',
    element: <SignInPage />,
    errorElement: <RouteError />,
  },
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId/board', element: <BoardPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
