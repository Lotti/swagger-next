export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'swagger-next',
    version: '1.0.0',
    description:
      'A small Node 24 boilerplate that exposes OpenAPI docs and sample route handlers.',
  },
  servers: [
    {
      url: '/api',
    },
  ],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        parameters: [
          {
            in: 'query',
            name: 'tags',
            required: false,
            schema: {
              items: { type: 'string' },
              type: 'array',
            },
            style: 'form',
          },
          {
            in: 'query',
            name: 'limit',
            required: false,
            schema: {
              minimum: 1,
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  items: { $ref: '#/components/schemas/Pet' },
                  type: 'array',
                },
              },
            },
            description: 'A filtered list of pets.',
          },
        },
        summary: 'List pets',
      },
      post: {
        operationId: 'createPet',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/NewPet',
              },
            },
          },
          required: true,
        },
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Pet',
                },
              },
            },
            description: 'The created pet.',
          },
        },
        summary: 'Create a pet',
      },
    },
    '/pets/{id}': {
      delete: {
        operationId: 'deletePet',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '204': {
            description: 'Pet deleted.',
          },
          '404': {
            description: 'Pet not found.',
          },
        },
        summary: 'Delete a pet',
      },
      get: {
        operationId: 'getPetById',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              type: 'integer',
            },
          },
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Pet',
                },
              },
            },
            description: 'The requested pet.',
          },
          '404': {
            description: 'Pet not found.',
          },
        },
        summary: 'Get a pet by id',
      },
    },
  },
  components: {
    schemas: {
      NewPet: {
        properties: {
          name: { type: 'string' },
          tag: { type: 'string' },
        },
        required: ['name'],
        type: 'object',
      },
      Pet: {
        allOf: [
          { $ref: '#/components/schemas/NewPet' },
          {
            properties: {
              id: { type: 'integer' },
            },
            required: ['id'],
            type: 'object',
          },
        ],
      },
    },
  },
};

export const samplePets = [
  { id: 1, name: 'Miso', tag: 'cat' },
  { id: 2, name: 'Maple', tag: 'dog' },
  { id: 3, name: 'Pico', tag: 'bird' },
];
