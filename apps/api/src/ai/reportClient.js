// Sends a project summary to the OpenAI API and returns the report text (TF-14).
// Settings: OPENAI_API_KEY (required) and OPENAI_MODEL (optional), in .env locally
// and on Render's Environment page. Never commit the key.
import OpenAI from 'openai'
import { ApiError } from '../lib/errors.js'
import { REPORT_INSTRUCTIONS, buildReportInput } from './reportPrompt.js'

export const AI_TIMEOUT_MS = 30_000 // A-05: the report must come back within 30 seconds
export const DEFAULT_MODEL = 'gpt-6-luna'

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(503, 'AI_NOT_CONFIGURED', 'The AI report is not set up on this server yet.')
  }
  // No automatic retries: the user gets an error and a retry button instead (NFR-17).
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: AI_TIMEOUT_MS, maxRetries: 0 })
}

export async function generateReport(summary, options = {}) {
  const client = options.client ?? createOpenAIClient()
  // || (not ??) so an empty OPENAI_MODEL= line in .env also falls back to the default.
  const model = options.model || process.env.OPENAI_MODEL || DEFAULT_MODEL
  const started = Date.now()

  let response
  try {
    response = await client.responses.create({
      model,
      instructions: REPORT_INSTRUCTIONS,
      input: buildReportInput(summary),
      max_output_tokens: 2000,
    })
  } catch (error) {
    throw toApiError(error)
  }

  const text = response.output_text?.trim()
  if (!text) throw new ApiError(502, 'AI_EMPTY_REPORT', 'The AI service returned an empty report. Try again.')

  return {
    text,
    model: response.model ?? model,
    durationMs: Date.now() - started,
    usage: {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  }
}

// Turns OpenAI failures into Khatet's error shape. The original error stays in `cause` for the logs.
function toApiError(error) {
  let apiError
  if (error instanceof OpenAI.APIConnectionTimeoutError || error?.name === 'APIConnectionTimeoutError') {
    apiError = new ApiError(504, 'AI_TIMEOUT', 'The AI report took too long. Try again.')
  } else if (error?.code === 'insufficient_quota') {
    apiError = new ApiError(503, 'AI_QUOTA', 'The AI report is unavailable right now (usage limit reached).')
  } else if (error?.status === 429) {
    apiError = new ApiError(429, 'AI_BUSY', 'The AI service is busy. Wait a moment and try again.')
  } else if (error?.status === 401) {
    apiError = new ApiError(503, 'AI_NOT_CONFIGURED', 'The AI report is not set up correctly on this server.')
  } else {
    apiError = new ApiError(502, 'AI_FAILED', 'The AI report could not be created. Try again.')
  }
  apiError.cause = error
  return apiError
}
