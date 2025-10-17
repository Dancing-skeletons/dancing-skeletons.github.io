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
      const html = `<div class="osmd-block" data-musicxml="${encoded}"></div>`;
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
const body = md.render(src);


// Basic HTML wrapper — add or change CSS as needed
const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${path.basename(input)}</title>
<style>
body { 
	font-family: system-ui, Arial, sans-serif;
	padding: 1rem;
	line-height: 1.6;
	column-gap: 2em;
  }

 pre code {
  font-size: 1.5em;
  font-family: monospace; /* keeps alignment of tabs */
}

  /* Two-column layout (default for screen) */
  #content.two-column {
    column-count: 2;
    column-gap: 2em;
    }

  /* Single-column layout */
  #content.one-column {
    column-count: 1;
    }

      #content.three-column {
    column-count: 3;
    column-gap: 2em;
    }

.chord { color: #b00;
	font-weight: 600;
	font-size: 0.9em;
	vertical-align: super;
	margin-right: 0.12em; 
  }


.tableau-group {
  display: inline-block;      /* keep the whole 3-line group together */
  vertical-align: top;
  max-width: 100%;            /* allow wrapping to next line if needed */
  margin-right: 1em;          /* optional spacing between groups */
}

pre.tableau {
  font-family: monospace;
  white-space: pre;           /* preserve alignment */
  font-size: 1.4em;
  line-height: 1.4em;
  margin: 0;
  overflow-x: auto;           /* scroll if the group is wider than container */
}


.big-sup { font-size:1.4em;
	vertical-align:super;
	color: red; 
  }

.highlight {
	background-color:  #d3d3d3;
	padding: 10px;
	border-radius: 5px;
/*  -webkit-print-color-adjust: exact; /* Chrome, Safari */
/*  print-color-adjust: exact;         /* Firefox */
/*  color-adjust: exact;               /* Legacy */
  border: 2px solid #d3d3d3;
  padding: 2px;
  }

.highlight .big-sup {
	color: #800000ff; /* darker grey for visibility */}

.staff {
	display: grid;
	grid-template-rows: repeat(4, 30px); /* 4 horizontal lines */
	grid-auto-flow: column;
	gap: 10px;
  }

.staff div {
	border-bottom: 2px solid black;
	text-align: center;
	line-height: 30px;
	font-weight: bold;
  }

  .osmd-block {
  margin: 1.5em 0;
  border: 1px solid #ddd;
  padding: 0.5em;
  border-radius: 8px;
  background: #fafafa;
}

@media print {
	/* Double column when toggled */
	#content.two-column {
		column-count: 2;
		column-gap: 2em;}
	#content.one-column {
		column-count: 1 !important;}
  #content.three-column {
		column-count: 3;
		column-gap: 2em;}
	  

/* Toggle button */
#toggle-columns {
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 8px 12px;
  background: #007acc;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  z-index: 999;
  }

@media print {#toggle-columns { display: none; }
#toggle-chords { display: none; }

}

uke-chord.hidden {
  display: none;
}

</style>
<script src="https://pianosnake.github.io/uke-chord/webcomponents-lite.min.js"></script>
<script src="https://pianosnake.github.io/uke-chord/uke-chord.js"></script>
<script src="https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.7.6/build/opensheetmusicdisplay.min.js"></script>
</head>
<body>
<button id="toggle-columns">2 Colonnes</button>
<button id="toggle-chords">Masquer accords</button>
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
      btn.textContent = (current + 1) + " Colonne" + (current > 0 ? "s" : "");    });

        // 🎸 Uke chord toggle
  const chordBtn = document.getElementById('toggle-chords');
  let chordsVisible = true;

  chordBtn.addEventListener("click", () => {
    document.querySelectorAll("uke-chord").forEach(chord => {
      chord.style.display = chordsVisible ? "none" : "inline-block";
    });

        // Toggle only <h2> with text "Accords:"
    document.querySelectorAll("h2").forEach(h2 => {
      if (h2.textContent.includes("Accords")) {
        h2.style.display = chordsVisible ? "none" : "block";
      }
    });

    chordsVisible = !chordsVisible;
    chordBtn.textContent = chordsVisible ? "Masquer accords" : "Montrer accords";
  });


  /* --- OSMD Rendering --- */
document.addEventListener("DOMContentLoaded", async () => {
  const blocks = document.querySelectorAll(".osmd-block");
  for (const block of blocks) {
    const xmlData = decodeURIComponent(block.dataset.musicxml);
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(block, {
      drawingParameters: "compact",
      drawTitle: false,
      drawPartNames: false,
      drawMeasureNumbers: false,
      guitarPro: true, // enables tab rendering when XML includes it
      drawNoteDurations: true
    });
    try {
      await osmd.load(xmlData);
      osmd.render();
    } catch (e) {
      block.innerHTML = "<pre style='color:red'>OSMD failed to load MusicXML.</pre>";
      console.error(e);
    }
  }
});
  </script>
  </body>
</html>`;

fs.writeFileSync(out, html, 'utf8');
console.log('Wrote', out);
