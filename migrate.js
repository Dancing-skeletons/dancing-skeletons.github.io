const fs = require("fs");
const path = require("path");

const input = process.argv[2];

if (!input) {
  console.error("Usage: node migrate.js file.md");
  process.exit(1);
}

let text = fs.readFileSync(input, "utf8");

/* -------------------------
   UKE CHORDS → NEW SYNTAX
-------------------------- */
text = text.replace(
  /<uke-chord\s+name="([^"]+)"\s+frets="([^"]+)".*?><\/uke-chord>/g,
  (m, name, frets) => {
    return `[chord:${name} ${frets}]`;
  }
);

/* -------------------------
   STRUM BLOCKS
-------------------------- */
text = text.replace(
  /<pre class="tableau">([\s\S]*?)<\/pre>/g,
  (_, content) => {
    return `:::strum\n${content.trim()}\n:::`;
  }
);

/* -------------------------
   OPTIONAL CLEANUP
-------------------------- */
// remove empty spaces or double breaks if needed

fs.writeFileSync(input.replace(/\.md$/, ".v2.md"), text, "utf8");

console.log("Migrated:", input);