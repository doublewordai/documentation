import { NextResponse } from 'next/server'
import { fetchModelsServer } from '@/lib/models'

export const revalidate = 300

export async function GET() {
  try {
    const { models } = await fetchModelsServer()

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
