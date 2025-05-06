import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";

// Define the Zod schema for messages arguments
export const MessagesArgsSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("send"), phoneNumber: z.string(), message: z.string() }),
  z.object({ operation: z.literal("read"), phoneNumber: z.string(), limit: z.number().optional() }),
  z.object({ operation: z.literal("schedule"), phoneNumber: z.string(), message: z.string(), scheduledTime: z.string().datetime() }), // Assuming ISO 8601 format
  z.object({ operation: z.literal("unread"), limit: z.number().optional() }),
]);

// Define the argument type from the schema
type MessagesArgs = z.infer<typeof MessagesArgsSchema>;

export async function handleMessages(
  args: MessagesArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const messageModule = await loadModule('message');

    switch (args.operation) {
      case "send": {
        await messageModule.sendMessage(args.phoneNumber, args.message);
        return {
          content: [{ type: "text", text: `Message sent to ${args.phoneNumber}` }],
          isError: false
        };
      }

      case "read": {
        const messages = await messageModule.readMessages(args.phoneNumber, args.limit);
        return {
          content: [{ 
            type: "text", 
            text: messages.length > 0 ? 
              messages.map(msg => 
                `[${new Date(msg.date).toLocaleString()}] ${msg.is_from_me ? 'Me' : msg.sender}: ${msg.content}`
              ).join("\n") :
              "No messages found"
          }],
          isError: false
        };
      }

      case "schedule": {
        const scheduledMsg = await messageModule.scheduleMessage(
          args.phoneNumber,
          args.message,
          new Date(args.scheduledTime)
        );
        return {
          content: [{ 
            type: "text", 
            text: `Message scheduled to be sent to ${args.phoneNumber} at ${scheduledMsg.scheduledTime}` 
          }],
          isError: false
        };
      }

      case "unread": {
        const messages = await messageModule.getUnreadMessages(args.limit);
        
        // Look up contact names for all messages
        const contactsModule = await loadModule('contacts'); // Need contacts module here
        const messagesWithNames = await Promise.all(
          messages.map(async msg => {
            // Only look up names for messages not from me
            if (!msg.is_from_me) {
              const contactName = await contactsModule.findContactByPhone(msg.sender);
              return {
                ...msg,
                displayName: contactName || msg.sender // Use contact name if found, otherwise use phone/email
              };
            }
            return {
              ...msg,
              displayName: 'Me'
            };
          })
        );

        return {
          content: [{ 
            type: "text", 
            text: messagesWithNames.length > 0 ? 
              `Found ${messagesWithNames.length} unread message(s):\n` +
              messagesWithNames.map(msg => 
                `[${new Date(msg.date).toLocaleString()}] From ${msg.displayName}:\n${msg.content}`
              ).join("\n\n") :
              "No unread messages found"
          }],
          isError: false
        };
      }

      default:
        // This should be unreachable due to Zod validation
        throw new Error(`Unknown messages operation: ${(args as any).operation}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error with messages operation: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
