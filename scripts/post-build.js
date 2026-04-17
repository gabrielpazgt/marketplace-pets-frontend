const { writeFileSync } = require('fs');
const { join } = require('path');

writeFileSync(
  join(__dirname, '..', 'dist', 'marketplace-frontend', 'browser', '_redirects'),
  '/* /index.html 200\n',
  'utf8'
);
console.log('[post-build] _redirects written to dist');
