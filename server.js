import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';
import { openApiDocument, samplePets } from './src/openapi.js';

const authUser =
  process.env.SWAGGER_NEXT_BASIC_AUTH_USERNAME ?? process.env.BASIC_AUTH_USERNAME ?? null;
const authPassword =
  process.env.SWAGGER_NEXT_BASIC_AUTH_PASSWORD ?? process.env.BASIC_AUTH_PASSWORD ?? null;

const docsRequireAuth = Boolean(authUser && authPassword);

const json = (body, statusCode = 200, extraHeaders = {}) => ({
  body: JSON.stringify(body, null, 2),
  headers: {
    'content-type': 'application/json; charset=utf-8',
    ...extraHeaders,
  },
  statusCode,
});

const text = (body, statusCode = 200, extraHeaders = {}) => ({
  body,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    ...extraHeaders,
  },
  statusCode,
});

const noContent = () => ({
  body: '',
  headers: {},
  statusCode: 204,
});

const unauthorized = () =>
  text('Authentication required.', 401, {
    'www-authenticate': 'Basic realm="swagger-next"',
  });

const notFound = () => json({ error: 'Not found' }, 404);

const badRequest = (message) => json({ error: message }, 400);

const createDocsHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>swagger-next</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Helvetica Neue", sans-serif;
      }

      body {
        margin: 0;
        background:
          radial-gradient(circle at top left, #d7f6ff 0, transparent 35%),
          linear-gradient(180deg, #f5f0e8 0%, #fffdf8 100%);
      }

      .hero {
        padding: 2rem 1.5rem 1rem;
      }

      .hero h1 {
        margin: 0 0 0.5rem;
        font-size: clamp(2rem, 6vw, 3.5rem);
      }

      .hero p {
        margin: 0;
        max-width: 42rem;
        line-height: 1.6;
      }

      .links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .links a {
        color: #06255c;
        font-weight: 600;
      }

      #redoc-container {
        padding: 0 1rem 2rem;
      }
    </style>
  </head>
  <body>
    <section class="hero">
      <h1>swagger-next</h1>
      <p>
        Lightweight OpenAPI playground for old sample projects. The API document is
        served from <code>/api/openapi</code> and the sample resources live under
        <code>/api/pets</code>.
      </p>
      <div class="links">
        <a href="/">Home</a>
        <a href="/api/openapi">OpenAPI JSON</a>
        <a href="/api/pets">Sample data</a>
      </div>
    </section>
    <div id="redoc-container"></div>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
    <script>
      Redoc.init('/api/openapi', {}, document.getElementById('redoc-container'));
    </script>
  </body>
</html>`;

const createHomeHtml = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>swagger-next</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "IBM Plex Sans", "Helvetica Neue", sans-serif;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          linear-gradient(135deg, rgba(14, 165, 233, 0.18), transparent 45%),
          linear-gradient(180deg, #1c2333 0%, #27344d 100%);
        color: #f7f3e9;
      }

      main {
        width: min(56rem, calc(100vw - 2rem));
        background: rgba(9, 15, 25, 0.78);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 28px;
        padding: 2rem;
        box-shadow: 0 22px 70px rgba(0, 0, 0, 0.22);
      }

      h1 {
        margin: 0 0 0.75rem;
        font-size: clamp(2rem, 8vw, 4rem);
      }

      p {
        line-height: 1.7;
        max-width: 42rem;
      }

      ul {
        padding-left: 1.25rem;
      }

      a {
        color: #8fe7ff;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>swagger-next</h1>
      <p>
        This repo has been modernized into a small Node 24 service so it can stay
        alive without dragging a large vulnerable frontend stack behind it.
      </p>
      <ul>
        <li><a href="/docs">Interactive API docs</a></li>
        <li><a href="/api/openapi">OpenAPI JSON</a></li>
        <li><a href="/api/pets">Sample pets collection</a></li>
      </ul>
    </main>
  </body>
</html>`;

const parseBasicAuth = (request) => {
  const header = request.headers.authorization;

  if (!header?.startsWith('Basic ')) {
    return null;
  }

  const raw = header.slice('Basic '.length);
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex < 0) {
    return null;
  }

  return {
    password: decoded.slice(separatorIndex + 1),
    username: decoded.slice(0, separatorIndex),
  };
};

