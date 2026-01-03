const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
//const chords = require('markdown-it-chords');
//const mathjax3 = require('markdown-it-mathjax');
const container = require('markdown-it-container');

const md = new MarkdownIt({ html: true });
//md.use(chords /*, optionalOptionsIfWanted */);
//md.use(mathjax3); 
//const defaultRender = md.renderer.rules.text;

function bigSupPlugin(md) {
  function tokenizeBigSup(state, silent) {
    const start = state.pos;
    if (state.src[start] !== '[') return false;

    const end = state.src.indexOf(']', start);
    if (end === -1) return false; // no closing ]

    const content = state.src.slice(start + 1, end);

    if (!silent) {
      const tokenOpen = state.push('sup_open', 'sup', 1);
      tokenOpen.attrs = [['class', 'big-sup']];

      const tokenText = state.push('text', '', 0);
      tokenText.content = content;

      state.push('sup_close', 'sup', -1);
    }

    state.pos = end + 1;
    return true;
  }

  md.inline.ruler.before('emphasis', 'big_sup', tokenizeBigSup);
}

// Use the plugin
md.use(bigSupPlugin);

md.use(container, 'highlight', {
  render: function (tokens, idx) {
    if (tokens[idx].nesting === 1) {
      return '<div class="highlight">\n';
    } else {
      return '</div>\n';
    }
  }
});

