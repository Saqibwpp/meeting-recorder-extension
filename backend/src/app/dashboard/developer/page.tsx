'use client';

import { useState } from 'react';
import { useApiKeys, useGenerateApiKey, useRevokeApiKey } from '@/hooks/useApiKeys';
import { useAuth } from '@/hooks/useAuth';
import { List, Mic, Search, CheckSquare, Zap, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiKeyItem } from '@/hooks/useApiKeys';

const tools = [
  [List, "list_meetings", "List recent meetings with dates, durations, and summaries."],
  [Mic, "get_meeting_transcript", "Retrieve the speaker-labelled transcript, summary, and audio URL."],
  [Search, "search_meetings", "Search across titles, summaries, and dialogue transcripts."],
  [CheckSquare, "get_action_items", "Collect assigned tasks and action items across meetings."],
];

export default function DeveloperPage() {
  const { user } = useAuth();
  const { data: apiKeys, isLoading } = useApiKeys(user);
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();
  
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [client, setClient] = useState("Cursor");
  
  if (!user) return null;

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyConfig = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const clients = ["Cursor", "Claude", "Antigravity", "Web"];
  
  const mcpConfig = (key: string, clientName: string) => {
    const backendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const mcpEndpointUrl = `${backendUrl}/api/mcp`;

    if (clientName === "Claude") {
      return JSON.stringify({
        mcpServers: {
          "embrace-meetings": {
            command: "npx",
            args: [
              "-y",
              "mcp-remote",
              mcpEndpointUrl,
              "--header",
              `Authorization: Bearer ${key}`
            ]
          }
        }
      }, null, 2);
    }
    
    if (clientName === "Antigravity") {
      return JSON.stringify({
        mcpServers: {
          "embrace-meetings": {
            serverUrl: mcpEndpointUrl,
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json"
            }
          }
        }
      }, null, 2);
    }

    if (clientName === "Web") {
      return `// Claude.ai Web browser connectors require an OAuth 2.0 authorization server.\n// OAuth 2.0 support will be added in an upcoming release.\n// For now, use Claude Desktop App, Antigravity, Cursor, or Windsurf via the tabs above.`;
    }
    
    // Default SSE configuration for Cursor
    return JSON.stringify({
      mcpServers: {
        "embrace-meetings": {
          url: mcpEndpointUrl,
          headers: {
            Authorization: `Bearer ${key}`
          }
        }
      }
    }, null, 2);
  };

  const activeKey = apiKeys?.[0];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-primary mb-2">Workspace / Developer</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">Developer & MCP</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your access keys and AI assistant connections.</p>
      </div>

      <section className="rounded-lg border border-border bg-surface shadow-soft p-6">
        <div className="flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-section-lilac text-primary">
              <Zap size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Model Context Protocol integration</h2>
              <p className="mt-1 text-sm text-muted-foreground">Connect your AI coding assistants and agents to recorded meetings.</p>
            </div>
          </div>
          <Button 
            onClick={() => generateApiKey.mutate({ user, name: 'Team AI Assistant' })}
            isLoading={generateApiKey.isPending}
            className="shrink-0"
          >
            Generate new key
          </Button>
        </div>

        <div className="py-6 border-b border-border">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your active keys</p>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading keys...</div>
            ) : !apiKeys || apiKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-background rounded-md p-4 border border-border text-center">
                No active API keys found. Generate one to get started.
              </div>
            ) : (
              apiKeys.map((key: ApiKeyItem) => (
                <div key={key.apiKey} className="flex flex-col gap-3 rounded-md border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col">
                    <code className="overflow-hidden text-ellipsis font-mono text-xs font-semibold text-foreground bg-surface px-2 py-1 rounded border border-border w-fit">{key.apiKey}</code>
                    <span className="text-[11px] text-muted-foreground mt-2">{key.name} • Created {new Date(key.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(key.apiKey, key.apiKey)}>
                      <Clipboard className="w-3.5 h-3.5 mr-1.5" />
                      {copiedKeyId === key.apiKey ? "Copied" : "Copy key"}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => revokeApiKey.mutate({ user, apiKey: key.apiKey })}>
                      {revokeApiKey.isPending ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">One-click client configuration</p>
            <div className="flex overflow-x-auto rounded-md bg-muted p-1">
              {clients.map((item) => (
                <button 
                  key={item} 
                  onClick={() => setClient(item)} 
                  className={`whitespace-nowrap rounded px-3 py-1.5 text-xs transition-colors ${
                    client === item ? "bg-surface font-medium shadow-soft text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          
          <div className="relative mt-5 overflow-auto rounded-md bg-code p-5 border border-border shadow-inner">
            <Button 
              className="absolute right-3 top-3" 
              variant="code" 
              size="sm" 
              onClick={() => handleCopyConfig(activeKey ? mcpConfig(activeKey.apiKey, client) : mcpConfig("embrace_live_...", client))}
              disabled={!activeKey}
            >
              <Clipboard className="w-3.5 h-3.5 mr-1.5" />
              {copiedConfig ? "Copied" : "Copy config"}
            </Button>
            <pre className="pr-28 font-mono text-[11px] leading-6 text-code-foreground">
              <code>{activeKey ? mcpConfig(activeKey.apiKey, client) : mcpConfig("embrace_live_••••••••", client)}</code>
            </pre>
          </div>
          
          <div className="mt-4 text-[11px] text-muted-foreground space-y-2">
            {client === 'Cursor' && <p>Paste this snippet into your projects .mcp.json or in Cursor Settings &gt; Features &gt; MCP.</p>}
            {client === 'Claude' && (
              <div className="space-y-1">
                <p>Paste this into <code className="bg-muted px-1 py-0.5 rounded text-foreground">~/Library/Application Support/Claude/claude_desktop_config.json</code>.</p>
                <p className="mt-2 text-foreground font-medium">Troubleshooting:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>If Claude fails to connect, ensure you have Node.js installed, as it requires <code className="bg-muted px-1 py-0.5 rounded text-foreground">npx</code> to run the bridge script.</li>
                </ul>
              </div>
            )}
            {client === 'Antigravity' && (
              <div className="space-y-1">
                <p>Paste this into your workspace <code className="bg-muted px-1 py-0.5 rounded text-foreground">.agents/mcp_config.json</code> or global <code className="bg-muted px-1 py-0.5 rounded text-foreground">~/.gemini/config/mcp_config.json</code> file.</p>
                <p>Antigravity connects directly using the remote serverUrl without needing any local scripts.</p>
              </div>
            )}
            {client === 'Web' && <p>Browser connectors (Claude.ai Web) require OAuth 2.0 and will be supported in an upcoming update. Use Claude Desktop, Cursor, or Antigravity for direct connection.</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map(([Icon, title, description]) => { 
          const ToolIcon = Icon as typeof List; 
          return (
            <article key={title as string} className="rounded-lg border border-border bg-surface p-5 shadow-soft hover:shadow-editorial transition-shadow">
              <ToolIcon size={20} className="text-primary mb-4" />
              <h3 className="font-mono text-sm font-semibold tracking-tight text-foreground">{title as string}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description as string}</p>
            </article>
          ); 
        })}
      </div>
    </div>
  );
}
