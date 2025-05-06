// Type map for module names to their types
export type ModuleMap = {
  contacts: typeof import('../utils/contacts').default;
  notes: typeof import('../utils/notes').default;
  message: typeof import('../utils/message').default;
  mail: typeof import('../utils/mail').default;
  reminders: typeof import('../utils/reminders').default;
  webSearch: typeof import('../utils/webSearch').default;
  calendar: typeof import('../utils/calendar').default;
  maps: typeof import('../utils/maps').default;
};

// Type for the module loading function
export type LoadModuleFunction = <T extends keyof ModuleMap>(moduleName: T) => Promise<ModuleMap[T]>;

// Generic type for tool handler results
export interface ToolResult {
  content: { type: string; text: string }[];
  isError: boolean;
  [key: string]: any; // Allow for additional properties like lists, reminders, etc.
}
