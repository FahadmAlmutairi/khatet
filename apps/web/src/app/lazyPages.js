import { lazy } from 'react'

// Project pages load on first visit, so the board's drag-and-drop code is not in the first download.
export const BoardPage = lazy(() => import('../features/board/BoardPage.jsx'))
export const MembersPage = lazy(() => import('../features/members/MembersPage.jsx'))
