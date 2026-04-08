/**
 * Types and utilities for fetching model data from the Doubleword API
 */

export interface ModelPricing {
  input: number   // price per token
  output: number  // price per token
}

export interface Model {
  id: string
  name: string
  displayName: string
  iconUrl?: string
  providerName?: string
  description?: string
  type: string
  capabilities: string[]
  pricing: {
    batch1h: ModelPricing | null   // 1 hour SLA batch
    batch24h: ModelPricing | null  // 24 hour SLA batch
    realtime: ModelPricing | null  // Real-time API
  }
}

export interface ModelsResponse {
  models: Model[]
  fetchedAt: string
}

const DEFAULT_MODEL_ID = 'Qwen/Qwen3-VL-235B-A22B-Instruct-FP8'
const DOUBLEWORD_API_URL = 'https://app.doubleword.ai/admin/api/v1/models'
function getInternalDocsBaseUrl(): string | null {
  const configuredBaseUrl =
    process.env.INTERNAL_DOCS_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  if (!configuredBaseUrl) return null
  if (!/^https?:\/\//.test(configuredBaseUrl)) return null

  return configuredBaseUrl.replace(/\/$/, '')
}

interface RawTariff {
  name: string
  input_price_per_token: string
  output_price_per_token: string
  api_key_purpose: string
  completion_window?: string
}

interface RawModel {
  model_name: string
  alias: string
  display_name?: string
  icon_url?: string
  description?: string
  model_type: string
  overwrite_type?: string
  provider_id?: string
  provider_slug?: string
  provider_name?: string
  provider_key?: string
  capabilities?: string[]
  tariffs?: RawTariff[]
  metadata?: {
    display_category?: string
    provider?: string
    provider_id?: string
    provider_slug?: string
    provider_name?: string
    provider_key?: string
  }
  provider?: {
    id?: string
    slug?: string
    key?: string
    name?: string
    display_name?: string
    icon_url?: string
  } | string
}
function formatModelType(type: string): string {
  const normalized = type.trim().toLowerCase()

  if (normalized.includes('ocr')) return 'OCR'
  if (normalized.includes('embed')) return 'Embedding'
  if (
    normalized.includes('generation') ||
    normalized.includes('chat') ||
    normalized.includes('completion') ||
    normalized.includes('text')
  ) {
    return 'Generation'
  }

  return type
}

function transformModels(
  rawModels: RawModel[],
): Model[] {
  return rawModels.map((m) => {
    const batch1hTariff = m.tariffs?.find(t => t.api_key_purpose === 'batch' && t.completion_window?.includes('1h'))
    const batch24hTariff = m.tariffs?.find(t => t.api_key_purpose === 'batch' && t.completion_window?.includes('24h'))
    const realtimeTariff = m.tariffs?.find(t => t.api_key_purpose === 'realtime')
    const providerObject =
      m.provider && typeof m.provider === 'object' ? m.provider : undefined

    return {
      id: m.alias || m.model_name,
      name: m.model_name,
      displayName: providerObject?.display_name || m.display_name || m.model_name,
      iconUrl: providerObject?.icon_url || m.icon_url,
      providerName: providerObject?.name || m.metadata?.provider || m.provider_name,
      description: m.description,
      type: formatModelType(m.metadata?.display_category || m.overwrite_type || m.model_type),
      capabilities: m.capabilities || [],
      pricing: {
        batch1h: batch1hTariff ? {
          input: parseFloat(batch1hTariff.input_price_per_token),
          output: parseFloat(batch1hTariff.output_price_per_token),
        } : null,
        batch24h: batch24hTariff ? {
          input: parseFloat(batch24hTariff.input_price_per_token),
          output: parseFloat(batch24hTariff.output_price_per_token),
        } : null,
        realtime: realtimeTariff ? {
          input: parseFloat(realtimeTariff.input_price_per_token),
          output: parseFloat(realtimeTariff.output_price_per_token),
        } : null,
      },
    }
  })
}

/**
 * Fetch models data server-side with caching
 * Used during SSR/SSG for templating
 */
export async function fetchModelsServer(): Promise<ModelsResponse> {
  const apiKey = process.env.DOUBLEWORD_SYSTEM_API_KEY

  if (!apiKey) {
    // No API key configured - return empty (can't cache non-existent data)
    console.warn('DOUBLEWORD_SYSTEM_API_KEY not set, returning empty models')
    return { models: [], fetchedAt: new Date().toISOString() }
  }

  // Throw on errors so ISR keeps serving stale cached data instead of caching empty results
  const response = await fetch(`${DOUBLEWORD_API_URL}?include=pricing&sort=released_at&sort_direction=desc&limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    next: {
      revalidate: 300, // 5 minutes
      tags: ['models'],
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const rawData = await response.json()
  const models = transformModels(rawData.data || [])

  return {
    models,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Fetch models data client-side
 * Used for dynamic updates and model selection
 */
export async function fetchModelsClient(): Promise<ModelsResponse> {
  try {
    const response = await fetch('/api/models')

    if (!response.ok) {
      console.error('Failed to fetch models:', response.status)
      return { models: [], fetchedAt: new Date().toISOString() }
    }

    const data = await response.json()

    return {
      models: data.models || [],
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error fetching models:', error)
    return { models: [], fetchedAt: new Date().toISOString() }
  }
}

/**
 * Fetch models via the app's internal API route so page generation and UI
 * consume the same response shape. Falls back to direct server fetch during
 * build/local environments where the route URL is not available.
 */
export async function fetchModelsFromApiRoute(): Promise<ModelsResponse> {
  const baseUrl = getInternalDocsBaseUrl()

  if (!baseUrl) {
    return fetchModelsServer()
  }

  try {
    const response = await fetch(`${baseUrl}/api/models`, {
      headers: {
        Accept: 'application/json',
      },
      next: {
        revalidate: 300,
        tags: ['models'],
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch internal models API: ${response.status}`)
    }

    const data = await response.json()
    return {
      models: data.models || [],
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.warn('Falling back to direct model fetch:', error)
    return fetchModelsServer()
  }
}

/**
 * Get the default model
 */
export function getDefaultModel(models: Model[]): Model | null {
  if (!Array.isArray(models) || models.length === 0) return null

  // Use the preferred default model
  const defaultModel = models.find(m => m.id === DEFAULT_MODEL_ID)

  return defaultModel || models[0]
}

export { DEFAULT_MODEL_ID }
