import { useState } from 'react'
import { AvatarStack } from '../../components/Avatar.jsx'
import SegmentedControl from '../../components/ui/SegmentedControl.jsx'
import StatusIcon from '../../components/StatusIcon.jsx'

// The three task access levels, tried on one member (omar). Each level changes which of the
// tasks below omar can change, with the reason written out, not shown by colour alone.

const LEVELS = [
  ['VIEW_ONLY', 'View tasks only'],
  ['EDIT_ASSIGNED', 'Edit assigned tasks'],
  ['EDIT_ALL', 'Edit all tasks'],
]

const SUMMARY = {
  VIEW_ONLY: 'omar sees every task and uses chat, but cannot change tasks.',
  EDIT_ASSIGNED: 'omar edits and moves the tasks assigned to omar. This is the default for new members.',
  EDIT_ALL: 'omar creates, edits and moves any task, and can change who is assigned.',
}

const TASKS = [
  { title: 'Book the usability lab', people: ['omar'], status: 'IN_PROGRESS', mine: true },
  { title: 'Prototype the board', people: ['fahad', 'sara'], status: 'READY_FOR_REVIEW', mine: false },
  { title: 'Write the survey questions', people: ['lina'], status: 'TODO', mine: false },
]

function canEdit(level, task) {
  if (level === 'EDIT_ALL') return true
  if (level === 'EDIT_ASSIGNED') return task.mine
  return false
}

export default function AccessShowcase() {
  const [level, setLevel] = useState('EDIT_ASSIGNED')

  return (
    <div className="rounded-[22px] border border-line bg-white p-4 shadow-[0_24px_48px_-28px_rgba(20,40,25,0.25)] sm:p-6">
      <div className="flex items-center gap-3">
        <AvatarStack users={[{ id: 'omar', username: 'omar' }]} />
        <div>
          <p className="text-sm font-semibold text-heading">omar</p>
          <p className="text-xs text-muted">Team member</p>
        </div>
      </div>
      <p className="mt-5 text-sm font-medium text-heading">
        Task access for omar
      </p>
      <SegmentedControl label="Task access for omar" options={LEVELS} value={level} onChange={setLevel} className="mt-2 max-sm:w-full max-sm:flex-col max-sm:rounded-[22px]" />
      <p className="mt-3 min-h-10 text-sm text-muted" aria-live="polite">
        {SUMMARY[level]}
      </p>
      <ul className="mt-4 flex flex-col gap-2" aria-label="What omar can do">
        {TASKS.map((task) => {
          const editable = canEdit(level, task)
          return (
            <li key={task.title} className="flex items-center gap-3 rounded-[12px] border border-line px-3 py-2.5">
              <StatusIcon status={task.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-body">{task.title}</p>
                <p className="truncate text-xs text-muted">Assigned to {task.people.join(', ')}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
                  editable ? 'bg-priority-low-bg text-priority-low-text' : 'bg-surface text-muted'
                }`}
              >
                {editable ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M7.5 2.5 9.5 4.5 4.5 9.5H2.5V7.5l5-5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <rect x="2.5" y="5.5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )}
                {editable ? 'Can edit' : 'View only'}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[14px] bg-surface p-3">
        <span className="text-xs font-medium text-muted">Invite by username</span>
        <span className="inline-flex h-9 items-center rounded-[9px] border border-input bg-white px-3 text-sm text-body">noura</span>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#fff1cc] px-2.5 text-xs font-medium text-[#7a5310]">
          <StatusIcon status="READY_FOR_REVIEW" />
          Invitation sent, waiting for noura to accept
        </span>
      </div>
    </div>
  )
}
