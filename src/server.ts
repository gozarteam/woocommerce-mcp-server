// server.ts
import express from 'express';
import cors from 'cors';
import { handleWooCommerceRequest } from './mcp-core';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/events', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (id: string, data: any) => {
    res.write(`id: ${id}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const method = req.query.method as string;
  const rawParams = req.query.params as string;

  if (!method || !rawParams) {
    sendEvent('error', { error: 'Missing method or params' });
    return res.end();
  }

  try {
    const params = JSON.parse(rawParams);
    const result = await handleWooCommerceRequest(method, params);
    sendEvent('result', { result });
  } catch (err: any) {
    sendEvent('error', { message: err.message || 'Unknown error' });
  }

  // Close connection (for long polling, remove this line and stream multiple updates)
  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SSE server running at http://localhost:${PORT}`);
});
