#!/usr/bin/env bun
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import tools from "./tools";
import type { ModuleMap, LoadModuleFunction } from "./src/types"; // Updated path

// Import handlers and schemas
import { handleContacts, ContactsArgsSchema } from "./src/handlers/contactsHandler";
import { handleNotes, NotesArgsSchema } from "./src/handlers/notesHandler";
import { handleMessages, MessagesArgsSchema } from "./src/handlers/messagesHandler";
import { handleMail, MailArgsSchema } from "./src/handlers/mailHandler";
import { handleReminders, RemindersArgsSchema } from "./src/handlers/remindersHandler";
import { handleWebSearch, WebSearchArgsSchema } from "./src/handlers/webSearchHandler";
import { handleCalendar, CalendarArgsSchema } from "./src/handlers/calendarHandler";
import { handleMaps, MapsArgsSchema } from "./src/handlers/mapsHandler";


// Module loading is now always lazy
let safeModeFallback = true; // Keep this for console message consistency, or remove if message is updated

console.error("Starting apple-mcp server (lazy loading mode)...");

// Placeholders for modules - will either be loaded eagerly or lazily
let contacts: typeof import('./utils/contacts').default | null = null;
let notes: typeof import('./utils/notes').default | null = null;
let message: typeof import('./utils/message').default | null = null;
let mail: typeof import('./utils/mail').default | null = null;
let reminders: typeof import('./utils/reminders').default | null = null;
let webSearch: typeof import('./utils/webSearch').default | null = null;
let calendar: typeof import('./utils/calendar').default | null = null;
let maps: ModuleMap['maps'] | null = null; // Use imported ModuleMap

// Helper function for lazy module loading (Type already imported)
// Add the generic type parameter back here
const loadModule: LoadModuleFunction = async <T extends keyof ModuleMap>(moduleName: T): Promise<ModuleMap[T]> => {
   // Always lazy load now
   console.error(`Loading ${moduleName} module on demand...`);
  
  try {
    switch (moduleName) {
      case 'contacts':
        if (!contacts) contacts = (await import('./utils/contacts')).default;
        return contacts as ModuleMap[T];
      case 'notes':
        if (!notes) notes = (await import('./utils/notes')).default;
        return notes as ModuleMap[T];
      case 'message':
        if (!message) message = (await import('./utils/message')).default;
        return message as ModuleMap[T];
      case 'mail':
        if (!mail) mail = (await import('./utils/mail')).default;
        return mail as ModuleMap[T];
      case 'reminders':
        if (!reminders) reminders = (await import('./utils/reminders')).default;
        return reminders as ModuleMap[T];
      case 'webSearch':
        if (!webSearch) webSearch = (await import('./utils/webSearch')).default;
        return webSearch as ModuleMap[T];
      case 'calendar':
        if (!calendar) calendar = (await import('./utils/calendar')).default;
        return calendar as ModuleMap[T];
      case 'maps':
        if (!maps) maps = (await import('./utils/maps')).default;
        return maps as ModuleMap[T];
      default:
        throw new Error(`Unknown module: ${moduleName}`);
    }
  } catch (e) {
    console.error(`Error loading module ${moduleName}:`, e);
    throw e;
  }
}


// Main server object
let server: Server;

// Initialize server directly (always lazy loading now)
initServer();

// Initialize the server and set up handlers
function initServer() {
  console.error(`Initializing server in ${safeModeFallback ? 'safe' : 'standard'} mode...`);
  
  server = new Server(
    {
      name: "Apple MCP tools",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("No arguments provided");
      }

      // Refactored switch statement using imported handlers
      switch (name) {
        case "contacts": {
          const validatedArgs = ContactsArgsSchema.parse(args);
          return await handleContacts(validatedArgs, loadModule);
        }
        case "notes": {
          const validatedArgs = NotesArgsSchema.parse(args);
          return await handleNotes(validatedArgs, loadModule);
        }
        case "messages": {
          const validatedArgs = MessagesArgsSchema.parse(args);
          return await handleMessages(validatedArgs, loadModule);
        }
        case "mail": {
          const validatedArgs = MailArgsSchema.parse(args);
          return await handleMail(validatedArgs, loadModule);
        }
        case "reminders": {
          const validatedArgs = RemindersArgsSchema.parse(args);
          return await handleReminders(validatedArgs, loadModule);
        }
        case "webSearch": {
          const validatedArgs = WebSearchArgsSchema.parse(args);
          return await handleWebSearch(validatedArgs, loadModule);
        }
        case "calendar": {
          const validatedArgs = CalendarArgsSchema.parse(args);
          return await handleCalendar(validatedArgs, loadModule);
        }
        case "maps": {
          const validatedArgs = MapsArgsSchema.parse(args);
          return await handleMaps(validatedArgs, loadModule);
        }
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error: any) {
      // Handle Zod validation errors specifically
      if (error instanceof z.ZodError) {
        return {
          content: [{ type: "text", text: `Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` }],
          isError: true,
        };
      }
      // Handle other errors
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server transport
  console.error("Setting up MCP server transport...");

  (async () => {
    try {
      console.error("Initializing transport...");
      const transport = new StdioServerTransport();

      // Ensure stdout is only used for JSON messages
      console.error("Setting up stdout filter...");
      const originalStdoutWrite = process.stdout.write.bind(process.stdout);
      process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
        // Only allow JSON messages to pass through
        if (typeof chunk === "string" && !chunk.startsWith("{")) {
          console.error("Filtering non-JSON stdout message");
          return true; // Silently skip non-JSON messages
        }
        return originalStdoutWrite(chunk, encoding, callback);
      };

      console.error("Connecting transport to server...");
      await server.connect(transport);
      console.error("Server connected successfully!");
    } catch (error) {
      console.error("Failed to initialize MCP server:", error);
      process.exit(1);
    }
  })();
}

// Helper functions for argument type checking (REMOVED)
