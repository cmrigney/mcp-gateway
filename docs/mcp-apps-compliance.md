# MCP Apps Specification Compliance

This document describes the changes made to implement the Catalog Browser as a proper MCP App according to the [MCP Apps specification (2026-01-26)](https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/refs/heads/main/specification/2026-01-26/apps.mdx).

## Key Changes for Compliance

### 1. Tool Metadata (`_meta.ui.resourceUri`)

**Issue:** The tool was not declaring that it has an associated UI resource.

**Fix:** Added `_meta.ui.resourceUri` to the tool definition:

```go
tool := &mcp.Tool{
    Name:        "catalog-browser",
    Description: "Interactive UI for browsing the MCP catalog and managing profiles",
    InputSchema: &jsonschema.Schema{
        Type:       "object",
        Properties: map[string]*jsonschema.Schema{},
    },
    Meta: mcp.Meta{
        "ui": map[string]any{
            "resourceUri": "ui://catalog-browser/app.html",
        },
    },
}
```

**Why:** Per the spec, tools must reference UI resources via the `_meta.ui.resourceUri` field. This tells the host that invoking this tool should display a UI.

### 2. MIME Type (`text/html;profile=mcp-app`)

**Issue:** Using generic `text/html` instead of the MCP App-specific MIME type.

**Fix:** Changed MIME type to `text/html;profile=mcp-app`:

```go
Resource: &mcp.ResourceContents{
    URI:      "ui://catalog-browser/app.html",
    MIMEType: "text/html;profile=mcp-app", // Was: "text/html"
    Text:     catalogBrowserHTML,
}
```

**Why:** The spec requires `text/html;profile=mcp-app` to distinguish MCP Apps from regular HTML content. This signals to the host that the content should be treated as an interactive MCP App with proper sandboxing and communication.

### 3. Resource Metadata (CSP Configuration)

**Issue:** No security metadata was provided for the UI resource.

**Fix:** Added `_meta.ui` with CSP configuration:

```go
Meta: mcp.Meta{
    "ui": map[string]any{
        "prefersBorder": true,
        "csp": map[string]any{
            "connectDomains": []string{},
            "resourceDomains": []string{
                "https://fonts.googleapis.com",
                "https://fonts.gstatic.com",
            },
            "frameDomains": []string{},
        },
    },
}
```

**Why:** The spec requires servers to declare which external origins their UI needs to access. This enables hosts to:
- Enforce appropriate Content Security Policy headers
- Protect users from malicious content
- Maintain an auditable security model

**CSP Fields:**
- `connectDomains`: Origins for network requests (fetch/XHR/WebSocket) - empty means no external connections
- `resourceDomains`: Origins for static resources (fonts, images, scripts) - we allow Google Fonts
- `frameDomains`: Origins for nested iframes - empty means no iframes allowed
- `prefersBorder`: Request visible border and background from host

### 4. JSON-RPC Protocol for Communication

**Issue:** Using a custom communication protocol instead of standard MCP JSON-RPC.

**Fix:** Updated JavaScript to use proper JSON-RPC 2.0 protocol:

```javascript
// Before (custom protocol):
window.parent.postMessage({
    type: 'tool-call',
    requestId: requestId,
    tool: toolName,
    arguments: args
}, '*');

// After (JSON-RPC 2.0):
window.parent.postMessage({
    jsonrpc: '2.0',
    id: requestId,
    method: 'tools/call',
    params: {
        name: toolName,
        arguments: args || {}
    }
}, '*');
```

**Why:** The spec mandates using standard MCP JSON-RPC protocol for all UI-to-host communication. This provides:
- Familiar, structured communication
- Auditable message flow
- Consistency with rest of MCP ecosystem
- Proper error handling

**Message Format:**

Request:
```json
{
  "jsonrpc": "2.0",
  "id": "req-abc123",
  "method": "tools/call",
  "params": {
    "name": "mcp-list-profiles",
    "arguments": {}
  }
}
```

Response (success):
```json
{
  "jsonrpc": "2.0",
  "id": "req-abc123",
  "result": {
    "content": [...]
  }
}
```

