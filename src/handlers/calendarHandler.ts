import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";

// Define the Zod schema for calendar arguments
export const CalendarArgsSchema = z.discriminatedUnion("operation", [
  z.object({ 
    operation: z.literal("search"), 
    searchText: z.string().min(1), 
    limit: z.number().optional(), 
    fromDate: z.string().datetime().optional(), 
    toDate: z.string().datetime().optional() 
  }),
  z.object({ operation: z.literal("open"), eventId: z.string().min(1) }),
  z.object({ 
    operation: z.literal("list"), 
    limit: z.number().optional(), 
    fromDate: z.string().datetime().optional(), 
    toDate: z.string().datetime().optional() 
  }),
  z.object({ 
    operation: z.literal("create"), 
    title: z.string().min(1), 
    startDate: z.string().datetime(), 
    endDate: z.string().datetime(), 
    location: z.string().optional(), 
    notes: z.string().optional(), 
    isAllDay: z.boolean().optional(), 
    calendarName: z.string().optional() 
  }),
]);

// Define the argument type from the schema
type CalendarArgs = z.infer<typeof CalendarArgsSchema>;

export async function handleCalendar(
  args: CalendarArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const calendarModule = await loadModule("calendar");

    switch (args.operation) {
      case "search": {
        const events = await calendarModule.searchEvents(args.searchText, args.limit, args.fromDate, args.toDate);
        return {
          content: [{
            type: "text",
            text: events.length > 0 ? 
              `Found ${events.length} events matching "${args.searchText}":\n\n${events.map(event => 
                `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                `Location: ${event.location || 'Not specified'}\n` +
                `Calendar: ${event.calendarName}\n` +
                `ID: ${event.id}\n` +
                `${event.notes ? `Notes: ${event.notes}\n` : ''}`
              ).join("\n\n")}` : 
              `No events found matching "${args.searchText}".`
          }],
          isError: false
        };
      }
      
      case "open": {
        const result = await calendarModule.openEvent(args.eventId);
        return {
          content: [{
            type: "text",
            text: result.success ? 
              result.message : 
              `Error opening event: ${result.message}`
          }],
          isError: !result.success
        };
      }
      
      case "list": {
        const events = await calendarModule.getEvents(args.limit, args.fromDate, args.toDate);
        const startDateText = args.fromDate ? new Date(args.fromDate).toLocaleDateString() : 'today';
        const endDateText = args.toDate ? new Date(args.toDate).toLocaleDateString() : 'next 7 days';
        
        return {
          content: [{
            type: "text",
            text: events.length > 0 ? 
              `Found ${events.length} events from ${startDateText} to ${endDateText}:\n\n${events.map(event => 
                `${event.title} (${new Date(event.startDate!).toLocaleString()} - ${new Date(event.endDate!).toLocaleString()})\n` +
                `Location: ${event.location || 'Not specified'}\n` +
                `Calendar: ${event.calendarName}\n` +
                `ID: ${event.id}`
              ).join("\n\n")}` : 
              `No events found from ${startDateText} to ${endDateText}.`
          }],
          isError: false
        };
      }
      
      case "create": {
        const result = await calendarModule.createEvent(args.title, args.startDate, args.endDate, args.location, args.notes, args.isAllDay, args.calendarName);
        return {
          content: [{
            type: "text",
            text: result.success ? 
              `${result.message} Event scheduled from ${new Date(args.startDate).toLocaleString()} to ${new Date(args.endDate).toLocaleString()}${result.eventId ? `\nEvent ID: ${result.eventId}` : ''}` : 
              `Error creating event: ${result.message}`
          }],
          isError: !result.success
        };
      }
      
      default:
        // This should be unreachable due to Zod validation
        throw new Error(`Unknown calendar operation: ${(args as any).operation}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error in calendar tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
