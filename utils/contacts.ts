import { run } from '@jxa/run';
import { runAppleScript } from 'run-applescript';
// Removed unused import: import { CallToolResponse } from '@modelcontextprotocol/sdk/types.js';

// Define the argument type for the contacts tool (though not used in this file anymore)
interface ContactsArgs { 
  name?: string;
}

async function checkContactsAccess(): Promise<boolean> {
    try {
        // Try to get the count of contacts as a simple test
        await runAppleScript(`
tell application "Contacts"
    count every person
end tell`);
        return true;
    } catch (error) {
        throw new Error("Cannot access Contacts app. Please grant access in System Preferences > Security & Privacy > Privacy > Contacts.");
    }
}

async function getAllNumbers() {
    try {
        if (!await checkContactsAccess()) {
            return {};
        }

        const nums: { [key: string]: string[] } = await run(() => {
            const Contacts = Application('Contacts');
            const people = Contacts.people();
            const phoneNumbers: { [key: string]: string[] } = {};

            for (const person of people) {
                try {
                    const name = person.name();
                    const phones = person.phones().map((phone: unknown) => (phone as { value: string }).value);

                    if (!phoneNumbers[name]) {
                        phoneNumbers[name] = [];
                    }
                    phoneNumbers[name] = [...phoneNumbers[name], ...phones];
                } catch (error) {
                    // Skip contacts that can't be processed
                }
            }

            return phoneNumbers;
        });

        return nums;
    } catch (error) {
        throw new Error(`Error accessing contacts: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function findNumber(name: string) {
    try {
        if (!await checkContactsAccess()) {
            return [];
        }

        const nums: string[] = await run((name: string) => {
            const Contacts = Application('Contacts');
            const people = Contacts.people.whose({name: {_contains: name}})(); // Ensure it's executed
            let phoneValues: string[] = [];

            if (people.length > 0) {
                const person = people[0];
                // Check if phones property exists and is callable
                if (typeof person.phones === 'function') { 
                    const phones = person.phones();
                    if (Array.isArray(phones)) {
                        phoneValues = phones.map((phone: any) => {
                            // Check if phone object and value property exist
                            if (phone && typeof phone.value === 'function') {
                                const val = phone.value();
                                return typeof val === 'string' ? val : null; // Return null if not a string
                            }
                            return null; // Return null if phone or value is invalid
                        }).filter((value): value is string => value !== null && value !== ''); // Filter out nulls and empty strings
                    }
                }
            }
            return phoneValues;
        }, name);

        // If no numbers found, run getAllNumbers() to find the closest match (changed from getNumbers)
        if (nums.length === 0) {
            const allNumbers = await getAllNumbers();
            const closestMatch = Object.keys(allNumbers).find(personName => 
                personName.toLowerCase().includes(name.toLowerCase())
            );
            return closestMatch ? allNumbers[closestMatch] : [];
        }

        return nums;
    } catch (error) {
        throw new Error(`Error finding contact: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function findContactByPhone(phoneNumber: string): Promise<string | null> {
    try {
        if (!await checkContactsAccess()) {
            return null;
        }

        // Normalize the phone number for comparison
        const searchNumber = phoneNumber.replace(/[^0-9+]/g, '');
        
        // Get all contacts and their numbers
        const allContacts = await getAllNumbers();
        
        // Look for a match
        for (const [name, numbers] of Object.entries(allContacts)) {
            const normalizedNumbers = numbers.map(num => num.replace(/[^0-9+]/g, ''));
            if (normalizedNumbers.some(num => 
                num === searchNumber || 
                num === `+${searchNumber}` || 
                num === `+1${searchNumber}` ||
                `+1${num}` === searchNumber
            )) {
                return name;
            }
        }

        return null;
    } catch (error) {
        // Return null instead of throwing to handle gracefully
        return null;
    }
}

// Removed unused handleContactsRequest function

export default { getAllNumbers, findNumber, findContactByPhone };
