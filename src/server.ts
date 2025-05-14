import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { handleWooCommerceRequest } from "./mcp-core.js"; // ✅ your existing logic

const app = express();
const server = new McpServer({
  name: "woocommerce-mcp",
  version: "1.0.0"
});

// 🛠️ Tool: JSON-RPC wrapper over WooCommerce API
server.tool(
  "woocommerce",
  {
    method: z.string(),
    params: z.record(z.any())
  },
  async (args) => {
    const { method, params } = args;

    try {
      const result = await handleWooCommerceRequest(method, params);
      return {
        content: [
          {
            type: "resource",
            resource: {
              mimeType: "application/json",
              text: JSON.stringify(result)
            }
          }
        ]
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${err.message || "Unknown error"}`
          }
        ]
      };
    }
  }
);


// SSE setup
const transports: { [sessionId: string]: SSEServerTransport } = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  console.log("SSE session started:", transport.sessionId);

  res.on("close", () => {
    console.log("SSE session closed:", transport.sessionId);
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ WooCommerce MCP server running on port ${PORT}`);
});
