# Embrace AI - MCP Connect & Setup Guide

This guide explains how to connect AI assistants (Cursor, Windsurf, Claude Desktop, Antigravity, and Claude.ai / Gemini Spark) to your Embrace AI meeting database.

---

## 1. Getting Your API Key

1. Navigate to your Embrace AI Web Dashboard:  
   `https://meeting-recorder-extension.vercel.app/dashboard`
2. Sign in with your Google account.
3. In the **Model Context Protocol (MCP) Integration** section, click **"Generate New AI Key"**.
4. Copy your generated key (starts with `embrace_live_...`).

---

## 2. Connecting to Your AI Client

### A. Cursor / Windsurf IDE

1. Create or update `.mcp.json` in your project root, OR open **Cursor Settings ➔ Features ➔ MCP**:
2. Add the following server configuration:
```json
{
  "mcpServers": {
    "embrace-meetings": {
      "url": "https://meeting-recorder-extension.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_EMBRACE_API_KEY"
      }
    }
  }
}
```

---

### B. Claude Desktop App (Mac & Windows)

1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add the following entry to `mcpServers`:
```json
{
  "mcpServers": {
    "embrace-meetings": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://meeting-recorder-extension.vercel.app/api/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer YOUR_EMBRACE_API_KEY"
      }
    }
  }
}
```
3. Restart Claude Desktop. The hammer 🛠️ icon will appear with your Embrace AI tools!

---

### C. Antigravity / Gemini CLI

In your workspace (`.agents/mcp_config.json`) or user (`~/.gemini/config/mcp_config.json`):
```json
{
  "mcpServers": {
    "embrace-meetings": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://meeting-recorder-extension.vercel.app/api/mcp",
        "--header",
        "Authorization:${AUTH_HEADER}"
      ],
      "env": {
        "AUTH_HEADER": "Bearer YOUR_EMBRACE_API_KEY"
      }
    }
  }
}
```

> [!TIP]
> **Why use the `env` split?**
> - **Security**: Prevents your API key from being exposed in process listings (`ps aux`).
> - **Cross-Platform**: Avoids Windows argument escaping/space-splitting issues with `"Bearer ..."`.
> - Alternatively, writing `"Authorization: Bearer YOUR_KEY"` directly in `--header` also works if preferred.

---

### D. Claude.ai Web vs Desktop Note

> [!NOTE]
> **Claude.ai Web Connectors** require a full OAuth 2.0 Dynamic Client Registration server (DCR).
> For desktop IDEs & assistants (**Claude Desktop**, **Antigravity**, **Cursor**, **Windsurf**), use the direct MCP configs above with your `embrace_live_...` API key.

---

## 3. Available MCP Tools

| Tool Name | Description | Example Prompt |
|---|---|---|
| `list_meetings` | Lists recent recorded meetings with dates, durations, and summaries. | *"What meetings did I record this week?"* |
| `get_meeting_transcript` | Fetches the full speaker-diarized transcript and action items. | *"Give me the full transcript of my standup."* |
| `search_meetings` | Searches past meetings for keywords across titles, summaries, and dialogues. | *"Find all discussions mentioning the Q3 budget or marketing roadmap."* |
| `get_action_items` | Aggregates all open action items and assignments across meetings. | *"What are all pending action items assigned to me across my meetings?"* |

---

## 4. Security & Privacy
- **Strict User Isolation**: All tool calls are automatically filtered by your Firebase `userId`. Teammates cannot access each other's transcripts.
- **Revocable**: You can revoke any API key at any time directly from the Dashboard.
