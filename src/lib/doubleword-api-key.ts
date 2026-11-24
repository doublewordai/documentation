/**
 * The docs site's Doubleword API key: a catalogue-reader service key that reads
 * public models, their prices and the API specs.
 *
 * Read from DOUBLEWORD_API_KEY. DOUBLEWORD_SYSTEM_API_KEY is the old name, read
 * only while deployments still set it.
 */
export function doublewordApiKey(): string | undefined {
  return process.env.DOUBLEWORD_API_KEY || process.env.DOUBLEWORD_SYSTEM_API_KEY || undefined
}
