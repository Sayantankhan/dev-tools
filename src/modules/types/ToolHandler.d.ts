export interface ToolHandler {
  state: Record<string, any>;
  setters: Record<string, (...args: any[]) => void>;
  helpers: Record<string, (...args: any[]) => any>;
  actions: Record<string, (...args: any[]) => any>;
}
