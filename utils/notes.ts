import { run } from '@jxa/run';

type Note = {
    id: string; // Add ID for potential future use
    name: string;
    content: string;
    folderName: string; // Add folder name
};

type CreateNoteResult = {
    success: boolean;
    note?: Note;
    message?: string;
    folderName?: string;
    usedDefaultFolder?: boolean;
};

type CreateFolderResult = {
    success: boolean;
    message?: string;
};
  
async function getAllNotes(folderName?: string): Promise<Note[]> {
    const notes: Note[] = await run((folderName: string | undefined) => {
        const Notes = Application('Notes');
        let allNotes = Notes.notes();
        let notesInFolder = [];

        if (folderName) {
            // Filter all notes by folder name
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            notesInFolder = allNotes.filter((note: any) => {
                try {
                    // Check container exists and has a name property before accessing
                    return note.container && typeof note.container.name === 'function' && note.container.name() === folderName;
                } catch (e) {
                    // Ignore errors during filtering
                    return false;
                }
            });
        } else {
            notesInFolder = allNotes; // Use all notes if no folder specified
        }

        // Map the filtered notes
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return notesInFolder.map((note: any) => {
            let noteData = {
                id: 'unknown',
                name: 'unknown',
                content: '',
                folderName: 'Notes' // Default to 'Notes' (main account)
            };
            try { noteData.id = note.id(); } catch(e) {/* ignore */}
            try { noteData.name = note.name(); } catch(e) {/* ignore */}
            try { noteData.content = note.plaintext(); } catch(e) {/* ignore */}
            try {
                 // Check if container exists and is specifically a folder
                 if (note.container && note.container.class() === 'folder') {
                    noteData.folderName = note.container.name();
                 }
                 // Otherwise, keep the default 'Notes'
            } catch(e) {/* ignore */}
            return noteData;
        });
    }, folderName); // Pass folderName correctly to run

    return notes || []; // Ensure array return
}

async function findNote(searchText: string, folderName?: string): Promise<Note[]> {
    const notes: Note[] = await run((searchText: string, folderName: string | undefined) => {
        const Notes = Application('Notes');
        let allNotes = Notes.notes();
        let notesInScope = [];

        if (folderName) {
            // Filter all notes by folder name first
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            const notesInFolder = allNotes.filter((note: any) => {
                try {
                    // Check container exists and has a name property before accessing
                    return note.container && typeof note.container.name === 'function' && note.container.name() === folderName;
                 } catch (e) {
                     // Ignore errors during filtering (e.g., note deleted while iterating)
                     // console.error(`Error checking container for note ${note.name()}: ${e}`); // Removed console.error
                     return false;
                 }
            });
            // Now filter by search text
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            notesInScope = notesInFolder.filter((note: any) => {
                 try {
                    const nameMatch = note.name && typeof note.name === 'function' && note.name().toLowerCase().includes(searchText.toLowerCase());
                    const contentMatch = note.plaintext && typeof note.plaintext === 'function' && note.plaintext().toLowerCase().includes(searchText.toLowerCase());
                    return nameMatch || contentMatch;
                  } catch(e) {
                     // console.error(`Error checking content for note ${note.name()}: ${e}`); // Removed console.error
                     return false;
                  }
            });

        } else {
            // Filter all notes directly by search text if no folder specified
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            notesInScope = allNotes.filter((note: any) => {
                 try {
                    const nameMatch = note.name && typeof note.name === 'function' && note.name().toLowerCase().includes(searchText.toLowerCase());
                    const contentMatch = note.plaintext && typeof note.plaintext === 'function' && note.plaintext().toLowerCase().includes(searchText.toLowerCase());
                    return nameMatch || contentMatch;
                  } catch(e) {
                     // console.error(`Error checking content for note ${note.name()}: ${e}`); // Removed console.error
                     return false;
                  }
            });
        }
        
        // Map the final filtered notes
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return notesInScope.map((note: any) => {
             let noteData = {
                id: 'unknown',
                name: 'unknown',
                content: '',
                folderName: 'Notes' // Default to 'Notes'
            };
            try { noteData.id = note.id(); } catch(e) {/* ignore */}
            try { noteData.name = note.name(); } catch(e) {/* ignore */}
            try { noteData.content = note.plaintext(); } catch(e) {/* ignore */}
            try {
                 // Check if container exists and is specifically a folder
                 if (note.container && note.container.class() === 'folder') {
                    noteData.folderName = note.container.name();
                 }
                 // Otherwise, keep the default 'Notes'
            } catch(e) {/* ignore */}
            return noteData;
        });
    }, searchText, folderName);

    // Keep simple fallback for now: if no exact match in scope, don't search wider
    // Consider enhancing fallback later if needed.
    return notes || [];
}

// Define a type for the folder details
type FolderDetails = {
    id: string;
    name: string;
    containerName: string;
};

