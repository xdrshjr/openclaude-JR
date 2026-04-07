import type { ProviderProfileInput } from './providerProfiles.js'

type ConnectionTestResult =
  | { ok: true }
  | { ok: false; message: string }

type ValidateModelFn = (
  model: string,
) => Promise<{ valid: boolean; error?: string }>

async function defaultValidateModel(
  model: string,
): Promise<{ valid: boolean; error?: string }> {
  const { validateModel } = await import('./model/validateModel.js')
  return validateModel(model)
}

function trimValue(value: string | undefined): string {
  return value?.trim() ?? ''
}

function setOptionalEnvValue(key: string, value: string | undefined): void {
  const trimmed = trimValue(value)
  if (trimmed) {
    process.env[key] = trimmed
  } else {
    delete process.env[key]
  }
}

function applyProfileToProcessEnv(input: ProviderProfileInput): void {
  delete process.env.CLAUDE_CODE_USE_GEMINI
  delete process.env.CLAUDE_CODE_USE_GITHUB
  delete process.env.CLAUDE_CODE_USE_BEDROCK
  delete process.env.CLAUDE_CODE_USE_VERTEX
  delete process.env.CLAUDE_CODE_USE_FOUNDRY

  if (input.provider === 'anthropic') {
    delete process.env.CLAUDE_CODE_USE_OPENAI
    delete process.env.OPENAI_BASE_URL
    delete process.env.OPENAI_API_BASE
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_API_KEY

    process.env.ANTHROPIC_BASE_URL = trimValue(input.baseUrl)
    process.env.ANTHROPIC_MODEL = trimValue(input.model)
    setOptionalEnvValue('ANTHROPIC_API_KEY', input.apiKey)
    return
  }

  process.env.CLAUDE_CODE_USE_OPENAI = '1'
  process.env.OPENAI_BASE_URL = trimValue(input.baseUrl)
  process.env.OPENAI_MODEL = trimValue(input.model)
  setOptionalEnvValue('OPENAI_API_KEY', input.apiKey)

  delete process.env.ANTHROPIC_BASE_URL
  delete process.env.ANTHROPIC_MODEL
  delete process.env.ANTHROPIC_API_KEY
}

export async function testProviderProfileConnection(
  input: ProviderProfileInput,
  options?: {
    validateModel?: ValidateModelFn
  },
): Promise<ConnectionTestResult> {
  const baseUrl = trimValue(input.baseUrl)
  const model = trimValue(input.model)

  if (!baseUrl || !model) {
    return {
      ok: false,
      message: 'Base URL and model are required before testing the provider.',
    }
  }

  const previousEnv = { ...process.env }

  try {
    applyProfileToProcessEnv({
      ...input,
      baseUrl,
      model,
      apiKey: trimValue(input.apiKey),
    })

    const result = await (options?.validateModel ?? defaultValidateModel)(model)
    if (!result.valid) {
      return {
        ok: false,
        message: result.error ?? 'Provider test failed.',
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    }
  } finally {
    process.env = previousEnv
  }
}
