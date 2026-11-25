import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { failNextCall, getTasks, resetMockServer } from '../../../api/mockServer.js'
import { ApiError } from '../../../api/errors.js'
import { renderApp } from '../../../test/renderApp.jsx'

const csvFile = (text, name = 'tasks.csv', type = 'text/csv') => new File([text], name, { type })

const CSV = 'Task,Stage,Colour,Assigned to\nWrite the README,Done,Green,saad\nCheck the footer,,Blue,\nPlan the demo,Later,Red,ghost\n'

async function openImport(user) {
  renderApp('/projects/p-khatet/board')
  await user.click(await screen.findByRole('button', { name: 'Import tasks' }))
  return screen.findByRole('dialog', { name: 'Upload a CSV file' })
}

async function upload(user, dialog, file = csvFile(CSV)) {
  await user.upload(within(dialog).getByLabelText(/CSV file/), file)
  await user.click(within(dialog).getByRole('button', { name: 'Next: match columns' }))
}

describe('US-33: import tasks, upload and column mapping', () => {
  beforeEach(() => resetMockServer({ signedInAs: 'u-fahad' }))

  it('shows Import tasks to the owner only', async () => {
    resetMockServer({ signedInAs: 'u-saad' })
    renderApp('/projects/p-khatet/board')
    expect(await screen.findByRole('button', { name: 'Add task' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import tasks' })).not.toBeInTheDocument()
  })

  it('checks the file before sending it', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const dialog = await openImport(user)
    expect(within(dialog).getByRole('list', { name: 'Import steps' })).toHaveTextContent('Step 1 of 4: Upload')

    await user.click(within(dialog).getByRole('button', { name: 'Next: match columns' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a CSV file.')

    await upload(user, dialog, csvFile('a,b', 'tasks.xlsx', 'application/vnd.ms-excel'))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Choose a file that ends in .csv.')

    await upload(user, dialog, csvFile('x'.repeat(1_000_001)))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The file is too large. Keep it under 1 MB.')
    expect(within(dialog).getByLabelText(/CSV file/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows what is wrong with the file, from the server', async () => {
    const user = userEvent.setup()
    const dialog = await openImport(user)
    await upload(user, dialog, csvFile('Title\n'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The file has a header line but no rows.')
  })

  it('suggests a field for each column and moves to the preview', async () => {
    const user = userEvent.setup()
    const before = (await getTasks('p-khatet')).length
    const dialog = await openImport(user)
    await upload(user, dialog)

    const heading = await within(dialog).findByRole('heading', { name: 'Match the columns' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(within(dialog).getByText(/has 4 columns and 3 rows/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Task')).toHaveValue('title')
    expect(within(dialog).getByLabelText('Stage')).toHaveValue('status')
    expect(within(dialog).getByLabelText('Colour')).toHaveValue('')
    expect(within(dialog).getByLabelText('Assigned to')).toHaveValue('assignees')
    expect(within(dialog).getByText('For example: Green')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Next: check rows' }))
    expect(await within(dialog).findByRole('heading', { name: 'Check the rows' })).toBeInTheDocument()
    expect(within(dialog).getByText(/2 of 3 rows are ready to import\. 1 row has problems/)).toBeInTheDocument()
    // Nothing is created before Confirm.
    expect((await getTasks('p-khatet')).length).toBe(before)
  })

  it('needs a title column and allows each field once', async () => {
    const user = userEvent.setup()
    const dialog = await openImport(user)
    await upload(user, dialog)
    const stage = await within(dialog).findByLabelText('Stage')

    await user.selectOptions(stage, 'title')
    expect(within(dialog).getByText('Title is already filled by “Task”. Choose another field or Ignore.')).toBeInTheDocument()
    expect(stage).toHaveAttribute('aria-invalid', 'true')

    await user.selectOptions(stage, '')
    await user.selectOptions(within(dialog).getByLabelText('Task'), '')
    await user.click(within(dialog).getByRole('button', { name: 'Next: check rows' }))
    const summary = within(dialog).getByRole('alert')
    expect(summary).toHaveTextContent('Choose the column that holds the task title.')
    await waitFor(() => expect(summary).toHaveFocus())
    expect(within(dialog).queryByRole('heading', { name: 'Check the rows' })).not.toBeInTheDocument()
  })

  it('keeps the file and the matches when going back', async () => {
    const user = userEvent.setup()
    const dialog = await openImport(user)
    await upload(user, dialog)
    await user.selectOptions(await within(dialog).findByLabelText('Colour'), 'description')
    await user.click(within(dialog).getByRole('button', { name: 'Back' }))

    expect(await within(dialog).findByText(/Using/)).toHaveTextContent('Using tasks.csv.')
    await user.click(within(dialog).getByRole('button', { name: 'Next: match columns' }))
    expect(await within(dialog).findByLabelText('Colour')).toHaveValue('description')
  })

  it('shows a failed check and lets the owner try again', async () => {
    const user = userEvent.setup()
    const dialog = await openImport(user)
    await upload(user, dialog)
    await within(dialog).findByRole('heading', { name: 'Match the columns' })
    failNextCall('previewImport', new ApiError({ code: 'NETWORK', message: 'Khatet could not be reached. Check your connection.' }))
    await user.click(within(dialog).getByRole('button', { name: 'Next: check rows' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Khatet could not be reached.')
    await user.click(within(dialog).getByRole('button', { name: 'Next: check rows' }))
    expect(await within(dialog).findByRole('heading', { name: 'Check the rows' })).toBeInTheDocument()
  })

  it('closes from the first step without saving anything', async () => {
    const user = userEvent.setup()
    const dialog = await openImport(user)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Upload a CSV file' })).not.toBeInTheDocument())
  })
})
