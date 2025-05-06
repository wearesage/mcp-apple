import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";

// Define the Zod schema for notes arguments
export const NotesArgsSchema = z.discriminatedUnion("operation", [
  // Add folderName to search and list
  z.object({ operation: z.literal("search"), searchText: z.string().min(1), folderName: z.string().optional() }),
  z.object({ operation: z.literal("list"), folderName: z.string().optional() }),
  z.object({ 
    operation: z.literal("create"), 
    title: z.string().min(1), 
    body: z.string(),
    folderName: z.string().min(1).optional(), // Keep optional for create (defaults to 'Claude')
  }),
  z.object({ operation: z.literal("listFolders") }), // Add listFolders operation
  z.object({ operation: z.literal("createFolder"), folderName: z.string().min(1) }), // Add createFolder operation
]);

// Define the argument type from the schema
type NotesArgs = z.infer<typeof NotesArgsSchema>;

export async function handleNotes(
  args: NotesArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const notesModule = await loadModule('notes');

    switch (args.operation) {
      case "search": {
        // Pass folderName to findNote
        const foundNotes = await notesModule.findNote(args.searchText, args.folderName); 
        const folderText = args.folderName ? ` in folder "${args.folderName}"` : '';
        return {
          content: [{
            type: "text",
            text: foundNotes.length ?
              // Include folder name in output
              foundNotes.map(note => `Folder: ${note.folderName}\nName: ${note.name}\n${note.content}`).join("\n\n---\n\n") : 
              `No notes found for "${args.searchText}"${folderText}`
          }],
          isError: false
        };
      }

      case "list": {
        // Pass folderName to getAllNotes
        const notesInFolder = await notesModule.getAllNotes(args.folderName); 
        const folderText = args.folderName ? ` in folder "${args.folderName}"` : '';
        return {
          content: [{
            type: "text",
            text: notesInFolder.length ?
              // Include folder name in output
              notesInFolder.map((note) => `Folder: ${note.folderName}\nName: ${note.name}\n${note.content}`) 
              .join("\n\n---\n\n") : 
              `No notes exist${folderText}.`
          }],
          isError: false
        };
      }

      case "create": {
        const result = await notesModule.createNote(args.title, args.body, args.folderName);
        // Use the folderName from the result object which indicates the actual folder used
        const createdFolderName = result.folderName || 'Unknown'; 
        return {
          content: [{
            type: "text",
            text: result.success ?
              `Created note "${args.title}" in folder "${createdFolderName}"${result.usedDefaultFolder ? ' (created new folder)' : ''}.` :
              `Failed to create note: ${result.message}`
          }],
          isError: !result.success
        };
      }
       
       case "listFolders": {
         // Expecting FolderDetails[] now
         const folderDetails = await notesModule.listFolders(); 
         return {
           content: [{
             type: "text",
             text: folderDetails.length > 0 ? 
               `Available folders:\n${folderDetails.map(f => `- Name: ${f.name}\n  Container: ${f.containerName}\n  ID: ${f.id}`).join('\n\n')}` :
               "No folders found."
           }],
           isError: false
          };
        }
  
        case "createFolder": {
         // folderName is guaranteed by Zod schema for this operation
         const result = await notesModule.createFolder(args.folderName);
         return {
           content: [{
             type: "text",
             text: result.success ?
               `Successfully created folder "${args.folderName}".` :
               `Failed to create folder "${args.folderName}": ${result.message}`
           }],
           isError: !result.success
         };
       }
         
       default:
         // This should be unreachable due to Zod validation
        throw new Error(`Unknown notes operation: ${(args as any).operation}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error accessing notes: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
