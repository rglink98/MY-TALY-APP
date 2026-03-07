import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for headers like X-Forwarded-Proto
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  // Use helmet for security but disable frameguard to allow framing
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "frame-ancestors": ["'self'", "https://sites.google.com", "https://*.google.com", "https://*.googleusercontent.com", "https://*.run.app", "https://*.google.co.in", "https://*.google.com.bd"],
          "frame-src": ["'self'", "https://sites.google.com", "https://*.google.com", "https://*.googleusercontent.com", "https://*.google.co.in", "https://*.google.com.bd"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://*.google.com"],
          "connect-src": ["'self'", "https://*", "http://*"],
          "img-src": ["'self'", "data:", "https://*", "http://*"],
        },
      },
      frameguard: false, // Disable X-Frame-Options: SAMEORIGIN
    })
  );

  // Enable CORS for all origins
  app.use(cors());

  // Manual override to ensure framing headers are correct
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.removeHeader("X-Frame-Options");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    next();
  });

  // API routes go here
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Explicitly handle index.html if Vite doesn't
    app.get("/index.html", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "index.html"));
    });

    app.use(vite.middlewares);
  } else {
    // Production serving logic
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
