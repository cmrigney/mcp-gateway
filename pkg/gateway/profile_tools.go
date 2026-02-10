package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"github.com/docker/mcp-gateway/pkg/db"
	"github.com/docker/mcp-gateway/pkg/workingset"
)

// ProfileMetadata contains basic profile information for listing
type ProfileMetadata struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	ServerCount int    `json:"server_count"`
}

// ProfileDetail contains full profile information
type ProfileDetail struct {
	ID      string                      `json:"id"`
	Name    string                      `json:"name"`
	Servers []ProfileServerDetail       `json:"servers"`
	Secrets map[string]ProfileSecretDetail `json:"secrets"`
}

// ProfileServerDetail contains server information for the profile detail view
type ProfileServerDetail struct {
	Type     string         `json:"type"`
	Name     string         `json:"name,omitempty"`
	Image    string         `json:"image,omitempty"`
	Endpoint string         `json:"endpoint,omitempty"`
	Source   string         `json:"source,omitempty"`
	Config   map[string]any `json:"config,omitempty"`
	Tools    []string       `json:"tools,omitempty"`
	Snapshot *SnapshotInfo  `json:"snapshot,omitempty"`
}

// SnapshotInfo contains relevant snapshot metadata
type SnapshotInfo struct {
	Name        string   `json:"name"`
	Title       string   `json:"title,omitempty"`
	Description string   `json:"description,omitempty"`
	Categories  []string `json:"categories,omitempty"`
}

// ProfileSecretDetail contains secret information
type ProfileSecretDetail struct {
	Provider string `json:"provider"`
}

// CatalogServerInfo contains catalog server metadata for listing
type CatalogServerInfo struct {
	Name        string         `json:"name"`
	Title       string         `json:"title,omitempty"`
	Description string         `json:"description,omitempty"`
	Image       string         `json:"image,omitempty"`
	Categories  []string       `json:"categories,omitempty"`
	Icon        string         `json:"icon,omitempty"`
	Config      []any          `json:"config,omitempty"`
	Secrets     []SecretConfig `json:"secrets,omitempty"`
}

// SecretConfig contains secret configuration metadata
type SecretConfig struct {
	Name string `json:"name"`
	Env  string `json:"env,omitempty"`
}

// mcpListProfilesHandler lists all profiles with basic metadata
func mcpListProfilesHandler(g *Gateway) mcp.ToolHandler {
	return func(ctx context.Context, _ *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		dao, err := db.New()
		if err != nil {
			return formatToolError("Failed to create database client", err), nil
		}
		defer dao.Close()

		dbProfiles, err := dao.ListWorkingSets(ctx)
		if err != nil {
			return formatToolError("Failed to list profiles", err), nil
		}

		profiles := make([]ProfileMetadata, len(dbProfiles))
		for i, dbProfile := range dbProfiles {
			profiles[i] = ProfileMetadata{
				ID:          dbProfile.ID,
				Name:        dbProfile.Name,
				ServerCount: len(dbProfile.Servers),
			}
		}

		jsonData, err := json.Marshal(profiles)
		if err != nil {
			return formatToolError("Failed to marshal profiles", err), nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(jsonData)},
			},
		}, nil
	}
}

// mcpGetProfileHandler gets detailed information about a specific profile
func mcpGetProfileHandler(g *Gateway) mcp.ToolHandler {
	return func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		var params struct {
			ID string `json:"id"`
		}

		if req.Params.Arguments == nil {
			return formatToolError("Missing arguments", fmt.Errorf("arguments required")), nil
		}

		paramsBytes, err := json.Marshal(req.Params.Arguments)
		if err != nil {
			return formatToolError("Failed to marshal arguments", err), nil
		}

		if err := json.Unmarshal(paramsBytes, &params); err != nil {
			return formatToolError("Failed to parse arguments", err), nil
		}

		if params.ID == "" {
			return formatToolError("ID parameter is required", fmt.Errorf("id required")), nil
		}

		dao, err := db.New()
		if err != nil {
			return formatToolError("Failed to create database client", err), nil
		}
		defer dao.Close()

		dbProfile, err := dao.GetWorkingSet(ctx, params.ID)
		if err != nil {
			return formatToolError(fmt.Sprintf("Failed to get profile '%s'", params.ID), err), nil
		}

		// Convert to working set for easier handling
		ws := workingset.NewFromDb(dbProfile)

		// Build profile detail
		servers := make([]ProfileServerDetail, len(ws.Servers))
		for i, server := range ws.Servers {
			servers[i] = ProfileServerDetail{
				Type:     string(server.Type),
				Image:    server.Image,
				Endpoint: server.Endpoint,
				Source:   server.Source,
				Config:   server.Config,
				Tools:    server.Tools,
			}

			if server.Snapshot != nil {
				servers[i].Name = server.Snapshot.Server.Name
				var categories []string
				if server.Snapshot.Server.Metadata != nil {
					categories = server.Snapshot.Server.Metadata.Tags
				}
				servers[i].Snapshot = &SnapshotInfo{
					Name:        server.Snapshot.Server.Name,
					Title:       server.Snapshot.Server.Title,
					Description: server.Snapshot.Server.Description,
					Categories:  categories,
				}
			}
		}

		secrets := make(map[string]ProfileSecretDetail)
		for name, secret := range ws.Secrets {
			secrets[name] = ProfileSecretDetail{
				Provider: string(secret.Provider),
			}
		}

		profile := ProfileDetail{
			ID:      ws.ID,
			Name:    ws.Name,
			Servers: servers,
			Secrets: secrets,
		}

		jsonData, err := json.Marshal(profile)
		if err != nil {
			return formatToolError("Failed to marshal profile", err), nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(jsonData)},
			},
		}, nil
	}
}

