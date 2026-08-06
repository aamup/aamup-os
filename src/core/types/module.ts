export type ModuleState = 'online' | 'demo' | 'planned'

export interface AamupModule {
  id: string
  label: string
  shortLabel: string
  state: ModuleState
  description: string
}
