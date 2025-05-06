import { z } from "zod";
import type { ModuleMap, LoadModuleFunction } from "./../types"; // Adjusted path

// Define the Zod schema for contacts arguments again here or import from index.ts/shared location
export const ContactsArgsSchema = z.object({
  name: z.string().optional(),
});

// Define the argument type from the schema
type ContactsArgs = z.infer<typeof ContactsArgsSchema>;

export async function handleContacts(
  args: ContactsArgs,
  loadModule: LoadModuleFunction
) {
  try {
    const contactsModule = await loadModule('contacts');

    if (args.name) {
      const numbers = await contactsModule.findNumber(args.name);
      return {
        content: [{
          type: "text",
          text: numbers.length ?
            `${args.name}: ${numbers.join(", ")}` :
            `No contact found for "${args.name}". Try a different name or use no name parameter to list all contacts.`
        }],
        isError: false
      };
    } else {
      const allNumbers = await contactsModule.getAllNumbers();
      const contactCount = Object.keys(allNumbers).length;

      if (contactCount === 0) {
        return {
          content: [{
            type: "text",
            text: "No contacts found in the address book. Please make sure you have granted access to Contacts."
          }],
          isError: false
        };
      }

      // Explicitly type 'phones' as string[]
      const formattedContacts = Object.entries(allNumbers)
        .filter(([_, phones]) => (phones as string[]).length > 0) 
        .map(([name, phones]) => `${name}: ${(phones as string[]).join(", ")}`);

      return {
        content: [{
          type: "text",
          text: formattedContacts.length > 0 ?
            `Found ${contactCount} contacts:\n\n${formattedContacts.join("\n")}` :
            "Found contacts but none have phone numbers. Try searching by name to see more details."
        }],
        isError: false
      };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error accessing contacts: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
