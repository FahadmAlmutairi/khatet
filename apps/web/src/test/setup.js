import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { resetMockServer } from '../api/mockServer.js'

// jsdom has no <dialog> methods yet; this covers what the Dialog component uses.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeEach(() => {
  resetMockServer()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
})
