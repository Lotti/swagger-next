import Fastify from 'fastify';
import { Buffer } from 'node:buffer';
import { openApiDocument, samplePets } from './src/openapi.js';

const authUser =
  process.env.SWAGGER_NEXT_BASIC_AUTH_USERNAME ?? process.env.BASIC_AUTH_USERNAME ?? null;
const authPassword =
  process.env.SWAGGER_NEXT_BASIC_AUTH_PASSWORD ?? process.env.BASIC_AUTH_PASSWORD ?? null;

const docsRequireAuth = Boolean(authUser && authPassword);

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
        This repo has been modernized into a small Fastify service so it can stay
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

const parseBasicAuth = (authorizationHeader) => {
  if (!authorizationHeader?.startsWith('Basic ')) {
    return null;
  }

  const raw = authorizationHeader.slice('Basic '.length);
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

const withDocsAuth = async (request, reply) => {
  if (!docsRequireAuth) {
    return;
  }

  const credentials = parseBasicAuth(request.headers.authorization);

  if (credentials?.username === authUser && credentials?.password === authPassword) {
    return;
  }

  reply
    .code(401)
    .header('www-authenticate', 'Basic realm="swagger-next"')
    .type('text/html; charset=utf-8')
    .send('Authentication required.');
};

const filterPets = (query, pets) => {
  const tagValues = Array.isArray(query.tags)
    ? query.tags
    : typeof query.tags === 'string'
      ? [query.tags]
      : [];

  const normalizedTags = tagValues.flatMap((value) =>
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  );

  const limitValue =
    typeof query.limit === 'number'
      ? query.limit
      : Number.parseInt(String(query.limit ?? ''), 10);
  const limit = Number.isInteger(limitValue) && limitValue > 0 ? limitValue : null;

  let filtered = pets;

  if (normalizedTags.length > 0) {
    const requestedTags = new Set(normalizedTags.map((tag) => tag.toLowerCase()));
    filtered = filtered.filter((pet) => requestedTags.has((pet.tag ?? '').toLowerCase()));
  }

  return limit ? filtered.slice(0, limit) : filtered;
};

export const createAppServer = () => {
  const app = Fastify({
    logger: false,
  });

  const pets = samplePets.map((pet) => ({ ...pet }));
  let nextId = pets.reduce((maxId, pet) => Math.max(maxId, pet.id), 0) + 1;

  app.get('/', async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return createHomeHtml();
  });

  app.get('/docs', { preHandler: withDocsAuth }, async (_request, reply) => {
    reply.type('text/html; charset=utf-8');
    return createDocsHtml();
  });

  app.get('/api/openapi', { preHandler: withDocsAuth }, async () => openApiDocument);

  app.get('/api/pets', { preHandler: withDocsAuth }, async (request) =>
    filterPets(request.query, pets),
  );

  app.post('/api/pets', { preHandler: withDocsAuth }, async (request, reply) => {
    const payload = request.body ?? {};

    if (typeof payload.name !== 'string' || payload.name.trim() === '') {
      reply.code(400);
      return { error: 'The "name" field is required.' };
    }

    const pet = {
      id: nextId++,
      name: payload.name.trim(),
      ...(typeof payload.tag === 'string' && payload.tag.trim()
        ? { tag: payload.tag.trim() }
        : {}),
    };

    pets.push(pet);
    reply.code(201);
    return pet;
  });

  app.get('/api/pets/:id', { preHandler: withDocsAuth }, async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);

    if (!Number.isInteger(id)) {
      reply.code(400);
      return { error: 'Pet id must be an integer.' };
    }

    const pet = pets.find((entry) => entry.id === id);

    if (!pet) {
      reply.code(404);
      return { error: 'Not found' };
    }

    return pet;
  });

  app.delete('/api/pets/:id', { preHandler: withDocsAuth }, async (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);

    if (!Number.isInteger(id)) {
      reply.code(400);
      return { error: 'Pet id must be an integer.' };
    }

    const petIndex = pets.findIndex((entry) => entry.id === id);

    if (petIndex < 0) {
      reply.code(404);
      return { error: 'Not found' };
    }

    pets.splice(petIndex, 1);
    reply.code(204);
    return null;
  });

  app.setNotFoundHandler(async (_request, reply) => {
    reply.code(404);
    return { error: 'Not found' };
  });

  return app;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';
  const app = createAppServer();

  try {
    await app.listen({ host, port });
    console.log(`swagger-next listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