// mcpDeleteProfileHandler deletes a profile from the database
func mcpDeleteProfileHandler(g *Gateway) mcp.ToolHandler {
	return func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		var params struct {
			ID string `json:"id"`
		}

		if req.Params.Arguments == nil {
			return formatToolError("Missing arguments", fmt.Errorf("arguments required")), nil
		}

		paramsBytes, err := json.Marshal(req.Params.Arguments)
		if err != nil {
			return formatToolError("Failed to marshal arguments", err), nil
		}

		if err := json.Unmarshal(paramsBytes, &params); err != nil {
			return formatToolError("Failed to parse arguments", err), nil
		}

		if params.ID == "" {
			return formatToolError("ID parameter is required", fmt.Errorf("id required")), nil
		}

		dao, err := db.New()
		if err != nil {
			return formatToolError("Failed to create database client", err), nil
		}
		defer dao.Close()

		if err := dao.RemoveWorkingSet(ctx, params.ID); err != nil {
			return formatToolError(fmt.Sprintf("Failed to delete profile '%s'", params.ID), err), nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: fmt.Sprintf("Successfully deleted profile '%s'", params.ID)},
			},
		}, nil
	}
}

// mcpListCatalogHandler lists all servers in the catalog with full metadata
func mcpListCatalogHandler(g *Gateway) mcp.ToolHandler {
	return func(_ context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		var params struct {
			Category string `json:"category"`
		}

		// Parse optional parameters
		if req.Params.Arguments != nil {
			paramsBytes, err := json.Marshal(req.Params.Arguments)
			if err != nil {
				return formatToolError("Failed to marshal arguments", err), nil
			}

			if err := json.Unmarshal(paramsBytes, &params); err != nil {
				return formatToolError("Failed to parse arguments", err), nil
			}
		}

		// Get catalog from current configuration
		catalogServers := g.configuration.servers

		// Filter by category if specified
		var filteredServers []CatalogServerInfo
		categoryFilter := strings.ToLower(strings.TrimSpace(params.Category))

		for name, server := range catalogServers {
			// Apply category filter if specified
			if categoryFilter != "" {
				hasCategory := false
				if server.Metadata != nil {
					for _, tag := range server.Metadata.Tags {
						if strings.ToLower(tag) == categoryFilter {
							hasCategory = true
							break
						}
					}
				}
				if !hasCategory {
					continue
				}
			}

			// Convert secrets
			secrets := make([]SecretConfig, len(server.Secrets))
			for i, secret := range server.Secrets {
				secrets[i] = SecretConfig{
					Name: secret.Name,
					Env:  secret.Env,
				}
			}

			// Get categories from metadata
			var categories []string
			if server.Metadata != nil {
				categories = server.Metadata.Tags
			}

			serverInfo := CatalogServerInfo{
				Name:        name,
				Title:       server.Title,
				Description: server.Description,
				Image:       server.Image,
				Categories:  categories,
				Icon:        server.Icon,
				Config:      server.Config,
				Secrets:     secrets,
			}
			filteredServers = append(filteredServers, serverInfo)
		}

		jsonData, err := json.Marshal(filteredServers)
		if err != nil {
			return formatToolError("Failed to marshal catalog", err), nil
		}

		return &mcp.CallToolResult{
			Content: []mcp.Content{
				&mcp.TextContent{Text: string(jsonData)},
			},
		}, nil
	}
}