const hasValidDocsAuth = (request) => {
  if (!docsRequireAuth) {
    return true;
  }

  const credentials = parseBasicAuth(request);

  return credentials?.username === authUser && credentials?.password === authPassword;
};

const readJsonBody = async (request) => {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
};

const filterPets = (url, pets) => {
  const tags = url.searchParams.getAll('tags').flatMap((value) => value.split(','));
  const normalizedTags = tags.map((tag) => tag.trim()).filter(Boolean);
  const limitValue = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : null;

  let filtered = pets;

  if (normalizedTags.length > 0) {
    const requestedTags = new Set(normalizedTags.map((tag) => tag.toLowerCase()));
    filtered = filtered.filter((pet) => requestedTags.has((pet.tag ?? '').toLowerCase()));
  }

  return limit ? filtered.slice(0, limit) : filtered;
};

export const createAppServer = () => {
  const pets = samplePets.map((pet) => ({ ...pet }));
  let nextId = pets.reduce((maxId, pet) => Math.max(maxId, pet.id), 0) + 1;

  return createServer(async (request, response) => {
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', 'http://localhost');

    try {
      let result = null;

      if (url.pathname === '/') {
        result = text(createHomeHtml());
      } else if (url.pathname === '/docs') {
        result = hasValidDocsAuth(request) ? text(createDocsHtml()) : unauthorized();
      } else if (url.pathname === '/api/openapi') {
        result = hasValidDocsAuth(request) ? json(openApiDocument) : unauthorized();
      } else if (url.pathname === '/api/pets' && method === 'GET') {
        result = hasValidDocsAuth(request) ? json(filterPets(url, pets)) : unauthorized();
      } else if (url.pathname === '/api/pets' && method === 'POST') {
        if (!hasValidDocsAuth(request)) {
          result = unauthorized();
        } else {
          const payload = await readJsonBody(request);

          if (typeof payload.name !== 'string' || payload.name.trim() === '') {
            result = badRequest('The "name" field is required.');
          } else {
            const pet = {
              id: nextId++,
              name: payload.name.trim(),
              ...(typeof payload.tag === 'string' && payload.tag.trim()
                ? { tag: payload.tag.trim() }
                : {}),
            };

            pets.push(pet);
            result = json(pet, 201);
          }
        }
      } else if (url.pathname.startsWith('/api/pets/')) {
        if (!hasValidDocsAuth(request)) {
          result = unauthorized();
        } else {
          const id = Number.parseInt(url.pathname.slice('/api/pets/'.length), 10);

          if (!Number.isInteger(id)) {
            result = badRequest('Pet id must be an integer.');
          } else {
            const petIndex = pets.findIndex((pet) => pet.id === id);

            if (petIndex < 0) {
              result = notFound();
            } else if (method === 'GET') {
              result = json(pets[petIndex]);
            } else if (method === 'DELETE') {
              pets.splice(petIndex, 1);
              result = noContent();
            } else {
              result = json({ error: 'Method not allowed' }, 405, {
                allow: 'DELETE, GET',
              });
            }
          }
        }
      }

      if (!result) {
        result = notFound();
      }

      response.writeHead(result.statusCode, result.headers);
      response.end(result.body);
    } catch (error) {
      response.writeHead(500, {
        'content-type': 'application/json; charset=utf-8',
      });
      response.end(
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : 'Unexpected error',
          },
          null,
          2,
        ),
      );
    }
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const server = createAppServer();

  server.listen(port, () => {
    console.log(`swagger-next listening on http://127.0.0.1:${port}`);
  });
}
