const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const SONGS_FOLDER = path.join(__dirname, "songs");
const PDF_FOLDER = path.join(__dirname, "tabs");
const ROOT_FOLDER = __dirname;

const md = new MarkdownIt();

// Extract title from HTML file (use <h1> or fallback to filename)
function extractTitle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? match[1].trim() : path.basename(filePath, ".html");
}

function buildIndex() {
  // --- HTML Songs ---
  const htmlFiles = fs.existsSync(SONGS_FOLDER)
    ? fs.readdirSync(SONGS_FOLDER).filter(f => f.endsWith(".html")).sort()
    : [];

  // --- PDFs ---
  const pdfFiles = fs.existsSync(PDF_FOLDER)
    ? fs.readdirSync(PDF_FOLDER).filter(f => f.endsWith(".pdf")).sort()
    : [];

  // Build Markdown content
  const mdLines = ["# Songbook 💀︎🎸", ""];

  // Songs section
  mdLines.push("## Songs", "");
  if (htmlFiles.length > 0) {
    for (const file of htmlFiles) {
      const title = extractTitle(path.join(SONGS_FOLDER, file));
      mdLines.push(`- [${title}](songs/${file})`);
    }
  } else {
    mdLines.push("_No songs found._");
  }

  // PDFs section
  if (pdfFiles.length > 0) {
    mdLines.push("", "## Tabs - Ne pas reproduire", "");
    for (const pdf of pdfFiles) {
      const title = path.basename(pdf, ".pdf").replace(/_/g, " ");
      const url = encodeURI(`tabs/${pdf}`);  // this ensures spaces and special characters work
      mdLines.push(`- [${title}](${url})`);
    }
  }

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
    pre { font-size: 18px; }
    h2 { margin-top: 2rem; color: #333; }
    a { color: darkblue; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${md.render(mdLines.join("\n"))}
</body>
</html>`;

  // Write to root folder
  const htmlPath = path.join(ROOT_FOLDER, "index.html");
  fs.writeFileSync(htmlPath, htmlContent, "utf8");

  console.log(`✅ Created index.html with ${htmlFiles.length} songs and ${pdfFiles.length} PDFs.`);
}

buildIndex();
