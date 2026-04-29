const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const ROOT_FOLDER = __dirname;

// Folders
const UKE_SONGS = path.join(__dirname, "ukulele", "songs");
const UKE_TABS  = path.join(__dirname, "ukulele", "tabs");

const GUITAR_SONGS = path.join(__dirname, "guitar", "songs");
const GUITAR_TABS  = path.join(__dirname, "guitar", "tabs");

const md = new MarkdownIt();

// Extract title from HTML file
function extractTitle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? match[1].trim() : path.basename(filePath, ".html");
}

// Generic helpers
function listHtml(folder, urlPrefix) {
  if (!fs.existsSync(folder)) return ["_No songs found._"];

  const files = fs.readdirSync(folder)
    .filter(f => f.endsWith(".html"))
    .sort();

  if (files.length === 0) return ["_No songs found._"];

  return files.map(file => {
    const title = extractTitle(path.join(folder, file));
    return `- [${title}](${urlPrefix}/${file})`;
  });
}

function listPdf(folder, urlPrefix) {
  if (!fs.existsSync(folder)) return [];

  const files = fs.readdirSync(folder)
    .filter(f => f.endsWith(".pdf"))
    .sort();

  return files.map(pdf => {
    const title = path.basename(pdf, ".pdf").replace(/_/g, " ");
    const url = encodeURI(`${urlPrefix}/${pdf}`);
    return `- [${title}](${url})`;
  });
}

function buildIndex() {

  const mdLines = ["# Songbook 💀︎🎸", ""];

  // 🎸 Uku Songs
  mdLines.push("## Uku songs", "");
  mdLines.push(...listHtml(UKE_SONGS, "ukulele/songs"), "");

  // 📄 Uku Tabs
  mdLines.push("## Uku tabs", "");
  mdLines.push(...listPdf(UKE_TABS, "ukulele/tabs"), "");

  // 🎸 Guitar Songs
  mdLines.push("## Guitar songs", "");
  mdLines.push(...listHtml(GUITAR_SONGS, "guitar/songs"), "");

  // 📄 Guitar Tabs
  mdLines.push("## Guitar tabs", "");
  mdLines.push(...listPdf(GUITAR_TABS, "guitar/tabs"), "");

  // HTML output
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
    h2 { margin-top: 2rem; color: #333; }
    a { color: darkblue; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
${md.render(mdLines.join("\n"))}
</body>
</html>`;

  const htmlPath = path.join(ROOT_FOLDER, "index.html");
  fs.writeFileSync(htmlPath, htmlContent, "utf8");

  console.log("✅ Index created");
}

buildIndex();