<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1548a2fc-f2cb-4001-b3aa-eb8b251fec2b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Reverse proxy (HTTPS subpath, e.g. https://example.com/ralli/)

Do **not** hardcode the domain in code. Build with a base path:

```bash
# docker-compose.yml or build args
VITE_BASE_PATH=/ralli/
BASE_PATH=/ralli
```

Example nginx (prefix stripped toward the container):

```nginx
location /ralli/ {
  proxy_pass http://127.0.0.1:3000/;   # trailing slash strips /ralli
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

If the proxy does **not** strip the prefix, set `BASE_PATH=/ralli` so Express rewrites URLs.

Assets and `/api/rooms` + WebSocket use the same public base path as the page.
