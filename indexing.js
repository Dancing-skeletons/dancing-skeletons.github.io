const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const SONGS_FOLDER = path.join(__dirname, "songs");  // where song HTML files live
const ROOT_FOLDER = __dirname; // main folder where scripts + index.html go
const md = new MarkdownIt();

function extractTitle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");

  // Try to extract the first <h1>...</h1>
  const match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (match) return match[1].trim();

  // fallback to filename if no <h1> is found
  return path.basename(filePath, ".html");
}

function buildIndex() {
  const files = fs.readdirSync(SONGS_FOLDER)
    .filter(f => f.endsWith(".html"))
    .sort();

  // Build Markdown list of songs
  const mdLines = ["# Songbook 💀︎🎸", ""];
  for (const file of files) {
    const filePath = path.join(SONGS_FOLDER, file);
    const title = extractTitle(filePath);
    mdLines.push(`- [${title}](songs/${file})`); // link relative to root
  }

  const mdContent = mdLines.join("\n");

  // Optional: save an index.md in the songs folder for reference
//  const mdPath = path.join(SONGS_FOLDER, "index.md");
//  fs.writeFileSync(mdPath, mdContent, "utf8");

  // Convert Markdown to HTML
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dancing Skeletons Ukulele Secret Society</title>
  <style>
    body { 
      font-family: system-ui, Arial, sans-serif;
      padding: 1rem;
      line-height: 1.6;
      column-gap: 2em;
    }
    pre {
      font-size: 18px;
    }
  </style>
</head>
<body>
${md.render(mdContent)}
</body>
</html>`;

  // Save index.html in root folder
  const htmlPath = path.join(ROOT_FOLDER, "index.html");
  fs.writeFileSync(htmlPath, htmlContent, "utf8");

  console.log(`✅ Created index.html in root with ${files.length} songs.`);
}

buildIndex();
