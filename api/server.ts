import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local first, then fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();
import express from "express";
import aiRouter from "./ai.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "5mb" }));

// Memory rate limiter to prevent API abuse/spamming
const ipLimits = new Map<string, { count: number; resetTime: number }>();
const rateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const now = Date.now();
    
    let record = ipLimits.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipLimits.set(ip, record);
      next();
    } else {
      record.count++;
      if (record.count > maxRequests) {
        res.status(429).json({ 
          error: "Terlalu banyak permintaan. Silakan tunggu beberapa saat lagi." 
        });
        return;
      }
      next();
    }
  };
};

// Apply 20 requests/min rate limit on Gemini AI Chatbot route
app.use("/api/ai", rateLimiter(20, 60000), aiRouter);

import https from "https";

// Proxy route for Supabase REST and Auth endpoints to bypass CORS and DNS blocks
// Apply 100 requests/min rate limit to protect cloud database resource usage
app.all("/api/supabase-proxy/*splat", rateLimiter(100, 60000), (req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  if (!supabaseUrl) {
    res.status(500).json({ error: "Supabase URL is not configured on the server" });
    return;
  }

  // Extract path and query params from originalUrl
  const path = req.originalUrl.replace("/api/supabase-proxy", "");
  const targetUrl = `${supabaseUrl}${path}`;
  const parsedUrl = new URL(targetUrl);

  // Filter and forward only necessary headers to Supabase
  const headers = {} as Record<string, string>;
  const allowedHeaders = ['apikey', 'authorization', 'content-type', 'prefer', 'range', 'x-client-info', 'user-agent'];
  for (const name of allowedHeaders) {
    const value = req.headers[name];
    if (typeof value === 'string') {
      headers[name] = value;
    }
  }

  // Add default Accept header
  headers['accept'] = 'application/json, text/plain, */*';

  const bodyData = req.method !== 'GET' && req.method !== 'HEAD' && req.body
    ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
    : null;

  if (bodyData) {
    headers['content-length'] = Buffer.byteLength(bodyData).toString();
  }

  const options = {
    method: req.method,
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    headers: headers,
  };

  console.log(`[Proxy https] ${req.method} -> ${targetUrl}`);

  const proxyReq = https.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode || 500;
    
    // Copy headers back to the client
    for (const [key, value] of Object.entries(proxyRes.headers)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== 'content-encoding' && 
        lowerKey !== 'transfer-encoding' && 
        lowerKey !== 'content-length' &&
        value
      ) {
        res.setHeader(key, value);
      }
    }
    
    // Stream response
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error("Proxy https request error:", err);
    res.status(500).json({ error: err.message || "Internal server error during proxying" });
  });

  if (bodyData) {
    proxyReq.write(bodyData);
  }
  proxyReq.end();
});

// Di Vercel, kita tidak menjalankan app.listen() dan tidak menggunakan Vite Middleware
// Kita langsung eksport `app` agar Vercel mengenali ini sebagai Serverless Function
if (!process.env.VERCEL) {
  async function startLocalServer() {
    // Vite middleware untuk development
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  startLocalServer();
}

export default app;
