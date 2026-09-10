'use client';

import React, { useState } from 'react';
import { useApiKeys, useGenerateApiKey, useRevokeApiKey } from '@/hooks/useApiKeys';
import { User } from 'firebase/auth';

interface McpSetupProps {
  user: User;
}

export function McpSetup({ user }: McpSetupProps) {
  const { data: apiKeys = [], isLoading, isError } = useApiKeys(user);
  const generateMutation = useGenerateApiKey();
  const revokeMutation = useRevokeApiKey();

  const [activeTab, setActiveTab] = useState<'cursor' | 'claude' | 'antigravity' | 'web'>('cursor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const backendUrl = typeof window !== 'undefined' ? window.location.origin : 'https://meeting-recorder-extension.vercel.app';
  const mcpEndpointUrl = `${backendUrl}/api/mcp`;

  const handleGenerateKey = () => {
    generateMutation.mutate({ user, name: 'Team AI Assistant' });
  };

  const handleRevokeKey = (apiKey: string) => {
    revokeMutation.mutate({ user, apiKey });
  };

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const activeKey = apiKeys[0]?.apiKey || 'YOUR_EMBRACE_API_KEY';

  const snippets = {
    cursor: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          url: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${activeKey}`
          }
        }
      }
    }, null, 2),
    claude: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpEndpointUrl,
            "--header",
            `Authorization: Bearer ${activeKey}`
          ]
        }
      }
    }, null, 2),
    antigravity: JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          serverUrl: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${activeKey}`,
            "Content-Type": "application/json"
          }
        }
      }
    }, null, 2),
    web: `// Claude.ai Web browser connectors require an OAuth 2.0 authorization server.\n// OAuth 2.0 support will be added in an upcoming release.\n// For now, use Claude Desktop App, Antigravity, Cursor, or Windsurf via the tabs above.`
  };

  return (
    <section className="bg-white border border-[#e5e3d9] rounded-xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#f0ede4]">
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a1a] flex items-center gap-2">
            <span>⚡</span> Model Context Protocol (MCP) Integration
          </h2>
          <p className="text-xs text-[#666] mt-1">
            Connect your AI coding assistants and web agents directly to your recorded meetings.
          </p>
        </div>
        <button
          onClick={handleGenerateKey}
          disabled={generateMutation.isPending}
          className="self-start sm:self-auto py-2 px-4 bg-[#2d2d2d] hover:bg-[#1a1a1a] text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
        >
          {generateMutation.isPending ? 'Generating...' : '+ Generate New AI Key'}
        </button>
      </div>

      {/* Active API Keys List */}
      <div className="py-6 border-b border-[#f0ede4]">
        <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">Your Active Keys</h3>
        {isLoading ? (
          <div className="text-xs text-[#777] text-center py-4">Loading keys...</div>
        ) : isError ? (
          <div className="text-xs text-red-500 py-4">Failed to load keys.</div>
        ) : apiKeys.length === 0 ? (
          <div className="p-4 rounded-lg bg-[#fdfcf9] border border-dashed border-[#e5e3d9] text-center text-xs text-[#777]">
            No active API keys yet. Click <span className="font-semibold text-[#2d2d2d]">&quot;Generate New AI Key&quot;</span> above to connect your AI assistants.
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((keyItem) => (
              <div
                key={keyItem.apiKey}
                className="flex items-center justify-between p-3 rounded-lg bg-[#fdfcf9] border border-[#e5e3d9] text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[#1a1a1a] font-medium">{keyItem.apiKey}</span>
                  <span className="text-[10px] text-[#999]">({keyItem.name} • {new Date(keyItem.createdAt).toLocaleDateString()})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(keyItem.apiKey, keyItem.apiKey)}
                    className="px-2.5 py-1 rounded border border-[#e5e3d9] bg-white hover:bg-gray-50 text-[11px] text-[#444] transition-colors"
                  >
                    {copiedKey === keyItem.apiKey ? '✓ Copied' : 'Copy Key'}
                  </button>
                  <button
                    onClick={() => handleRevokeKey(keyItem.apiKey)}
                    disabled={revokeMutation.isPending}
                    className="px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1-Click Setup Snippets */}
      <div className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider">1-Click Client Configuration</h3>
          <div className="flex gap-1 p-1 bg-[#f0ede4] rounded-lg text-xs">
            {(['cursor', 'claude', 'antigravity', 'web'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md capitalize text-xs transition-all ${activeTab === tab ? 'bg-white text-[#1a1a1a] font-medium shadow-sm' : 'text-[#666] hover:text-[#1a1a1a]'
                  }`}
              >
                {tab === 'web' ? 'Claude / Web' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="relative rounded-lg bg-[#1a1a1a] text-gray-200 p-4 font-mono text-xs overflow-x-auto shadow-inner">
          <button
            onClick={() => copyToClipboard(snippets[activeTab], `snippet-${activeTab}`)}
            className="absolute top-3 right-3 px-3 py-1 rounded bg-[#333] hover:bg-[#444] text-white text-[11px] transition-colors"
          >
            {copiedKey === `snippet-${activeTab}` ? '✓ Copied' : 'Copy Config'}
          </button>
          <pre className="pr-20 whitespace-pre-wrap">{snippets[activeTab]}</pre>
        </div>

        <div className="text-[11px] text-[#777] mt-3 space-y-2">
          {activeTab === 'cursor' && <p>Paste this snippet into your projects .mcp.json or in Cursor Settings &gt; Features &gt; MCP.</p>}

          {activeTab === 'claude' && (
            <div className="space-y-1">
              <p>Paste this into <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>.</p>
              <p className="font-medium text-[#555]">Troubleshooting:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>If Claude fails to connect, ensure you have <strong>Node.js</strong> installed, as it requires <code>npx</code> to run the bridge script. You can verify by running <code>node -v</code> in your terminal.</li>
              </ul>
            </div>
          )}

          {activeTab === 'antigravity' && (
            <div className="space-y-1">
              <p>Paste this into your workspace <code>.agents/mcp_config.json</code> or global <code>~/.gemini/config/mcp_config.json</code> file.</p>
              <p>Antigravity connects directly using the remote <code>serverUrl</code> without needing any local scripts.</p>
            </div>
          )}

          {activeTab === 'web' && <p>Browser connectors (Claude.ai Web) require OAuth 2.0 and will be supported in an upcoming update. Use Claude Desktop, Cursor, or Antigravity for direct connection.</p>}
        </div>
      </div>
    </section>
  );
}
