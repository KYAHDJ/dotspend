// Vercel Serverless Function — secure Groq proxy for the DotSpend AI Financial
// Butler. The Groq API key is read from the SERVER environment so it is never
// exposed to the browser. The financial context is sent by the client as a
// structured object and turned into a "Financial Butler" system prompt here on
// the server (so prompt logic also stays out of the bundle).
//
// Production: the key is provided as `GROQ_API_KEY` in the Vercel project
// environment variables (Settings -> Environment Variables).
//
// Local dev with the Vite dev server (`npm run dev`): a middleware in
// vite.config.ts serves the same `/api/chat` route and reads `GROQ_API_KEY`
// from the project `.env` file, so the key never reaches the browser either.
//
// This proxies Groq's streaming chat completions and re-streams deltas to the
// client as Server-Sent Events so the frontend can render text live.

import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
  assembleMessages,
  buildSystemPrompt,
  DEFAULT_MODEL,
  proxyToGroq,
  streamDeltas,
  type FinancialContext,
} from "../src/lib/groqProxy";

interface ChatRequestBody {
  model?: string;
  user: string;
  history?: { role: "user" | "assistant"; content: string }[];
  context: FinancialContext;
}

async function pipeStream(upstream: Response, res: VercelResponse) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    for await (const chunk of streamDeltas(upstream)) {
      if (chunk.done) break;
      res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } finally {
    res.end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error:
        "GROQ_API_KEY is not configured on the server. Set it in the Vercel project environment variables.",
    });
  }

  const body = (req.body || {}) as ChatRequestBody;
  const user = typeof body.user === "string" ? body.user.trim() : "";
  if (!user) {
    return res.status(400).json({ error: "Missing user message" });
  }

  const messages = assembleMessages({
    context: body.context,
    history: body.history,
    user,
  });

  try {
    const { res: upstream, status } = await proxyToGroq({
      apiKey,
      model: body.model || DEFAULT_MODEL,
      messages,
    });

    if (!upstream) {
      return res.status(status || 500).json({ error: "Groq request failed" });
    }

    return pipeStream(upstream, res);
  } catch (err) {
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Proxy error",
    });
  }
}