Response (error):
```json
{
  "jsonrpc": "2.0",
  "id": "req-abc123",
  "error": {
    "code": -32000,
    "message": "Tool execution failed"
  }
}
```

## MCP Apps Architecture

### URI Scheme

All UI resources use the `ui://` URI scheme to distinguish them from other MCP resources:
- `ui://catalog-browser/app.html` - Our main catalog browser UI

### Tool-UI Linkage Pattern

1. **Resource Registration** - Server declares UI resource via `AddResource()`
2. **Tool Declaration** - Tool advertises it has a UI via `_meta.ui.resourceUri`
3. **Tool Invocation** - Host calls the tool when user requests it
4. **Resource Fetch** - Host reads the UI resource via `resources/read`
5. **Rendering** - Host displays UI in sandboxed iframe
6. **Communication** - UI and host communicate via JSON-RPC over postMessage

### Security Model

- **Sandboxed Execution** - UI runs in iframe with sandbox attributes
- **CSP Enforcement** - Host enforces Content Security Policy based on declared domains
- **Auditable Communication** - All messages use structured JSON-RPC protocol
- **No Direct Access** - UI can only access host functionality through declared MCP tools

### Resource Declaration Pattern

**CRITICAL:** UI resources must be **pre-declared** via `resources/list`, not returned inline from tools.

The proper pattern is:

1. **Register the UI resource** during initialization:
   ```go
   catalogBrowserResource := &mcp.Resource{
       URI:         "ui://catalog-browser/app.html",
       Name:        "Catalog Browser",
       Description: "Interactive UI for browsing the MCP catalog",
       MIMEType:    "text/html;profile=mcp-app",
   }
   g.mcpServer.AddResource(catalogBrowserResource, catalogBrowserResourceHandler(g))
   ```

2. **Tool references the resource** via metadata:
   ```go
   Meta: mcp.Meta{
       "ui": map[string]any{
           "resourceUri": "ui://catalog-browser/app.html",
       },
   }
   ```

3. **Tool returns data**, not UI:
   ```go
   return &mcp.CallToolResult{
       Content: []mcp.Content{
           &mcp.TextContent{Text: "Opening catalog browser..."},
       },
   }
   ```

4. **Host fetches UI** via `resources/read` when tool is invoked

This separation of concerns allows hosts to:
- Prefetch and cache UI templates
- Inspect UI resources during connection
- Render the UI before receiving tool results

## Testing Checklist

To verify MCP Apps compliance:

- [x] UI resource registered via `AddResource()` before tool registration
- [x] Tool has `_meta.ui.resourceUri` field pointing to `ui://` resource
- [x] Resource uses MIME type `text/html;profile=mcp-app`
- [x] Resource includes `_meta.ui` with CSP configuration
- [x] Tool handler returns data/text, not the UI resource
- [x] JavaScript uses JSON-RPC 2.0 protocol (jsonrpc, id, method, params)
- [x] CSP declares all external domains (Google Fonts)
- [x] No external CDN dependencies beyond declared domains
- [x] Build succeeds without errors
- [ ] UI displays correctly in Claude Desktop as an app (not tool output)
- [ ] Tool calls work through JSON-RPC protocol
- [ ] Profile operations function correctly

## Host Compatibility

The implementation follows the MCP Apps spec and should work with any compliant host:

- **Claude Desktop** - Primary target, supports MCP Apps
- **ChatGPT** - Supports MCP Apps via Apps SDK
- **MCP-UI Playground** - Community playground for testing
- **Future Hosts** - Any MCP host implementing the spec

## References

- [MCP Apps Specification (2026-01-26)](https://raw.githubusercontent.com/modelcontextprotocol/ext-apps/refs/heads/main/specification/2026-01-26/apps.mdx)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [MCP Go SDK](https://github.com/modelcontextprotocol/go-sdk)
- [MCP-UI Community](https://mcpui.dev/)

## Next Steps

1. Install the updated binary: `make docker-mcp`
2. Start gateway with dynamic tools: `docker mcp gateway --dynamic-tools --profile default`
3. In Claude Desktop, invoke the tool: "use the catalog-browser tool"
4. Verify the UI displays and functions correctly
5. Test all tool calls work through the JSON-RPC protocol
6. Verify CSP allows Google Fonts to load
