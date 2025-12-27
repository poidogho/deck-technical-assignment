import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export const docsRouter = Router();

// Load and parse OpenAPI spec (relative to project root)
const openApiPath = join(process.cwd(), 'docs/openapi.yaml');
const openApiSpec = yaml.load(readFileSync(openApiPath, 'utf-8'));

// Serve Swagger UI
docsRouter.use('/', swaggerUi.serve);
docsRouter.get('/', swaggerUi.setup(openApiSpec as swaggerUi.JsonObject));

// Serve raw OpenAPI spec as JSON
docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Serve raw OpenAPI spec as YAML
docsRouter.get('/openapi.yaml', (_req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.send(readFileSync(openApiPath, 'utf-8'));
});
