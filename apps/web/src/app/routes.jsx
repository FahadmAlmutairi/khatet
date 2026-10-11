import { Navigate } from 'react-router'
import AppShell from './AppShell.jsx'
import { BoardPage, MembersPage } from './lazyPages.js'
import RouteError from './RouteError.jsx'
import ChooseUsernamePage from '../features/auth/ChooseUsernamePage.jsx'
import RequireAuth from '../features/auth/RequireAuth.jsx'
import SignInPage from '../features/auth/SignInPage.jsx'
import VerifyCodePage from '../features/auth/VerifyCodePage.jsx'
import ProjectLayout from '../features/projects/ProjectLayout.jsx'
import ProjectsPage from '../features/projects/ProjectsPage.jsx'
import NotFoundPage from '../routes/NotFoundPage.jsx'

export const routes = [
  { path: '/sign-in', element: <SignInPage />, errorElement: <RouteError /> },
  { path: '/sign-in/verify', element: <VerifyCodePage />, errorElement: <RouteError /> },
  { path: '/sign-in/username', element: <ChooseUsernamePage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/projects" replace /> },
          { path: 'projects', element: <ProjectsPage /> },
          {
            path: 'projects/:projectId',
            element: <ProjectLayout />,
            children: [
              { index: true, element: <Navigate to="board" replace /> },
              { path: 'board', element: <BoardPage /> },
              { path: 'members', element: <MembersPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
