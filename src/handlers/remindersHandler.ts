import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";

// Define the Zod schema for reminders arguments
export const RemindersArgsSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("list") }),
  z.object({ operation: z.literal("search"), searchText: z.string().min(1) }),
  z.object({ operation: z.literal("open"), searchText: z.string().min(1) }),
  z.object({ 
    operation: z.literal("create"), 
    name: z.string().min(1), 
    listName: z.string().optional(), 
    notes: z.string().optional(), 
    dueDate: z.string().datetime().optional() // Assuming ISO 8601 format
  }),
  z.object({ operation: z.literal("listById"), listId: z.string().min(1), props: z.array(z.string()).optional() }),
]);

// Define the argument type from the schema
type RemindersArgs = z.infer<typeof RemindersArgsSchema>;

export async function handleReminders(
  args: RemindersArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const remindersModule = await loadModule('reminders');

    switch (args.operation) {
      case "list": {
        const lists = await remindersModule.getAllLists();
        const allReminders = await remindersModule.getAllReminders();
        
        // Create a more detailed message that includes list names
        let detailedText = `Found ${lists.length} lists and ${allReminders.length} reminders.\n\n`;
        
        // Add list details if any lists exist
        if (lists.length > 0) {
          detailedText += "Available lists:\n";
          lists.forEach(list => {
            const remindersInList = allReminders.filter(r => r.listName === list.name).length;
            detailedText += `- ${list.name} (${remindersInList} reminders)\n`;
          });
        }
        
        return {
          content: [{
            type: "text",
            text: detailedText
          }],
          success: true,
          lists, // Include lists in the result
          reminders: allReminders, // Include reminders in the result
          isError: false
        };
      }
      
      case "search": {
        const results = await remindersModule.searchReminders(args.searchText);
        return {
          content: [{
            type: "text",
            text: results.length > 0 
              ? `Found ${results.length} reminders matching "${args.searchText}".` 
              : `No reminders found matching "${args.searchText}".`
          }],
          reminders: results, // Include results
          isError: false
        };
      } 
      
      case "open": {
        const result = await remindersModule.openReminder(args.searchText);
        return {
          content: [{
            type: "text",
            text: result.success 
              ? `Opened Reminders app. Found reminder: ${result.reminder?.name}` 
              : result.message
          }],
          ...result, // Spread the result object which contains success, message, reminder?
          isError: !result.success
        };
      } 
      
      case "create": {
        const result = await remindersModule.createReminder(args.name, args.listName, args.notes, args.dueDate);
        return {
          content: [{
            type: "text",
            text: `Created reminder "${result.name}" ${args.listName ? `in list "${args.listName}"` : ''}.`
          }],
          success: true, // Explicitly set success
          reminder: result, // Include the created reminder
          isError: false
        };
      }
      
      case "listById": {
        const results = await remindersModule.getRemindersFromListById(args.listId, args.props);
        return {
          content: [{
            type: "text",
            text: results.length > 0 
              ? `Found ${results.length} reminders in list with ID "${args.listId}".` 
              : `No reminders found in list with ID "${args.listId}".`
          }],
          reminders: results, // Include results
          isError: false
        };
      }

      default:
         // This should be unreachable due to Zod validation
        throw new Error(`Unknown reminders operation: ${(args as any).operation}`);
    }
  } catch (error) {
    console.error("Error in reminders tool:", error);
    return {
      content: [{
        type: "text",
        text: `Error in reminders tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
