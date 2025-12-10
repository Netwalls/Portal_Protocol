# Portal Frontend

This folder contains a standalone Vite + React + TypeScript + Tailwind project used to preview the Portal static page inside a React app.

Quick start

1. Install dependencies

```bash
cd portal_frontend
npm install
```

2. Run dev server

```bash
npm run dev
```

The dev server will start (default port 5173) and open the portal. The page's DOM and styles are injected from `src/generatedPortalHtml.ts`. The original page's inline script (wallet/connect, event handlers) is not ported — if you want full interactivity I'll port that into React components next.
