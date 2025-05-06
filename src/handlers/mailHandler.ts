import { z } from "zod";
// Remove runAppleScript import, use child_process instead
import type { LoadModuleFunction, ToolResult } from "./../types";
import fs from "fs/promises"; 
import path from "path"; 
import { exec } from 'child_process'; // Import exec
import { promisify } from 'util'; // Import promisify

const execAsync = promisify(exec); // Promisify exec

// Define the Zod schema for mail arguments
export const MailArgsSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("unread"), account: z.string().optional(), mailbox: z.string().optional(), limit: z.number().optional() }),
  z.object({ operation: z.literal("search"), searchTerm: z.string().min(1), account: z.string().optional(), mailbox: z.string().optional(), limit: z.number().optional() }),
  z.object({ operation: z.literal("send"), to: z.string(), subject: z.string(), body: z.string(), cc: z.string().optional(), bcc: z.string().optional() }),
  z.object({ operation: z.literal("mailboxes"), account: z.string().optional() }),
  z.object({ operation: z.literal("accounts") }),
]);

// Define the argument type from the schema
type MailArgs = z.infer<typeof MailArgsSchema>;

export async function handleMail(
  args: MailArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const mailModule = await loadModule('mail');

    switch (args.operation) {
      case "unread": {
        let emails;
        if (args.account) {
          console.error(`Getting unread emails for account: ${args.account}`);
          
          try {
            const scriptPath = path.resolve(__dirname, '../../scripts/getUnreadMail.applescript'); // Path to the script file
            
            // Prepare arguments for the script, ensuring proper shell quoting
            const scriptArgs = [args.account];
            if (args.mailbox) {
              scriptArgs.push(args.mailbox);
            }
            if (args.limit) {
              // Ensure limit is passed as a string if the script expects it that way
              scriptArgs.push(String(args.limit));
            }
            const quotedArgs = scriptArgs.map(arg => `'${String(arg).replace(/'/g, "'\\''")}'`).join(' '); // Quote args

            // Construct the osascript command
            const command = `osascript '${scriptPath.replace(/'/g, "'\\''")}' ${quotedArgs}`;
            console.error(`Executing command: ${command}`);

            // Execute the command using execAsync
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
              console.error(`AppleScript stderr: ${stderr}`);
              // Check if stdout also contains an error, prioritize stdout for AppleScript errors
              if (stdout && stdout.trim().startsWith('Error:')) {
                 throw new Error(stdout.trim());
              }
              // Optionally throw based on stderr if stdout is clean, but let's rely on stdout check first
            }
            
            const asResult = stdout.trim(); // Use stdout as the result
            if (asResult && asResult.startsWith('Error:')) {
              throw new Error(asResult);
            }
            
            const emailData = [];
            // Use regex on the stdout result
            const matches = asResult.match(/\{([^}]+)\}/g); 
            if (matches && matches.length > 0) {
              for (const match of matches) {
                try {
                  const props = match.substring(1, match.length - 1).split(',');
                  const email: any = {};
                  
                  props.forEach(prop => {
                    const parts = prop.split(':');
                    if (parts.length >= 2) {
                      const key = parts[0].trim();
                      const value = parts.slice(1).join(':').trim();
                      email[key] = value;
                    }
                  });
                  
                  if (email.subject || email.sender) {
                    emailData.push({
                      subject: email.subject || "No subject",
                      sender: email.sender || "Unknown sender",
                      dateSent: email.date || new Date().toString(),
                      content: email.content || "[Content not available]",
                      isRead: false,
                              // Use mailboxName from script result
                              mailbox: `${args.account} - ${email.mailboxName || "Unknown"}` 
                    });
                  }
                } catch (parseError) {
                  console.error('Error parsing email match:', parseError);
                }
              }
            }
            
            emails = emailData;
          } catch (error: any) { // Catch errors from execAsync or parsing
            console.error('Error executing or processing AppleScript:', error);
             // Check if the error object has stdout/stderr properties (from exec failure)
             if (error.stderr) {
               console.error(`Exec stderr: ${error.stderr}`);
             }
             if (error.stdout) {
                console.error(`Exec stdout: ${error.stdout}`);
                // If stdout contains the AppleScript error message, use that
                if (error.stdout.trim().startsWith('Error:')) {
                   // Re-throw the specific AppleScript error if found in stdout
                   throw new Error(error.stdout.trim()); 
                }
             }
            // Fallback if script execution failed
            console.error('Falling back to general unread mail fetch due to script error.');
            emails = await mailModule.getUnreadMails(args.limit); 
          }
        } else {
          emails = await mailModule.getUnreadMails(args.limit);
        }
        
        return {
          content: [{ 
            type: "text", 
            text: emails.length > 0 ? 
              `Found ${emails.length} unread email(s)${args.account ? ` in account "${args.account}"` : ''}${args.mailbox ? ` and mailbox "${args.mailbox}"` : ''}:\n\n` +
              emails.map((email: any) => 
                `[${email.dateSent}] From: ${email.sender}\nMailbox: ${email.mailbox}\nSubject: ${email.subject}\n${email.content.substring(0, 500)}${email.content.length > 500 ? '...' : ''}`
              ).join("\n\n") :
              `No unread emails found${args.account ? ` in account "${args.account}"` : ''}${args.mailbox ? ` and mailbox "${args.mailbox}"` : ''}`
          }],
          isError: false
        };
      }

      case "search": {
        const emails = await mailModule.searchMails(args.searchTerm, args.limit);
        return {
          content: [{ 
            type: "text", 
            text: emails.length > 0 ? 
              `Found ${emails.length} email(s) for "${args.searchTerm}"${args.account ? ` in account "${args.account}"` : ''}${args.mailbox ? ` and mailbox "${args.mailbox}"` : ''}:\n\n` +
              emails.map((email: any) => 
                `[${email.dateSent}] From: ${email.sender}\nMailbox: ${email.mailbox}\nSubject: ${email.subject}\n${email.content.substring(0, 200)}${email.content.length > 200 ? '...' : ''}`
              ).join("\n\n") :
              `No emails found for "${args.searchTerm}"${args.account ? ` in account "${args.account}"` : ''}${args.mailbox ? ` and mailbox "${args.mailbox}"` : ''}`
          }],
          isError: false
        };
      }

      case "send": {
        const result = await mailModule.sendMail(args.to, args.subject, args.body, args.cc, args.bcc);
        return {
          // Ensure result is a string, provide default if null/undefined
          content: [{ type: "text", text: result ?? "Mail operation completed." }], 
          isError: false
        };
      }

      case "mailboxes": {
        let mailboxes;
        if (args.account) {
          mailboxes = await mailModule.getMailboxesForAccount(args.account);
        } else {
          mailboxes = await mailModule.getMailboxes();
        }
        // Ensure mailboxes is an array before accessing properties
        const mailboxesArray = Array.isArray(mailboxes) ? mailboxes : [];
        return {
          content: [{ 
            type: "text", 
            text: mailboxesArray.length > 0 ? 
              `Found ${mailboxesArray.length} mailboxes${args.account ? ` for account "${args.account}"` : ''}:\n\n${mailboxesArray.join("\n")}` :
              `No mailboxes found${args.account ? ` for account "${args.account}"` : ''}.`
          }],
          isError: false
        };
      }

      case "accounts": {
        const accounts = await mailModule.getAccounts();
        // Ensure accounts is an array before accessing properties
        const accountsArray = Array.isArray(accounts) ? accounts : [];
        return {
          content: [{ 
            type: "text", 
            text: accountsArray.length > 0 ? 
              `Found ${accountsArray.length} email accounts:\n\n${accountsArray.join("\n")}` :
              "No email accounts found. Make sure Mail app is configured."
          }],
          isError: false
        };
      }

      default:
        // This should be unreachable due to Zod validation
        throw new Error(`Unknown mail operation: ${(args as any).operation}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error with mail operation: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}