function staffPlugin(md) {
  function renderStaff(state, startLine, endLine, silent) {
    const lines = state.src.split('\n');
    let lineText = lines[startLine].trim();
    if (!lineText.startsWith('staff:')) return false;

    // Determine how many lines belong to this staff block
    let currentLine = startLine + 1;
    const staffLines = [lineText.slice(6).trim()]; // first line after 'staff:'

    while (currentLine < lines.length) {
      const l = lines[currentLine].trim();
      if (l === '' || l.startsWith('-') || l.match(/^#+\s/)) break; // stop at empty line or next block
      staffLines.push(l);
      currentLine++;
    }

    if (!silent) {
      const rows = staffLines.map(r => r.split('|').map(c => c.trim()));
      let html = '<div class="staff">';

      // Lines are rendered bottom-up
      for (let row = rows.length - 1; row >= 0; row--) {
        for (const cell of rows[row]) {
          html += `<div>${cell || ''}</div>`;
        }
      }

      html += '</div>';
      state.tokens.push({
        type: 'html_block',
        content: html,
        block: true,
      });
    }

    state.line = currentLine;
    return true;
  }

  md.block.ruler.before('paragraph', 'staff', renderStaff);
}

md.use(staffPlugin);

/* -------------------------
   MUSICXML BLOCK / FILE SUPPORT
-------------------------- */
function musicXmlBlockPlugin(md, baseDir) {
  function renderMusicXml(state, startLine, endLine, silent) {
    const lines = state.src.split('\n');
    let line = lines[startLine].trim();
    if (!line.startsWith('musicxml:')) return false;

    const filePath = line.slice('musicxml:'.length).trim();
    if (!filePath) return false;

    const fullPath = path.resolve(baseDir, filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn('⚠️ Missing MusicXML file:', fullPath);
      return false;
    }

    const xmlData = fs.readFileSync(fullPath, 'utf8');
    const encoded = encodeURIComponent(xmlData);

    if (!silent) {
     const html = `<div class="verovio-block" data-musicxml="${encoded}"></div>`;
      state.tokens.push({
        type: 'html_block',
        content: html,
        block: true,
      });
    }

    state.line = startLine + 1;
    return true;
  }

  md.block.ruler.before('paragraph', 'musicxml_file', renderMusicXml);
}

const input = process.argv[2];
if (!input) {
  console.error('Usage: node md_to_html.js input.md [output.html]');
  process.exit(1);
}
const baseDir = path.dirname(path.resolve(input));
md.use(musicXmlBlockPlugin, baseDir);


const out = process.argv[3] || input.replace(/\.md$/, '.html');
const src = fs.readFileSync(input, 'utf8');
let body = md.render(src);

// Replace all uke-chord tags with two versions: large (size=1) and small (size=0.7)
body = body.replace(/<uke-chord\b([^>]*)>(.*?)<\/uke-chord>/g, (match, attrs, inner) => {
  // Keep the original attributes, just add size and classes
  const large = `<uke-chord${attrs} size="1" class="chord-large"></uke-chord>`;
  const small = `<uke-chord${attrs} size="0.7" class="chord-small"></uke-chord>`;
  return `${large}${small}`;
});

// Basic HTML wrapper — add or change CSS as needed
const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${path.basename(input)}</title>
<link rel="stylesheet" href="../styles.css"> 
<script src="https://pianosnake.github.io/uke-chord/webcomponents-lite.min.js"></script>
<script src="https://pianosnake.github.io/uke-chord/uke-chord.js"></script>
<script src="https://www.verovio.org/javascript/latest/verovio-toolkit.js"></script>
</head>
<body>
<button id="toggle-columns">Colonnes</button>
<button id="toggle-chords">Vue accords</button>
<div id="content" class="two-column">
${body}
</div>
  <script>
  const btn = document.getElementById('toggle-columns');
    const content = document.getElementById('content');

    // Possible column classes
    const columnClasses = ['one-column', 'two-column', 'three-column'];
    let current = 1; // start at 0 = one-column

    btn.addEventListener("click", () => {
      // Remove old class
      content.classList.remove(columnClasses[current]);

      // Increment and wrap around
      current = (current + 1) % columnClasses.length;

      // Add new class
      content.classList.add(columnClasses[current]);

      // Update button text
//      btn.textContent = (current + 1) + " Colonne" + (current > 0 ? "s" : "");    
       setTimeout(() => {
  document.dispatchEvent(new Event("verovio:rerender"));
}, 0);
      });

        // 🎸 Uke chord toggle
  const chordBtn = document.getElementById('toggle-chords');
  let chordsVisible = true;
  let chordsSize = 1;

  chordBtn.addEventListener("click", () => {
    chordsSize = (chordsSize + 1) % 3;
    chordsVisible = (chordsSize > 0);
    document.querySelectorAll("uke-chord").forEach(chord => {
      chord.style.display = chordsVisible ? "inline-block" : "none";
    });
document.querySelectorAll(".chord-large").forEach(el => el.style.display = chordsSize === 1 ? "inline-block" : "none");
document.querySelectorAll(".chord-small").forEach(el => el.style.display = chordsSize === 2 ? "inline-block" : "none");


    
   // Toggle only <h2> with text "Accords:"
    document.querySelectorAll("h2").forEach(h2 => {
      if (h2.textContent.includes("Accords")) {
        h2.style.display = chordsVisible ? "block" : "none";
      }
    });
    //chordBtn.textContent = chordsSize;
    

  });

(() => {
  const toolkit = new verovio.toolkit();

  function renderAllVerovio() {
    const blocks = document.querySelectorAll(".verovio-block");

    blocks.forEach(block => {
      try {
      const xml = decodeURIComponent(block.dataset.musicxml);
        const width = block.clientWidth || 800;
        const containerWidth = block.clientWidth || 800; // px

        const svg = toolkit.renderData(xml, {
          scale: 105,
          pageWidth: containerWidth * 2,  // width in tenths
          pageHeight: 2000,
          spacingStaff: 14,
          spacingSystem: 22,
          adjustPageHeight: true,
          breaks: "auto",
          header: "none",
          footer: "none"
        });

        block.innerHTML = svg;
      } catch (e) {
        console.error("Verovio error:", e);
        block.innerHTML =
          "<pre style='color:red'>MusicXML failed to render</pre>";
      }
    });
  }

  // Initial render
  document.addEventListener("DOMContentLoaded", renderAllVerovio);

  // Re-render on resize (columns change)
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAllVerovio, 150);
  });

  // Print support
  window.addEventListener("beforeprint", renderAllVerovio);
  window.addEventListener("afterprint", renderAllVerovio);

  // Manual trigger (column button)
  document.addEventListener("verovio:rerender", renderAllVerovio);
})();

</script>

  </body>
</html>`;

fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out);