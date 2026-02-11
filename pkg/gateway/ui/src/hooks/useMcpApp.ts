import { useCallback } from 'react';
import { useApp } from '@modelcontextprotocol/ext-apps/react';
import type { App } from '@modelcontextprotocol/ext-apps';

export function useMcpApp() {
  const { app, isConnected, error } = useApp({
    appInfo: { name: 'MCP Catalog Browser', version: '1.0.0' },
    capabilities: {},
  });

  const callTool = useCallback(
    async (toolName: string, args: Record<string, unknown> = {}): ReturnType<App['callServerTool']> => {
      if (!app) throw new Error('App not connected');
      return app.callServerTool({ name: toolName, arguments: args });
    },
    [app]
  );

  return { app, isConnected, error, callTool };
}

export type CallToolFn = (toolName: string, args?: Record<string, unknown>) => ReturnType<App['callServerTool']>;