async function listFolders(): Promise<FolderDetails[]> {
    // Return more details instead of just names
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    const folderDetails: FolderDetails[] = await run(() => {
        const Notes = Application('Notes');
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        return Notes.folders().map((folder: any) => {
            let containerName = 'Unknown';
            try {
                // Check if container exists and has a name
                if (folder.container && typeof folder.container.name === 'function') {
                    containerName = folder.container.name();
                }
            } catch (e) {/* ignore */}
            return {
                id: folder.id(), // Get ID
                name: folder.name(),
                containerName: containerName
            };
        });
    });
    return folderDetails || [];
}


async function createNote(title: string, body: string, folderName: string = 'Claude'): Promise<CreateNoteResult> {
    try {
        // Format the body with proper markdown
        const formattedBody = body
            .replace(/^(#+)\s+(.+)$/gm, '$1 $2\n') // Add newline after headers
            .replace(/^-\s+(.+)$/gm, '\n- $1') // Add newline before list items
            .replace(/\n{3,}/g, '\n\n') // Remove excess newlines
            .trim();

        const result = await run((title: string, body: string, folderName: string) => {
            const Notes = Application('Notes');
            
            // Create the note
            let targetFolder;
            let usedDefaultFolder = false;
            let actualFolderName = folderName;
            
            try {
                // Try to find the specified folder
                const folders = Notes.folders();
                for (let i = 0; i < folders.length; i++) {
                    if (folders[i].name() === folderName) {
                        targetFolder = folders[i];
                        break;
                    }
                }
                
                // If the specified folder doesn't exist
                if (!targetFolder) {
                    if (folderName === 'Claude') {
                        // Try to create the Claude folder if it doesn't exist
                        Notes.make({new: 'folder', withProperties: {name: 'Claude'}});
                        usedDefaultFolder = true;
                        
                        // Find it again after creation
                        const updatedFolders = Notes.folders();
                        for (let i = 0; i < updatedFolders.length; i++) {
                            if (updatedFolders[i].name() === 'Claude') {
                                targetFolder = updatedFolders[i];
                                break;
                            }
                        }
                    } else {
                        throw new Error(`Folder "${folderName}" not found`);
                    }
                }
                
                // Create the note in the specified folder or default folder
                let newNote;
                if (targetFolder) {
                    newNote = Notes.make({new: 'note', withProperties: {name: title, body: body}, at: targetFolder});
                    actualFolderName = folderName;
                } else {
                    // Fall back to default folder
                    newNote = Notes.make({new: 'note', withProperties: {name: title, body: body}});
                    actualFolderName = 'Default';
                }
                
                return {
                    success: true,
                    note: { // Return the full Note object including ID and folder
                        id: newNote.id(),
                        name: title,
                        content: body,
                        folderName: actualFolderName 
                    },
                    folderName: actualFolderName, // Keep for backward compatibility? Or remove? Let's keep for now.
                    usedDefaultFolder: usedDefaultFolder,
                };
            } catch (scriptError: unknown) { // Add type annotation
                // Type check before accessing message
                const errorMessage = scriptError instanceof Error ? scriptError.message : String(scriptError);
                throw new Error(`AppleScript error: ${errorMessage}`);
            }
        }, title, formattedBody, folderName);
        
        return result as CreateNoteResult; // Assert type here as run() returns unknown
    } catch (error) {
        // Ensure the return value matches CreateNoteResult
        return { 
            success: false, 
            message: `Failed to create note: ${error instanceof Error ? error.message : String(error)}` 
        };
    }
}

async function createFolder(folderName: string): Promise<CreateFolderResult> {
    try {
        const result = await run((name: string) => {
            const Notes = Application('Notes');
            try {
                // Check if folder already exists
                const existingFolders = Notes.folders.whose({name: name})();
                if (existingFolders.length > 0) {
                    return { success: false, message: `Folder "${name}" already exists.` };
                }
                
                // Create the folder
                Notes.make({new: 'folder', withProperties: {name: name}});
                
                // Verify creation (optional but good practice)
                const newFolders = Notes.folders.whose({name: name})();
                if (newFolders.length > 0) {
                    return { success: true };
                } else {
                    // This case should ideally not happen if make() didn't throw
                    return { success: false, message: `Failed to verify folder creation.` };
                }
            } catch (scriptError: unknown) {
                const errorMessage = scriptError instanceof Error ? scriptError.message : String(scriptError);
                // Distinguish between "already exists" and other errors if possible
                // For now, treat all script errors during creation as failure
                return { success: false, message: `AppleScript error: ${errorMessage}` };
            }
        }, folderName);

        // Ensure the result conforms to CreateFolderResult
        if (typeof result === 'object' && result !== null && typeof (result as CreateFolderResult).success === 'boolean') {
            return result as CreateFolderResult;
        } else {
            // Handle unexpected return type from run()
            return { success: false, message: `Unexpected result from JXA script: ${JSON.stringify(result)}` };
        }
    } catch (error) {
        return { 
            success: false, 
            message: `Failed to run create folder script: ${error instanceof Error ? error.message : String(error)}` 
        };
    }
}

export default { getAllNotes, findNote, createNote, listFolders, createFolder };
