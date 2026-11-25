// US-33: the CSV parser and the row rules, without the database.
import { describe, expect, it } from 'vitest'
import { parseCsv } from '../src/imports/csv.js'
import { checkMapping, readRow, readTable, suggestMapping, MAX_ROWS } from '../src/imports/importRows.js'

describe('US-33: parseCsv', () => {
  it('reads plain rows', () => {
    expect(parseCsv('Title,Status\nWrite report,Done\n').rows).toEqual([
      ['Title', 'Status'],
      ['Write report', 'Done'],
    ])
  })

  it('reads quoted cells with commas, doubled quotes and line breaks', () => {
    const { rows, unclosed } = parseCsv('Title,Description\r\n"Fix login, again","Says ""wrong code""\non phones"\r\n')
    expect(unclosed).toBe(false)
    expect(rows).toEqual([
      ['Title', 'Description'],
      ['Fix login, again', 'Says "wrong code"\non phones'],
    ])
  })

  it('drops a byte order mark and keeps empty cells', () => {
    expect(parseCsv('﻿Title,Due\nA,\n,2026-12-01').rows).toEqual([
      ['Title', 'Due'],
      ['A', ''],
      ['', '2026-12-01'],
    ])
  })

  it('uses semicolons when the header line has more of them than commas', () => {
    const { rows, separator } = parseCsv('Title;Notes\nPlan sprint;Ask Saud, then Fahad\n')
    expect(separator).toBe(';')
    expect(rows[1]).toEqual(['Plan sprint', 'Ask Saud, then Fahad'])
  })

  it('reports a quote that is never closed', () => {
    expect(parseCsv('Title\n"Open quote\n').unclosed).toBe(true)
  })
})

describe('US-33: readTable', () => {
  const table = (text) => readTable(parseCsv(text), text)

  it('names the columns from the header and skips empty lines', () => {
    const result = table('Title,,Status\nA,x,Done\n,,\n\nB,y,To do\n')
    expect(result.errors).toEqual([])
    expect(result.columns).toEqual(['Title', 'Column 2', 'Status'])
    expect(result.rows.map((row) => row.line)).toEqual([2, 5])
  })

  it('explains what is wrong with the file as a whole', () => {
    expect(table('').errors).toEqual(['Choose a CSV file with a header line and at least one row.'])
    expect(table('Title\n').errors).toEqual(['The file has a header line but no rows.'])
    expect(table(',,\nA,B,C\n').errors).toEqual(['The first line must name the columns.'])
    expect(table('Title\n"Open').errors[0]).toMatch(/never closed/)
    expect(table(`Title\n${'Task\n'.repeat(MAX_ROWS + 1)}`).errors[0]).toMatch(/Import at most 500/)
    expect(table(`Title\n${'x'.repeat(1_000_001)}`).errors[0]).toMatch(/too large/)
  })
})

describe('US-33: suggestMapping and checkMapping', () => {
  it('suggests a field from common header names, each field once', () => {
    expect(suggestMapping(['Task name', 'Notes', 'Stage', 'Due date', 'Assigned to', 'Title', 'Colour'])).toEqual([
      'title',
      'description',
      'status',
      'dueDate',
      'assignees',
      null,
      null,
    ])
  })

  it('needs one choice per column, a title, and no field twice', () => {
    const columns = ['A', 'B']
    expect(checkMapping(['title', null], columns)).toBeNull()
    expect(checkMapping(['title'], columns)).toMatch(/every column/)
    expect(checkMapping(['title', 'colour'], columns)).toMatch(/every column/)
    expect(checkMapping('title', columns)).toMatch(/every column/)
    expect(checkMapping([null, 'status'], columns)).toBe('Choose the column that holds the task title.')
    expect(checkMapping(['title', 'title'], columns)).toBe('Only one column can fill Title.')
  })
})

describe('US-33: readRow', () => {
  const importer = { id: 'owner-id', username: 'owner_user' }
  const members = new Map([
    ['owner_user', importer],
    ['sara', { id: 'sara-id', username: 'Sara' }],
  ])
  const mapping = ['title', 'description', 'status', 'priority', 'dueDate', 'assignees']
  const read = (cells) => readRow({ line: 2, cells }, mapping, { members, importer })

  it('reads a valid row and turns words into values', () => {
    const { values, errors } = read(['  Plan sprint ', 'Notes', 'in progress', 'High', '2026/12/1', '@sara; SARA'])
    expect(errors).toEqual([])
    expect(values).toEqual({
      title: 'Plan sprint',
      description: 'Notes',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '2026-12-01',
      assignees: ['Sara'],
      assigneeIds: ['sara-id'],
    })
  })

  it('uses To Do, no priority, no date and the importer when cells are empty', () => {
    const { values, errors } = read(['Only a title', '', '', '', '', ''])
    expect(errors).toEqual([])
    expect(values).toMatchObject({ status: 'TODO', priority: null, dueDate: null, assignees: ['owner_user'], assigneeIds: ['owner-id'] })
  })

  it('accepts the status names the board uses', () => {
    const status = (word) => read(['T', '', word, '', '', '']).values.status
    expect(['Backlog', 'To Do', 'Doing', 'Ready for Review', 'DONE', 'READY_FOR_REVIEW'].map(status)).toEqual([
      'BACKLOG',
      'TODO',
      'IN_PROGRESS',
      'READY_FOR_REVIEW',
      'DONE',
      'READY_FOR_REVIEW',
    ])
  })

  it('lists every problem in a row, by field', () => {
    const { errors } = read(['', '', 'Later', 'Urgent', '2026-02-30', 'sara, nobody, ghost'])
    expect(errors).toEqual([
      { field: 'title', message: 'The title is empty.' },
      { field: 'status', message: expect.stringContaining('“Later” is not a status') },
      { field: 'priority', message: expect.stringContaining('“Urgent” is not a priority') },
      { field: 'dueDate', message: expect.stringContaining('“2026-02-30” is not a date') },
      { field: 'assignees', message: 'nobody, ghost are not members of this project.' },
    ])
  })

  it('limits the title and description length', () => {
    const { errors } = read(['x'.repeat(201), 'y'.repeat(5001), '', '', '', ''])
    expect(errors.map((error) => error.field)).toEqual(['title', 'description'])
  })

  it('reads only the mapped columns', () => {
    const row = readRow({ line: 3, cells: ['ignored', 'Real title'] }, [null, 'title'], { members, importer })
    expect(row).toMatchObject({ line: 3, values: { title: 'Real title', description: '' }, errors: [] })
  })
})
