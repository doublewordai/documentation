'use client'

import { useState, useEffect } from 'react'
import { useConfig } from './ConfigProvider'

export default function ModelSelector() {
  const { models, selectedModel, setSelectedModel, isLoadingModels } = useConfig()
  const [showDropdown, setShowDropdown] = useState(false)
  const [hasModelPlaceholders, setHasModelPlaceholders] = useState(false)

  useEffect(() => {
    const placeholders = ['{{selectedModel', 'DEFAULT_MODEL']

    // Check if page has model placeholders in code blocks
    const checkForPlaceholders = () => {
      const codeBlocks = document.querySelectorAll('pre code, pre')

      let foundPlaceholder = false
      codeBlocks.forEach((block) => {
        // Check both textContent and data-original-content (preserved by ContentInjector)
        const content = block.textContent || ''
        const originalContent = (block as HTMLElement).dataset?.originalContent || ''
        if (placeholders.some(p => content.includes(p) || originalContent.includes(p))) {
          foundPlaceholder = true
        }
      })

      if (foundPlaceholder && !hasModelPlaceholders) {
        setHasModelPlaceholders(true)
      }
    }

    // Check immediately
    checkForPlaceholders()

    // Also observe for dynamically added code blocks (client-side navigation)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.matches('pre, pre code') || node.querySelector('pre, pre code')) {
                checkForPlaceholders()
                return
              }
            }
          }
        }
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [hasModelPlaceholders])

  // Don't show if no model placeholders on page
  if (!hasModelPlaceholders) {
    return null
  }

  if (isLoadingModels) {
    return (
      <div
        className="flex items-center gap-2 py-1 text-sm 2xl:text-base"
        style={{ color: 'var(--text-muted)' }}
      >
        <ModelIcon />
        <span>Loading models...</span>
      </div>
    )
  }

  if (models.length === 0) {
    return null
  }

  // Get display name for model (truncate if too long)
  const getDisplayName = (model: typeof selectedModel) => {
    if (!model) return 'Select model'
    const name = model.name || model.id
    // Extract just the model name part (after the last /)
    const shortName = name.split('/').pop() || name
    // Truncate if still too long
    return shortName.length > 24 ? shortName.slice(0, 22) + '...' : shortName
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 py-1 transition-all duration-200 hover:translate-x-0.5 text-sm 2xl:text-base w-full"
        style={{ color: 'var(--link-color)' }}
      >
        <ModelIcon />
        <span className="truncate">{getDisplayName(selectedModel)}</span>
        <ChevronIcon className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-lg z-50"
            style={{
              backgroundColor: 'var(--sidebar-bg)',
              border: '1px solid var(--sidebar-border)',
            }}
          >
            <div
              className="px-3 py-2 text-xs font-medium tracking-wide uppercase sticky top-0"
              style={{
                color: 'var(--text-muted)',
                backgroundColor: 'var(--sidebar-bg)',
                borderBottom: '1px solid var(--sidebar-border)',
              }}
            >
              Select Model
            </div>
            {models.map((model) => {
              const isSelected = selectedModel?.id === model.id
              const pricing = model.pricing?.batch24h || model.pricing?.batch1h || model.pricing?.realtime

              return (
                <button
                  key={model.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedModel(model)
                    setShowDropdown(false)
                  }}
                  className="w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--code-bg)] flex flex-col gap-0.5"
                  style={{
                    backgroundColor: isSelected ? 'var(--code-bg)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {model.name || model.id}
                    </span>
                    {isSelected && (
                      <CheckIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--link-color)' }} />
                    )}
                  </div>
                  {pricing && (
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ${(pricing.input * 1_000_000).toFixed(2)} / ${(pricing.output * 1_000_000).toFixed(2)} per 1M tokens
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function ModelIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}

function ChevronIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  )
}
