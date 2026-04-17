/**
 * Generates environment.production.ts from env vars before ng build.
 * Required by Render (and any CI/CD) so the API URL is not hardcoded.
 *
 * Usage: node scripts/set-env.js
 * Env var: API_BASE_URL — defaults to http://localhost:1338 if not set.
 */

const { writeFileSync } = require('fs');
const { join } = require('path');

const apiBaseUrl = process.env['API_BASE_URL'] || 'http://localhost:1338';

const content = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
};
`;

const outPath = join(__dirname, '..', 'src', 'environments', 'environment.production.ts');
writeFileSync(outPath, content, 'utf8');

console.log(`[set-env] environment.production.ts written — apiBaseUrl: ${apiBaseUrl}`);
