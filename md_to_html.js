const fs = require('fs');
const path = require('path');

const {
  renderSong
} = require('./md_renderer');

const input = process.argv[2];

if (!input) {
  console.error(
    'Usage: node md_to_html.js input.md'
  );
  process.exit(1);
}

const out =
  process.argv[3] ||
  input.replace(/\.md$/, '.html');

const src =
  fs.readFileSync(input, 'utf8');

const html =
  renderSong(
    src, input
  );
//    path.basename(input)
//  );

fs.writeFileSync(out, html);

console.log('Wrote', out);