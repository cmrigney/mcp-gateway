# Catalog Browser MCP App

The Catalog Browser is an interactive MCP App that provides a visual UI for browsing the Docker MCP catalog and managing profiles directly within MCP host applications like Claude Desktop or ChatGPT.

## Overview

The Catalog Browser provides three main capabilities:

1. **Browse Catalog** - Search and explore available MCP servers in the Docker catalog
2. **Manage Profiles** - Create, activate, and delete profiles
3. **Add Servers** - Directly add servers to your current session from the UI

## Features

### Catalog Browser
- **Search & Filter** - Search servers by name, title, description, or category
- **Server Details** - View detailed information about each server including:
  - Description and categories
  - Required secrets and configuration
  - Direct "Add to Session" button
- **Visual Cards** - Grid layout with server cards showing key information

### Profile Manager
- **List Profiles** - View all saved profiles with server counts
- **Create Profiles** - Create new profiles from current gateway state
- **Activate Profiles** - Load profile servers into the current session
- **Delete Profiles** - Remove unwanted profiles

## Usage

### Invoking the Catalog Browser

In Claude Desktop or any MCP host, use the `catalog-browser` tool:

```
Show me the catalog browser
```

or

```
Open the MCP catalog browser
```

The AI will invoke the tool and display the interactive UI.

### Available Tools

The Catalog Browser adds these tools when the `use-profiles` feature is enabled:

#### UI Tool
- **`catalog-browser`** - Opens the interactive catalog browser UI

#### Data Tools
- **`mcp-list-profiles`** - Lists all saved profiles with metadata
- **`mcp-get-profile`** - Gets detailed information about a specific profile
- **`mcp-delete-profile`** - Deletes a profile from the database
- **`mcp-list-catalog`** - Lists all servers in the catalog with optional category filter

These tools power the UI but can also be called directly by the AI for programmatic access.

## Architecture

### Components

1. **`catalog_browser_app.go`** - Tool definitions and handlers
2. **`catalog_browser_ui.html`** - Embedded HTML/CSS/JavaScript UI
3. **`profile_tools.go`** - Supporting tools for profile and catalog operations
4. **`reload.go`** - Tool registration in gateway initialization

### Communication Pattern

The UI uses `window.parent.postMessage()` for bidirectional communication with the host:

```javascript
// UI → Host: Call MCP tool
window.parent.postMessage({
  type: 'tool-call',
  requestId: 'unique-id',
  tool: 'mcp-list-profiles',
  arguments: {}
}, '*');

// Host → UI: Tool result
window.addEventListener('message', (event) => {
  if (event.data.requestId === 'unique-id') {
    const result = event.data.result;
    // Process result
  }
});
```

### Data Access

- **Profiles** - Accessed via `db.WorkingSetDAO` interface
- **Catalog** - Accessed via `g.configuration.servers` map
- **Database** - SQLite database at `~/.docker/mcp/mcp-toolkit.db`

## Development

### Building

The HTML UI is embedded at compile time using Go's `//go:embed` directive:

```go
//go:embed catalog_browser_ui.html
var catalogBrowserHTML string
```

After modifying the HTML, rebuild:

```bash
make docker-mcp
```

### Testing

Test the catalog browser manually:

```bash
# Start gateway with profiles enabled
docker mcp gateway --dynamic-tools --profile default

# In Claude Desktop, invoke the tool
"Show me the catalog browser"
```

### UI Development

The UI is a self-contained HTML file with:
- **Embedded CSS** - Docker blue (#066fd1) branding
- **Embedded JavaScript** - Async tool calling, modal dialogs
- **No External Dependencies** - Everything inline for reliability

## Configuration

### Prerequisites

- Gateway must be running with `--dynamic-tools` flag
- Profiles feature must be enabled (automatic with `--profile` flag)
- SQLite database initialized (automatic on first run)

### Feature Flags

```bash
# Enable dynamic tools and profiles
docker mcp gateway --dynamic-tools --profile default

# Or set via environment
export DOCKER_MCP_DYNAMIC_TOOLS=true
export DOCKER_MCP_PROFILE=default
```

## Future Enhancements

### Planned Features
- **Profile Templates** - Pre-configured profiles for common use cases
- **Bulk Operations** - Add multiple servers at once
- **Profile Export/Import** - Share profiles as YAML files
- **Server Health** - Show which servers are online/offline
- **Usage Analytics** - Track which servers are used most

### Potential Improvements
- **Visual Workflow Builder** - Drag-and-drop server configuration
- **Profile Diff** - Compare profiles before activation
- **Search Suggestions** - Auto-complete in search box
- **Recent Servers** - Quick access to recently used servers

## Technical Details

### Tool Registration

Tools are registered in `reload.go` when `g.UseProfiles` is true:

```go
if g.UseProfiles {
    catalogBrowserTool := g.createCatalogBrowserTool(clientConfig)
    g.mcpServer.AddTool(catalogBrowserTool.Tool, catalogBrowserTool.Handler)
    g.toolRegistrations[catalogBrowserTool.Tool.Name] = *catalogBrowserTool
    // ... additional tools
}
```

### Database Schema

Profiles are stored using the existing `working_set` table:

```sql
CREATE TABLE working_set (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    servers TEXT NOT NULL,  -- JSON array
    secrets TEXT NOT NULL   -- JSON object
);
```

### Error Handling

- Tool errors return `isError: true` in result
- UI displays error messages with toast notifications
- All database operations wrapped in try-catch
- Timeout protection on tool calls (30 seconds)

## Troubleshooting

### UI Not Loading

- Check that `catalog_browser_ui.html` exists in `pkg/gateway/`
- Rebuild binary: `make docker-mcp`
- Verify `--dynamic-tools` flag is set

### Tools Not Available

- Confirm `--profile` flag or `DOCKER_MCP_PROFILE` is set
- Check gateway logs for tool registration messages
- Ensure database is initialized: `~/.docker/mcp/mcp-toolkit.db` exists

### Profile Operations Failing

- Check database file permissions
- Verify SQLite version (3.31+ required)
- Look for error messages in gateway logs

## References

- [MCP Apps Specification](https://spec.modelcontextprotocol.io/specification/draft/2025-11-05/mcp-apps/)
- [Working Sets Documentation](./profiles.md)
- [Dynamic Tools Documentation](./dynamic-tools.md)
