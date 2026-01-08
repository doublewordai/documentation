import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import ContentInjector from './ContentInjector'

// Mock the auth and config hooks
const mockUseAuth = vi.fn()
const mockUseConfig = vi.fn()

vi.mock('./AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./ConfigProvider', () => ({
  useConfig: () => mockUseConfig(),
}))

describe('ContentInjector', () => {
  beforeEach(() => {
    // Reset mocks
    mockUseAuth.mockReturnValue({ apiKey: null })
    mockUseConfig.mockReturnValue({ selectedModel: null })

    // Clear the document body
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('API key replacement', () => {
    it('should replace {{apiKey}} placeholder when apiKey is available', async () => {
      // Set up DOM with a code block containing placeholder
      document.body.innerHTML = `
        <pre><code>curl -H "Authorization: Bearer {{apiKey}}"</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'sk-test-123' })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      render(<ContentInjector />)

      // Wait for useEffect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('curl -H "Authorization: Bearer sk-test-123"')
    })

    it('should NOT replace placeholder when apiKey is null', async () => {
      document.body.innerHTML = `
        <pre><code>curl -H "Authorization: Bearer {{apiKey}}"</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('curl -H "Authorization: Bearer {{apiKey}}"')
    })

    it('should replace multiple {{apiKey}} placeholders', async () => {
      document.body.innerHTML = `
        <pre><code>KEY1={{apiKey}} KEY2={{apiKey}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'my-key' })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('KEY1=my-key KEY2=my-key')
    })
  })

  describe('Model replacement', () => {
    it('should replace {{selectedModel.id}} placeholder', async () => {
      document.body.innerHTML = `
        <pre><code>model: {{selectedModel.id}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'gpt-4',
          name: 'GPT-4',
          pricing: null,
        },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('model: gpt-4')
    })

    it('should replace {{selectedModel.name}} placeholder', async () => {
      document.body.innerHTML = `
        <pre><code>Using: {{selectedModel.name}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'gpt-4',
          name: 'GPT-4 Turbo',
          pricing: null,
        },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('Using: GPT-4 Turbo')
    })

    it('should use model.id as fallback for {{selectedModel.name}} when name is missing', async () => {
      document.body.innerHTML = `
        <pre><code>Using: {{selectedModel.name}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'gpt-4',
          name: null,
          pricing: null,
        },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('Using: gpt-4')
    })
  })

  describe('Combined replacements', () => {
    it('should replace both apiKey and model placeholders', async () => {
      document.body.innerHTML = `
        <pre><code>curl -H "Authorization: Bearer {{apiKey}}" -d '{"model": "{{selectedModel.id}}"}'</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'sk-test' })
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'claude-3',
          name: 'Claude 3',
          pricing: null,
        },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe(`curl -H "Authorization: Bearer sk-test" -d '{"model": "claude-3"}'`)
    })
  })

  describe('Original content preservation', () => {
    it('should preserve original content in data attribute', async () => {
      document.body.innerHTML = `
        <pre><code>API Key: {{apiKey}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'my-key' })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code') as HTMLElement
      expect(codeBlock?.dataset.originalContent).toBe('API Key: {{apiKey}}')
      expect(codeBlock?.innerHTML).toBe('API Key: my-key')
    })

    it('should restore placeholder when apiKey becomes null', async () => {
      document.body.innerHTML = `
        <pre><code>API Key: {{apiKey}}</code></pre>
      `

      // First render with apiKey
      mockUseAuth.mockReturnValue({ apiKey: 'my-key' })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      const { rerender } = render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('API Key: my-key')

      // Now render without apiKey
      mockUseAuth.mockReturnValue({ apiKey: null })

      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      codeBlock = document.querySelector('pre code')
      // Should restore original with placeholder since apiKey is null
      expect(codeBlock?.innerHTML).toBe('API Key: {{apiKey}}')
    })
  })

  describe('Late DOM insertion (MutationObserver)', () => {
    it('should handle code blocks added to DOM after initial render via MutationObserver', async () => {
      // Start with no code blocks
      document.body.innerHTML = '<div id="content"></div>'

      mockUseAuth.mockReturnValue({ apiKey: 'my-key' })
      mockUseConfig.mockReturnValue({
        selectedModel: { id: 'gpt-4', name: 'GPT-4', pricing: null },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // No code blocks yet, nothing to replace
      expect(document.querySelectorAll('pre code').length).toBe(0)

      // Simulate markdown rendering - code blocks appear in DOM
      // MutationObserver should detect this and process
      await act(async () => {
        document.getElementById('content')!.innerHTML = `
          <pre><code>key={{apiKey}} model={{selectedModel.id}}</code></pre>
        `
        // Wait for MutationObserver callback and requestAnimationFrame
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('key=my-key model=gpt-4')
    })

    it('should process nested code blocks added dynamically', async () => {
      document.body.innerHTML = '<div id="root"></div>'

      mockUseAuth.mockReturnValue({ apiKey: 'test-key' })
      mockUseConfig.mockReturnValue({
        selectedModel: { id: 'claude-3', name: 'Claude 3', pricing: null },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Add a deeply nested code block
      await act(async () => {
        document.getElementById('root')!.innerHTML = `
          <article>
            <section>
              <div class="code-wrapper">
                <pre><code>model={{selectedModel.id}}</code></pre>
              </div>
            </section>
          </article>
        `
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('model=claude-3')
    })
  })

  describe('Async model loading flow', () => {
    it('should replace selectedModel placeholder when model loads after initial render', async () => {
      document.body.innerHTML = `
        <pre><code>model: {{selectedModel.id}}</code></pre>
      `

      // Initial state: no model yet (simulating async fetch)
      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      const { rerender } = render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Placeholder should still be there
      let codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('model: {{selectedModel.id}}')

      // Simulate model loading complete (like ConfigProvider async fetch)
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'gpt-4',
          name: 'GPT-4',
          pricing: null,
        },
      })

      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Should now be replaced
      codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('model: gpt-4')
    })

    it('should handle both apiKey and model loading at different times', async () => {
      document.body.innerHTML = `
        <pre><code>key={{apiKey}} model={{selectedModel.id}}</code></pre>
      `

      // Both start as null
      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      const { rerender } = render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      let codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('key={{apiKey}} model={{selectedModel.id}}')

      // Model loads first
      mockUseConfig.mockReturnValue({
        selectedModel: { id: 'claude-3', name: 'Claude 3', pricing: null },
      })
      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('key={{apiKey}} model=claude-3')

      // Then apiKey loads
      mockUseAuth.mockReturnValue({ apiKey: 'sk-test' })
      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('key=sk-test model=claude-3')
    })
  })

  describe('Auth flow simulation', () => {
    it('should replace placeholder when apiKey changes from null to value', async () => {
      document.body.innerHTML = `
        <pre><code>Key: {{apiKey}}</code></pre>
      `

      // Start with no apiKey (simulating loading state)
      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      const { rerender } = render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Verify placeholder is still there
      let codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('Key: {{apiKey}}')

      // Now simulate user clicking "Generate API Key" - apiKey becomes available
      mockUseAuth.mockReturnValue({ apiKey: 'newly-obtained-key' })

      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Should now be replaced
      codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('Key: newly-obtained-key')
    })

    it('should replace placeholder when Generate API Key is clicked (with existing code blocks)', async () => {
      // Code blocks exist from the start
      document.body.innerHTML = `
        <pre><code>curl -H "Authorization: Bearer {{apiKey}}" https://api.example.com</code></pre>
      `

      // User is not logged in, no API key
      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({
        selectedModel: { id: 'test-model', name: 'Test Model', pricing: null }
      })

      const { rerender } = render(<ContentInjector />)

      // Wait for initial processing
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Placeholder should still be there
      let codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toContain('{{apiKey}}')

      // User clicks "Generate API Key" - this triggers setApiKey in AuthProvider
      mockUseAuth.mockReturnValue({ apiKey: 'sk-generated-12345' })

      // Rerender to simulate React state update
      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      // Should now be replaced with the generated key
      codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('curl -H "Authorization: Bearer sk-generated-12345" https://api.example.com')
    })

    it('should handle rapid apiKey changes', async () => {
      document.body.innerHTML = `
        <pre><code>Key: {{apiKey}}</code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      const { rerender } = render(<ContentInjector />)

      // Rapid changes
      mockUseAuth.mockReturnValue({ apiKey: 'key-1' })
      rerender(<ContentInjector />)

      mockUseAuth.mockReturnValue({ apiKey: 'key-2' })
      rerender(<ContentInjector />)

      mockUseAuth.mockReturnValue({ apiKey: 'key-3' })
      rerender(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toBe('Key: key-3')
      // Original should still be preserved
      expect((codeBlock as HTMLElement)?.dataset.originalContent).toBe('Key: {{apiKey}}')
    })
  })

  describe('Syntax-highlighted code blocks (Shiki)', () => {
    it('should replace {{apiKey}} when split across syntax-highlighted spans', async () => {
      // This is how Shiki renders {{apiKey}} - split across multiple spans with different colors
      document.body.innerHTML = `
        <pre><code><span style="color:#98C379">"</span><span style="color:#D19A66">{{</span><span style="color:#98C379">apiKey</span><span style="color:#D19A66">}}</span><span style="color:#98C379">"</span></code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'sk-test-highlighted' })
      mockUseConfig.mockReturnValue({ selectedModel: null })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      // Should replace the {{...}} spans with a single span containing the API key
      expect(codeBlock?.innerHTML).toContain('sk-test-highlighted')
      expect(codeBlock?.innerHTML).not.toContain('{{')
      expect(codeBlock?.innerHTML).not.toContain('}}')
    })

    it('should replace {{selectedModel.id}} when syntax-highlighted', async () => {
      // Shiki may render this with the placeholder text split across spans
      document.body.innerHTML = `
        <pre><code><span style="color:#D19A66">{{</span><span style="color:#98C379">selectedModel</span><span style="color:#ABB2BF">.</span><span style="color:#98C379">id</span><span style="color:#D19A66">}}</span></code></pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: null })
      mockUseConfig.mockReturnValue({
        selectedModel: { id: 'claude-3-opus', name: 'Claude 3 Opus', pricing: null },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const codeBlock = document.querySelector('pre code')
      expect(codeBlock?.innerHTML).toContain('claude-3-opus')
      expect(codeBlock?.innerHTML).not.toContain('{{')
    })
  })

  describe('Multiple code blocks', () => {
    it('should process multiple code blocks', async () => {
      document.body.innerHTML = `
        <pre><code>Block 1: {{apiKey}}</code></pre>
        <pre><code>Block 2: {{selectedModel.id}}</code></pre>
        <pre>Block 3: {{apiKey}} and {{selectedModel.name}}</pre>
      `

      mockUseAuth.mockReturnValue({ apiKey: 'key-123' })
      mockUseConfig.mockReturnValue({
        selectedModel: {
          id: 'model-1',
          name: 'Model One',
          pricing: null,
        },
      })

      render(<ContentInjector />)

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Check the code elements inside pre
      const codeBlocks = document.querySelectorAll('pre code')
      expect(codeBlocks[0]?.innerHTML).toBe('Block 1: key-123')
      expect(codeBlocks[1]?.innerHTML).toBe('Block 2: model-1')

      // Check the pre without code child
      const preWithoutCode = document.querySelectorAll('pre:not(:has(code))')
      expect(preWithoutCode[0]?.innerHTML).toBe('Block 3: key-123 and Model One')
    })
  })
})
