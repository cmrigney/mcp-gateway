package gateway

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/google/jsonschema-go/jsonschema"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed ui/dist/catalog-browser.html
var catalogBrowserHTML string

// createCatalogBrowserTool creates the MCP App tool for browsing the catalog
func (g *Gateway) createCatalogBrowserTool(_ *clientConfig) *ToolRegistration {
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
			"ui/resourceUri": "ui://catalog-browser/app.html",
		},
	}

	return &ToolRegistration{
		Tool:    tool,
		Handler: withToolTelemetry("catalog-browser", catalogBrowserHandler(g)),
	}
}

// catalogBrowserHandler returns success - the UI is loaded from the resource
func catalogBrowserHandler(_ *Gateway) mcp.ToolHandler {
	return func(_ context.Context, _ *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{
					Text: "Opening catalog browser...",
				},
			},
		}, nil
	}
}

// catalogBrowserResourceHandler returns the UI resource content
func catalogBrowserResourceHandler(_ *Gateway) mcp.ResourceHandler {
	return func(_ context.Context, _ *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      "ui://catalog-browser/app.html",
					MIMEType: "text/html;profile=mcp-app",
					Text:     catalogBrowserHTML,
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
					},
				},
			},
		}, nil
	}
}

// createMcpListProfilesTool creates the tool for listing all profiles
func (g *Gateway) createMcpListProfilesTool() *ToolRegistration {
	tool := &mcp.Tool{
		Name:        "mcp-list-profiles",
		Description: "List all saved profiles with basic metadata",
		InputSchema: &jsonschema.Schema{
			Type: "object",
		},
	}

	return &ToolRegistration{
		Tool:    tool,
		Handler: withToolTelemetry("mcp-list-profiles", mcpListProfilesHandler(g)),
	}
}

// createMcpGetProfileTool creates the tool for getting profile details
func (g *Gateway) createMcpGetProfileTool() *ToolRegistration {
	tool := &mcp.Tool{
		Name:        "mcp-get-profile",
		Description: "Get detailed information about a specific profile",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"id": {
					Type:        "string",
					Description: "Profile ID to retrieve",
				},
			},
			Required: []string{"id"},
		},
	}

	return &ToolRegistration{
		Tool:    tool,
		Handler: withToolTelemetry("mcp-get-profile", mcpGetProfileHandler(g)),
	}
}

// createMcpDeleteProfileTool creates the tool for deleting a profile
func (g *Gateway) createMcpDeleteProfileTool() *ToolRegistration {
	tool := &mcp.Tool{
		Name:        "mcp-delete-profile",
		Description: "Delete a profile from the database",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"id": {
					Type:        "string",
					Description: "Profile ID to delete",
				},
			},
			Required: []string{"id"},
		},
	}

	return &ToolRegistration{
		Tool:    tool,
		Handler: withToolTelemetry("mcp-delete-profile", mcpDeleteProfileHandler(g)),
	}
}

// createMcpListCatalogTool creates the tool for listing catalog servers
func (g *Gateway) createMcpListCatalogTool() *ToolRegistration {
	tool := &mcp.Tool{
		Name:        "mcp-list-catalog",
		Description: "List all servers in the catalog with full metadata",
		InputSchema: &jsonschema.Schema{
			Type: "object",
			Properties: map[string]*jsonschema.Schema{
				"category": {
					Type:        "string",
					Description: "Optional category filter (e.g., 'filesystem', 'data', 'search')",
				},
			},
		},
	}

	return &ToolRegistration{
		Tool:    tool,
		Handler: withToolTelemetry("mcp-list-catalog", mcpListCatalogHandler(g)),
	}
}

// Helper function to format error messages consistently
func formatToolError(message string, err error) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{
			Text: fmt.Sprintf("%s: %v", message, err),
		}},
		IsError: true,
	}
}
