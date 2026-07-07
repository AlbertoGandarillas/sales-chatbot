'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface SelectionContextValue {
  selectionMode: boolean
  selectedIds: Set<string>
  selectedCount: number
  enterSelectionMode: () => void
  exitSelectionMode: () => void
  toggleSelectionMode: () => void
  toggleId: (id: string) => void
  isSelected: (id: string) => boolean
  selectIds: (ids: string[]) => void
  clearSelection: () => void
}

const SelectionContext = createContext<SelectionContextValue | null>(null)

export function CatalogSelectionProvider({ children }: { children: ReactNode }) {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true)
    setSelectedIds(new Set())
  }, [])

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode()
    } else {
      enterSelectionMode()
    }
  }, [selectionMode, enterSelectionMode, exitSelectionMode])

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const selectIds = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const value = useMemo(
    () => ({
      selectionMode,
      selectedIds,
      selectedCount: selectedIds.size,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
      toggleId,
      isSelected,
      selectIds,
      clearSelection,
    }),
    [
      selectionMode,
      selectedIds,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
      toggleId,
      isSelected,
      selectIds,
      clearSelection,
    ]
  )

  return (
    <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
  )
}

export function useCatalogSelection() {
  const ctx = useContext(SelectionContext)
  if (!ctx) {
    throw new Error('useCatalogSelection debe usarse dentro de CatalogSelectionProvider')
  }
  return ctx
}
