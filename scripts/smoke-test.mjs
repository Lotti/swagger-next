import assert from 'node:assert/strict';
import { createAppServer } from '../server.js';

const server = createAppServer();
const baseUrl = await server.listen({
  host: '127.0.0.1',
  port: 0,
});

try {
  const openApiResponse = await fetch(`${baseUrl}/api/openapi`);
  assert.equal(openApiResponse.status, 200);

  const openApi = await openApiResponse.json();
  assert.equal(openApi.openapi, '3.1.0');

  const petsResponse = await fetch(`${baseUrl}/api/pets?tags=dog&limit=1`);
  assert.equal(petsResponse.status, 200);

  const pets = await petsResponse.json();
  assert.equal(pets.length, 1);
  assert.equal(pets[0].tag, 'dog');

  const createResponse = await fetch(`${baseUrl}/api/pets`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Comet',
      tag: 'fox',
    }),
  });

  assert.equal(createResponse.status, 201);

  const createdPet = await createResponse.json();
  assert.equal(createdPet.name, 'Comet');

  const createdPetResponse = await fetch(`${baseUrl}/api/pets/${createdPet.id}`);
  assert.equal(createdPetResponse.status, 200);

  const deletedResponse = await fetch(`${baseUrl}/api/pets/${createdPet.id}`, {
    method: 'DELETE',
  });
  assert.equal(deletedResponse.status, 204);

  const missingPetResponse = await fetch(`${baseUrl}/api/pets/${createdPet.id}`);
  assert.equal(missingPetResponse.status, 404);

  const docsResponse = await fetch(`${baseUrl}/docs`);
  assert.equal(docsResponse.status, 200);

  console.log(`Smoke test passed using ${baseUrl}`);
} finally {
  await server.close();
}
