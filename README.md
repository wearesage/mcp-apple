# Apple MCP (Model Context Protocol) Tools

A collection of tools that allow AI assistants like Claude to interact with Apple applications and services through the Model Context Protocol (MCP).

## Overview

This package provides MCP tools for interacting with various Apple applications and services, including:

- **Contacts**: Search and retrieve contacts from Apple Contacts app
- **Notes**: Search, retrieve, create notes, and list folders in Apple Notes app
- **Messages**: Send, read, schedule messages and check unread messages
- **Mail**: Read unread emails, search emails, and send emails
- **Reminders**: Search, create, and open reminders in Apple Reminders app
- **Calendar**: Search, create, and open calendar events in Apple Calendar app
- **Maps**: Search locations, manage guides, save favorites, and get directions
- **Web Search**: Search the web using DuckDuckGo and retrieve content from search results

## Installation

```bash
# Install with npm
npm install @sage/mcp-apple

# Install with yarn
yarn add @sage/mcp-apple

# Install with bun
bun add @sage/mcp-apple
```

## Requirements

- macOS operating system
- Node.js 18+ or Bun runtime
- Appropriate permissions for accessing Apple applications (Contacts, Notes, Messages, Mail, etc.)

## Usage

### Starting the MCP Server

```bash
# Using the CLI
npx apple-mcp

# Using bun
bun run dev
```

### Connecting to Claude

To use these tools with Claude, you'll need to connect the MCP server to Claude. This can be done using the MCP proxy or directly through Claude's interface if available.

```bash
# Example using mcp-proxy
mcp-proxy --server "bun run /path/to/apple-mcp/index.ts"
```

### Tool Examples

#### Contacts

```javascript
// Search for a contact by name
{
  "operation": "contacts",
  "name": "John Doe"
}

// List all contacts
{
  "operation": "contacts"
}
```

#### Notes

```javascript
// Search for notes containing specific text
{
  "operation": "notes",
  "operation": "search",
  "searchText": "meeting notes"
}

// Create a new note
{
  "operation": "notes",
  "operation": "create",
  "title": "Shopping List",
  "body": "- Milk\n- Eggs\n- Bread",
  "folderName": "Personal"
}

// List all notes in a folder
{
  "operation": "notes",
  "operation": "list",
  "folderName": "Work"
}

// List all folders
{
  "operation": "notes",
  "operation": "listFolders"
}

// Create a new folder
{
  "operation": "notes",
  "operation": "createFolder",
  "folderName": "Projects"
}
```

#### Messages

```javascript
// Send a message
{
  "operation": "messages",
  "operation": "send",
  "phoneNumber": "+1234567890",
  "message": "Hello, how are you?"
}

// Read messages from a contact
{
  "operation": "messages",
  "operation": "read",
  "phoneNumber": "+1234567890",
  "limit": 5
}

// Schedule a message
{
  "operation": "messages",
  "operation": "schedule",
  "phoneNumber": "+1234567890",
  "message": "Don't forget our meeting tomorrow!",
  "scheduledTime": "2023-12-01T09:00:00Z"
}

// Check unread messages
{
  "operation": "messages",
  "operation": "unread"
}
```

#### Mail

```javascript
// Check unread emails
{
  "operation": "mail",
  "operation": "unread",
  "limit": 10
}

// Search emails
{
  "operation": "mail",
  "operation": "search",
  "searchTerm": "invoice",
  "limit": 5
}

// Send an email
{
  "operation": "mail",
  "operation": "send",
  "to": "recipient@example.com",
  "subject": "Meeting Agenda",
  "body": "Here's the agenda for our meeting tomorrow...",
  "cc": "colleague@example.com"
}

// List mailboxes
{
  "operation": "mail",
  "operation": "mailboxes"
}

// List accounts
{
  "operation": "mail",
  "operation": "accounts"
}
```

#### Reminders

