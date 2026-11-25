import { Navigate } from 'react-router'
import AppShell from './AppShell.jsx'
import { ActivityPage, BoardPage, OverviewPage, MembersPage, ProjectSettingsPage, ReportPage, TimelinePage } from './lazyPages.js'
import RouteError from './RouteError.jsx'
import AccountSettingsPage from '../features/account/AccountSettingsPage.jsx'
import ArchivedProjectPage from '../features/archive/ArchivedProjectPage.jsx'
import ChooseUsernamePage from '../features/auth/ChooseUsernamePage.jsx'
import RequireAuth from '../features/auth/RequireAuth.jsx'
import SignInPage from '../features/auth/SignInPage.jsx'
import VerifyCodePage from '../features/auth/VerifyCodePage.jsx'
import StartDemoPage from '../features/demo/StartDemoPage.jsx'
import HomePage from '../features/landing/HomePage.jsx'
import ProjectLayout from '../features/projects/ProjectLayout.jsx'
import ProjectsPage from '../features/projects/ProjectsPage.jsx'
import NotFoundPage from '../routes/NotFoundPage.jsx'

export const routes = [
  // The landing page for visitors; signed-in people are sent on to their projects.
  { path: '/', element: <HomePage />, errorElement: <RouteError /> },
  // The live demo: the real app on sample data, with a guided tour (features/demo).
  { path: '/demo', element: <StartDemoPage />, errorElement: <RouteError /> },
  { path: '/sign-in', element: <SignInPage />, errorElement: <RouteError /> },
  { path: '/sign-in/verify', element: <VerifyCodePage />, errorElement: <RouteError /> },
  { path: '/sign-in/username', element: <ChooseUsernamePage />, errorElement: <RouteError /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'projects', element: <ProjectsPage /> },
          {
            path: 'projects/:projectId',
            element: <ProjectLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <OverviewPage /> },
              { path: 'board', element: <BoardPage /> },
              { path: 'timeline', element: <TimelinePage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'report', element: <ReportPage /> },
              { path: 'log', element: <ActivityPage /> },
              { path: 'settings', element: <ProjectSettingsPage /> },
            ],
          },
          { path: 'account', element: <AccountSettingsPage /> },
          { path: 'account/archived/:archivedId', element: <ArchivedProjectPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
