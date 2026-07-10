const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");

const ROOT_FOLDER = __dirname;

// Folders
const UKE_SONGS = path.join(__dirname, "ukulele", "songs");
const UKE_TABS  = path.join(__dirname, "ukulele", "tabs");

const GUITAR_SONGS = path.join(__dirname, "guitar", "songs");
const GUITAR_TABS  = path.join(__dirname, "guitar", "tabs");

const TOOLS = path.join(__dirname, "tools");

const md = new MarkdownIt();



// Extract title from HTML file
function extractTitle(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
  return match ? match[1].trim() : path.basename(filePath, ".html");
}


function listHtml(folder, urlPrefix) {
  if (!fs.existsSync(folder)) return ["_No songs found._"];

  const files = fs.readdirSync(folder)
    .filter(f => f.endsWith(".html"));

  if (files.length === 0) return ["_No songs found._"];

  // Build objects with file + title
  const songs = files.map(file => {
    const fullPath = path.join(folder, file);
    const title = extractTitle(fullPath);

    return {
      file,
      title
    };
  });

  // Sort by title
  songs.sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  // Generate markdown links
  return songs.map(song =>
    `- [${song.title}](${urlPrefix}/${song.file})`
  );
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

function listTools(folder, urlPrefix) {
  if (!fs.existsSync(folder)) return [];

  return fs.readdirSync(folder)
    .filter(f => f.endsWith(".html"))
    .map(file => ({
      file,
      title: extractTitle(path.join(folder, file))
    }))
    .sort((a,b) => a.title.localeCompare(b.title))
    .map(tool => `- [${tool.title}](${urlPrefix}/${tool.file})`);
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

  mdLines.push("## Tools", "");
  mdLines.push(...listTools(TOOLS, "tools"), "");

  const siteCSS =
  fs.readFileSync(
    path.join(ROOT_FOLDER, "styles.css"),
    "utf8"
  );

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

<h2>Mise en page à partir d'un fichier markdown</h2>

<div id="generator">

<ul><li><a href="./minimal.md" download>Exemple minimal</a></li></ul>
  <input type="file" id="mdUpload" accept=".md">
  <button id="generateBtn">
    Mise en page
  </button>
</div>




<script src="https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/markdown-it-container/dist/markdown-it-container.min.js"></script>
<script>
window.siteCSS =
${JSON.stringify(siteCSS)};
</script>
<script src="md_renderer.js"></script>
<script src="uploader.js"></script>


</body>
</html>`;

  const htmlPath = path.join(ROOT_FOLDER, "index.html");
  fs.writeFileSync(htmlPath, htmlContent, "utf8");

  console.log("✅ Index created");
}

buildIndex();