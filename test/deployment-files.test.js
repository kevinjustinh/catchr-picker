const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publishedHtml = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .sort();

assert.deepStrictEqual(
  publishedHtml,
  ['picker.html'],
  'the public Picker root must publish only the production Picker page'
);

console.log('Picker deployment surface is restricted to picker.html');
