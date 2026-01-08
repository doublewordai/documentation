import { NextResponse } from 'next/server'

const DOUBLEWORD_API_URL = 'https://app.doubleword.ai/admin/api/v1/models'
const SYSTEM_API_KEY = process.env.DOUBLEWORD_SYSTEM_API_KEY

export const revalidate = 300 // Cache for 5 minutes

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

export async function GET() {
  if (!SYSTEM_API_KEY) {
    console.error('DOUBLEWORD_SYSTEM_API_KEY is not set')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(`${DOUBLEWORD_API_URL}?include=pricing`, {
      headers: {
        'Authorization': `Bearer ${SYSTEM_API_KEY}`,
        'Accept': 'application/json',
      },
      next: {
        revalidate: 300, // 5 minutes
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch models:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch models' },
        { status: response.status }
      )
    }

    const rawData = await response.json()
    const rawModels: RawModel[] = rawData.data || []

    // Transform to cleaner format
    const models = rawModels.map((m) => {
      // Get batch 24h pricing (preferred) or first available
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

    return NextResponse.json({ models }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
