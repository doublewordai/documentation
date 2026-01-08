/**
 * Types and utilities for fetching model data from the Doubleword API
 */

export interface ModelPricing {
  input: number   // price per token
  output: number  // price per token
  window?: string // for batch: "24h", "1h"
}

export interface Model {
  id: string
  name: string
  description?: string
  type: string
  capabilities: string[]
  pricing: {
    batch: ModelPricing | null
    realtime: ModelPricing | null
  }
}

export interface ModelsResponse {
  models: Model[]
  fetchedAt: string
}

const DEFAULT_MODEL_ID = 'Qwen/Qwen3-VL-235B-A22B-Instruct-FP8'

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
  description?: string
  model_type: string
  capabilities?: string[]
  tariffs?: RawTariff[]
}

function transformModels(rawModels: RawModel[]): Model[] {
  return rawModels.map((m) => {
    const batchTariff = m.tariffs?.find(t => t.api_key_purpose === 'batch' && t.completion_window === '24h')
      || m.tariffs?.find(t => t.api_key_purpose === 'batch')
    const realtimeTariff = m.tariffs?.find(t => t.api_key_purpose === 'realtime')

    return {
      id: m.alias || m.model_name,
      name: m.model_name,
      description: m.description,
      type: m.model_type,
      capabilities: m.capabilities || [],
      pricing: {
        batch: batchTariff ? {
          input: parseFloat(batchTariff.input_price_per_token),
          output: parseFloat(batchTariff.output_price_per_token),
          window: batchTariff.completion_window,
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
    console.warn('DOUBLEWORD_SYSTEM_API_KEY not set, returning empty models')
    return { models: [], fetchedAt: new Date().toISOString() }
  }

  try {
    const response = await fetch('https://app.doubleword.ai/admin/api/v1/models?include=pricing', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
      next: {
        revalidate: 300, // 5 minutes
        tags: ['models'],
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch models:', response.status)
      return { models: [], fetchedAt: new Date().toISOString() }
    }

    const rawData = await response.json()
    const models = transformModels(rawData.data || [])

    return {
      models,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error fetching models:', error)
    return { models: [], fetchedAt: new Date().toISOString() }
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
 * Get the default model
 */
export function getDefaultModel(models: Model[]): Model | null {
  if (!Array.isArray(models) || models.length === 0) return null

  // Use the preferred default model
  const defaultModel = models.find(m => m.id === DEFAULT_MODEL_ID)

  return defaultModel || models[0]
}

export { DEFAULT_MODEL_ID }
