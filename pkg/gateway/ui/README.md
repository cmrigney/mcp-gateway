# Catalog Browser UI

This directory contains the frontend UI for the MCP Catalog Browser app.

## Structure

- `catalog-browser.html` - Main HTML template
- `app.ts` - TypeScript application logic with MCP Apps SDK
- `package.json` - Dependencies and build scripts
- `vite.config.ts` - Vite bundler configuration
- `tsconfig.json` - TypeScript configuration
- `dist/` - Build output (generated, not committed)

## Building

The UI must be built before compiling the Go binary. The build process:

1. Installs dependencies (`@modelcontextprotocol/ext-apps` SDK)
2. Bundles TypeScript + HTML + CSS into a single HTML file
3. Inlines all JavaScript and CSS (no external dependencies at runtime)
4. Outputs to `dist/catalog-browser.html`

### First-time setup

```bash
cd pkg/gateway/ui
npm install
```

### Build for production

```bash
npm run build
```

This creates `dist/catalog-browser.html` which is embedded in the Go binary via `//go:embed`.

### Development mode

For rapid iteration:

```bash
npm run dev
```

This watches for changes and rebuilds automatically.

## How It Works

### Build Process

1. **Vite** processes `catalog-browser.html`
2. Finds `<script type="module" src="./app.ts">`
3. Compiles TypeScript to JavaScript
4. Bundles SDK and application code
5. **vite-plugin-singlefile** inlines everything into single HTML
6. Outputs self-contained HTML to `dist/`

### Result

The built `dist/catalog-browser.html`:
- Contains all JavaScript inline (no external scripts)
- Contains all CSS inline (except Google Fonts)
- Includes the full MCP Apps SDK bundled
- Works offline (except fonts)
- ~50-100KB total size

### Go Embedding

The Go code embeds the built file:

```go
//go:embed ui/dist/catalog-browser.html
var catalogBrowserHTML string
```

When the resource is requested, Go serves the embedded HTML directly.

## Dependencies

### Runtime (bundled into HTML)

- `@modelcontextprotocol/ext-apps` - Official MCP Apps SDK

### Build-time only

- `vite` - Fast build tool and dev server
- `vite-plugin-singlefile` - Bundles everything into single HTML file
- `typescript` - TypeScript compiler

### External (loaded at runtime via CDN)

- Google Fonts (Poppins, Roboto) - specified in CSP

## Development Workflow

1. Make changes to `catalog-browser.html` or `app.ts`
2. Run `npm run build` (or `npm run dev` for watch mode)
3. Rebuild Go binary: `make docker-mcp`
4. Test in Claude Desktop

## CSP Configuration

The UI resource declares these CSP domains in Go code:

```go
"resourceDomains": []string{
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
}
```

Since all JavaScript is inlined, we don't need `esm.sh` or other CDNs at runtime.

## Troubleshooting

### Build fails with "Cannot find module"

```bash
rm -rf node_modules package-lock.json
npm install
```

### Go embed fails

Make sure to build the UI first:

```bash
cd pkg/gateway/ui
npm run build
cd ../../..
make docker-mcp
```

### TypeScript errors

Check `tsconfig.json` settings match your TypeScript version.

### Vite build issues

Try clearing the Vite cache:

```bash
rm -rf node_modules/.vite
npm run build
```

## File Sizes

Approximate sizes after build:

- Raw HTML + TypeScript: ~30KB
- MCP Apps SDK: ~20-30KB
- Total bundled: ~50-70KB
- Minified: ~40-50KB
- Gzipped (if served over HTTP): ~15-20KB

The embedded HTML in Go binary is uncompressed (~50KB).
