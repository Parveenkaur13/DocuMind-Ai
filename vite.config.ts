import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

function loadRootEnv() {
  try {
    const envFile = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf-8');
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = (match[2] || '').trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore
  }
}

function serverlessApiPlugin(): Plugin {
  loadRootEnv();
  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const urlPath = req.url.split('?')[0];
        const routeName = urlPath.replace(/^\/api\//, '').replace(/\/+$/, '');
        const jsFile = path.resolve(`api/${routeName}.js`);
        if (!fs.existsSync(jsFile)) return next();

        loadRootEnv();

        try {
          const fileUrl = pathToFileURL(jsFile).href;
          const mod = await import(fileUrl);
          if (mod && typeof mod.default === 'function') {
            let body = '';
            req.on('data', (chunk: Buffer) => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                if (body) {
                  try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (req as any).body = JSON.parse(body);
                  } catch {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (req as any).body = body;
                  }
                }
                await mod.default(req, res);
              } catch (err: unknown) {
                console.error(`[Dev API Error on ${urlPath}]:`, err);
                if (!res.writableEnded) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
                }
              }
            });
            return;
          }
        } catch (err) {
          console.error('[Dev API Module Error]:', err);
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), serverlessApiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'docx-vendor': ['mammoth'],
        },
      },
    },
  },
});