```javascript
// List all reminders
{
  "operation": "reminders",
  "operation": "list"
}

// Search for reminders
{
  "operation": "reminders",
  "operation": "search",
  "searchText": "groceries"
}

// Create a reminder
{
  "operation": "reminders",
  "operation": "create",
  "name": "Buy milk",
  "listName": "Shopping",
  "notes": "Get organic milk",
  "dueDate": "2023-12-01T18:00:00Z"
}

// Open a reminder
{
  "operation": "reminders",
  "operation": "open",
  "searchText": "Buy milk"
}

// List reminders by list ID
{
  "operation": "reminders",
  "operation": "listById",
  "listId": "x-apple-reminder://list/123456"
}
```

#### Calendar

```javascript
// Search for events
{
  "operation": "calendar",
  "operation": "search",
  "searchText": "meeting",
  "fromDate": "2023-12-01T00:00:00Z",
  "toDate": "2023-12-31T23:59:59Z"
}

// List upcoming events
{
  "operation": "calendar",
  "operation": "list",
  "limit": 5
}

// Create an event
{
  "operation": "calendar",
  "operation": "create",
  "title": "Team Meeting",
  "startDate": "2023-12-05T14:00:00Z",
  "endDate": "2023-12-05T15:00:00Z",
  "location": "Conference Room A",
  "notes": "Quarterly review meeting",
  "isAllDay": false,
  "calendarName": "Work"
}

// Open an event
{
  "operation": "calendar",
  "operation": "open",
  "eventId": "x-apple-calendar://event/123456"
}
```

#### Maps

```javascript
// Search for locations
{
  "operation": "maps",
  "operation": "search",
  "query": "coffee shops near me",
  "limit": 5
}

// Save a location
{
  "operation": "maps",
  "operation": "save",
  "name": "Favorite Coffee Shop",
  "address": "123 Main St, Anytown, USA"
}

// Get directions
{
  "operation": "maps",
  "operation": "directions",
  "fromAddress": "123 Main St, Anytown, USA",
  "toAddress": "456 Oak Ave, Anytown, USA",
  "transportType": "driving"
}

// Drop a pin
{
  "operation": "maps",
  "operation": "pin",
  "name": "Meeting Point",
  "address": "Central Park, New York, NY"
}

// List guides
{
  "operation": "maps",
  "operation": "listGuides"
}

// Create a guide
{
  "operation": "maps",
  "operation": "createGuide",
  "guideName": "Favorite Restaurants"
}

// Add to guide
{
  "operation": "maps",
  "operation": "addToGuide",
  "guideName": "Favorite Restaurants",
  "address": "789 Pine St, Anytown, USA"
}

// Get map center coordinates
{
  "operation": "maps",
  "operation": "getCenter"
}

// Set map center coordinates
{
  "operation": "maps",
  "operation": "setCenter",
  "latitude": 37.7749,
  "longitude": -122.4194
}
```

#### Web Search

```javascript
// Search the web
{
  "operation": "webSearch",
  "query": "how to make chocolate chip cookies"
}
```

## Architecture

The Apple MCP tool is built with a modular architecture:

- **index.ts**: Main entry point that sets up the MCP server and registers tools
- **tools.ts**: Defines the tool schemas and descriptions
- **src/handlers/**: Contains handler functions for each tool
- **src/scripts/**: Contains AppleScript scripts for interacting with Apple applications
- **utils/**: Contains utility modules for each Apple service

The tool uses lazy loading to improve performance, only loading modules when they are needed.

## Security and Permissions

This tool requires access to various Apple applications and services. You will need to grant permissions when prompted by macOS. These permissions can be managed in System Preferences > Security & Privacy > Privacy.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/apple-mcp.git
cd apple-mcp

# Install dependencies
bun install
```

### Running in Development Mode

```bash
bun run dev
```

### Code Style

- Use 2-space indentation
- Keep lines under 100 characters
- Use explicit type annotations for function parameters and returns
- Follow PascalCase for types, interfaces, and Tool constants
- Use camelCase for variables and functions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request