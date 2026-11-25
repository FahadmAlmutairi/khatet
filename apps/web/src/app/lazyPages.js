import { lazy } from 'react'

// Project pages load on first visit, so the board's drag-and-drop code is not in the first download.
export const OverviewPage = lazy(() => import('../features/overview/OverviewPage.jsx'))
export const BoardPage = lazy(() => import('../features/board/BoardPage.jsx'))
export const MembersPage = lazy(() => import('../features/members/MembersPage.jsx'))
export const ReportPage = lazy(() => import('../features/report/ReportPage.jsx'))
export const ActivityPage = lazy(() => import('../features/activity/ActivityPage.jsx'))
export const ProjectSettingsPage = lazy(() => import('../features/projects/ProjectSettingsPage.jsx'))

// The public landing page loads only for visitors who are not signed in. main.jsx starts the
// download early when the page opens at /, so it arrives while the session is being checked.
export const loadLandingPage = () => import('../features/landing/LandingPage.jsx')
export const LandingPage = lazy(loadLandingPage)
