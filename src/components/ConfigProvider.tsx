'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { fetchModelsClient, getDefaultModel, type Model } from '@/lib/models'

interface ConfigContextType {
  models: Model[]
  selectedModel: Model | null
  setSelectedModel: (model: Model) => void
  isLoadingModels: boolean
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModel, setSelectedModelState] = useState<Model | null>(null)
  const [isLoadingModels, setIsLoadingModels] = useState(true)

  // Fetch models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const response = await fetchModelsClient()
        setModels(response.models)

        // Use default model
        const defaultModel = getDefaultModel(response.models)
        setSelectedModelState(defaultModel)
      } catch (error) {
        console.error('Failed to load models:', error)
      } finally {
        setIsLoadingModels(false)
      }
    }

    loadModels()
  }, [])

  const setSelectedModel = (model: Model) => {
    setSelectedModelState(model)
  }

  return (
    <ConfigContext.Provider value={{
      models,
      selectedModel,
      setSelectedModel,
      isLoadingModels,
    }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}
