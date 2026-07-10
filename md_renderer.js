const MarkdownIt =
  typeof window !== 'undefined'
    ? window.markdownit
    : require('markdown-it');

const container =
  typeof window !== 'undefined'
    ? window.markdownitContainer
    : require('markdown-it-container');

const fs =
  typeof window === 'undefined'
    ? require('fs')
    : null;

const path =
  typeof window === 'undefined'
    ? require('path')
    : null;

const md = new MarkdownIt({ html: true, breaks: false });

/* -------------------------
   CHORD PLUGINS
-------------------------- */

// [C] -> floating chord, sits above the syllable that follows it
function chordPlugin(md) {
  function tokenizeChord(state, silent) {
    const start = state.pos;
    if (state.src[start] !== '[') return false;
    if (state.src[start + 1] === '[') return false; // let chord_static handle [[...]]

    const end = state.src.indexOf(']', start);
    if (end === -1) return false;

    const content = state.src.slice(start + 1, end);

    if (!silent) {
      const token = state.push('html_inline', '', 0);
      token.content = `<span class="chord" data-chord="${content}">${content}</span>`;
    }

    state.pos = end + 1;
    return true;
  }

  md.inline.ruler.before('emphasis', 'chord', tokenizeChord);
}

// [[C]] or [[C E7 F]] -> static chord badge(s), written directly in the text flow.
// A multi-chord group is split into one badge per chord so each stays individually
// transposable and they don't render as one merged blob.
function chordStaticPlugin(md) {
  function tokenizeStaticChord(state, silent) {
    const start = state.pos;
    if (state.src[start] !== '[' || state.src[start + 1] !== '[') return false;

    const end = state.src.indexOf(']]', start + 2);
    if (end === -1) return false;

    const content = state.src.slice(start + 2, end);

    if (!silent) {
      const chords = content.split(/\s+/).filter(Boolean);
      const html = chords
        .map(c => `<span class="chord chord-static" data-chord="${c}">${c}</span>`)
        .join(' ');
      const token = state.push('html_inline', '', 0);
      token.content = html;
    }

    state.pos = end + 2;
    return true;
  }

  md.inline.ruler.before('emphasis', 'chord_static', tokenizeStaticChord);
}

md.use(chordPlugin);
md.use(chordStaticPlugin);

md.use(container, 'highlight', {
  render: function (tokens, idx) {
    if (tokens[idx].nesting === 1) {
      return '<div class="highlight">\n';
    } else {
      return '</div>\n';
    }
  }
});


/* -------------------------
   MUSICXML BLOCK / FILE SUPPORT
-------------------------- */
function musicXmlBlockPlugin(md, baseDir) {
  function removePartNames(xml) {
    let cleanedXml = xml.replace(/<part-name>[^<]*<\/part-name>/g, '<part-name></part-name>');
    cleanedXml = cleanedXml.replace(/<part-abbreviation>[^<]*<\/part-abbreviation>/g, '<part-abbreviation></part-abbreviation>');
    return cleanedXml;
  }

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

    let xmlData = fs.readFileSync(fullPath, 'utf8');
    xmlData = removePartNames(xmlData);
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


function renderSong(src, title = "Song") {
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) {
    const baseDir = path.dirname(title);
    md.use(musicXmlBlockPlugin, baseDir);
  }
  let pageTitle = title;

  const h1Match = src.match(/^#\s+(.+)$/m);
  if (h1Match) {
    pageTitle = h1Match[1].trim();
  }

  let body = md.render(src);

  // Single chord-diagram element per <uke-chord> (was: duplicated into
  // chord-large + chord-small). Size is now handled live by the slider,
  // via el.setAttribute('size', ...), so we don't need two fixed copies.
  body = body.replace(
    /<uke-chord\b([^>]*)>(.*?)<\/uke-chord>/g,
    (match, attrs) => `<uke-chord${attrs} size="1" class="chord-diagram"></uke-chord>`
  );

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${pageTitle}</title>
${
  isBrowser
    ? `<style>${window.siteCSS || ""}</style>`
    : `<link rel="stylesheet" href="../../styles.css">`
}
<script src="https://pianosnake.github.io/uke-chord/webcomponents-lite.min.js"></script>
<script src="https://pianosnake.github.io/uke-chord/uke-chord.js"></script>
<script src="https://www.verovio.org/javascript/latest/verovio-toolkit.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>

<button id="controls-handle" title="Afficher/masquer les contrôles">☰</button>


<div id="controls-container">

  <div class="control-group">
    <label for="font-size"><strong>Taille texte</strong></label>
    <input id="font-size" type="range" min="0.7" max="1.5" step="0.05" value="1">
  </div>

  <button id="toggle-columns">Colonnes</button>


  <div class="control-group">
    <label class="control-checkbox">
      <input type="checkbox" id="chord-toggle" checked> Accords
    </label>
    <input type="range" id="chord-size" min="0.4" max="1.2" step="0.05" value="1">
  </div>

  <div class="control-group">
    <label class="control-checkbox">
      <input type="checkbox" id="score-toggle" checked> Partition
    </label>
    <input type="range" id="score-size" min="0.2" max="1.6" step="0.05" value="1">
  </div>

  <div id="transpose-controls">
    <button id="transpose-down">−</button>
    <div id="transpose-level">0</div>
    <button id="transpose-up">+</button>
  </div>
</div>

<div id="content" class="two-column">
${body}
</div>

  <script>
  // ---------- Column toggle ----------
  const btn = document.getElementById('toggle-columns');
  const content = document.getElementById('content');
  const columnClasses = ['one-column', 'two-column', 'three-column'];
  let current = 1;

  btn.addEventListener("click", () => {
    content.classList.remove(columnClasses[current]);
    current = (current + 1) % columnClasses.length;
    content.classList.add(columnClasses[current]);
    setTimeout(() => {
      document.dispatchEvent(new Event("verovio:rerender"));
    }, 0);
  });

  const fontSlider = document.getElementById("font-size");
  fontSlider.addEventListener("input", () => {
    document.documentElement.style.setProperty(
        "--font-scale",
        fontSlider.value
    );
  });

  // ---------- Chord diagrams: show/hide + size slider ----------
  const chordToggle = document.getElementById('chord-toggle');
  const chordSizeSlider = document.getElementById('chord-size');

  function applyChordVisibility(){
    const visible = chordToggle.checked;
    document.querySelectorAll('.chord-diagram').forEach(el => {
      el.style.display = visible ? 'inline-block' : 'none';
    });
    document.querySelectorAll('h2').forEach(h2 => {
      if (h2.textContent.includes('Accords')) h2.style.display = visible ? 'block' : 'none';
    });
  }
  function applyChordSize() {
      const scale = parseFloat(chordSizeSlider.value);
      document.querySelectorAll('.chord-diagram').forEach(el => {
          el.style.zoom = scale;
      });
  }
  chordToggle.addEventListener('change', applyChordVisibility);
  chordSizeSlider.addEventListener('input', applyChordSize);
  applyChordVisibility();
  applyChordSize();

  // ---------- Verovio score ----------
  let scoreScaleFactor = 1;

  const scoreToggle = document.getElementById('score-toggle');
  const scoreSizeSlider = document.getElementById('score-size');

  scoreToggle.addEventListener('change', () => {
    document.querySelectorAll('.verovio-block').forEach(el => {
      el.style.display = scoreToggle.checked ? '' : 'none';
    });
  });
  scoreSizeSlider.addEventListener('input', () => {
    scoreScaleFactor = parseFloat(scoreSizeSlider.value);
    renderAllVerovio();
  });

  (() => {
    const toolkit = new verovio.toolkit();

    function renderAllVerovio() {
      const blocks = document.querySelectorAll(".verovio-block");
      blocks.forEach(block => {
        try {
          const xml = decodeURIComponent(block.dataset.musicxml);
          const containerWidth = block.clientWidth || 800;
          const options = {
            scale: 105 * scoreScaleFactor,
            pageWidth: containerWidth * 2 / scoreScaleFactor,
            pageHeight: 2000,
            spacingStaff: 0,
            spacingSystem: 0,
            adjustPageHeight: true,
            breaks: "auto",
            header: "none",
            footer: "none",
            pageMarginLeft: 10,
            pageMarginRight: 10,
            pageMarginTop: 10,
            pageMarginBottom: 10,
            mnumInterval: 4,
          };
          const svg = toolkit.renderData(xml, options);
          block.innerHTML = svg;
        } catch (e) {
          console.error("Verovio error:", e);
          block.innerHTML = "<pre style='color:red'>MusicXML failed to render</pre>";
        }
      });
    }

    function renderAllVerovioprint() {
      const blocks = document.querySelectorAll(".verovio-block");
      blocks.forEach(block => {
        try {
          const xml = decodeURIComponent(block.dataset.musicxml);
          const containerWidth = 1200;
          const options = {
            scale: 80 * scoreScaleFactor,
            pageWidth: containerWidth * 1 / scoreScaleFactor,
            pageHeight: 2000,
            spacingStaff: 0,
            spacingSystem: 0,
            adjustPageHeight: true,
            breaks: "auto",
            header: "none",
            footer: "none",
            pageMarginLeft: 10,
            pageMarginRight: 10,
            pageMarginTop: 10,
            pageMarginBottom: 10,
            mnumInterval: 4,
          };
          const svg = toolkit.renderData(xml, options);
          block.innerHTML = svg;
        } catch (e) {
          console.error("Verovio error:", e);
          block.innerHTML = "<pre style='color:red'>MusicXML failed to render</pre>";
        }
      });
    }

    document.addEventListener("DOMContentLoaded", renderAllVerovio);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAllVerovio, 150);
    });

    window.addEventListener("beforeprint", renderAllVerovioprint);
    window.addEventListener("afterprint", renderAllVerovio);

    document.addEventListener("verovio:rerender", renderAllVerovio);

    // expose for the slider handler above
    window.renderAllVerovio = renderAllVerovio;
  })();

  // ---------- Controls panel collapse ----------
  const handle = document.getElementById('controls-handle');
  const controlsPanel = document.getElementById('controls-container');

  function setCollapsed(state){
    controlsPanel.classList.toggle('collapsed', state);
    localStorage.setItem('controlsCollapsed', state ? '1' : '0');
  }
  handle.addEventListener('click', () => {
    setCollapsed(!controlsPanel.classList.contains('collapsed'));
  });

  const savedCollapsed = localStorage.getItem('controlsCollapsed');
  setCollapsed(savedCollapsed !== null ? savedCollapsed === '1' : window.innerWidth < 700);

  // ---------- Transpose ----------
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const FLAT_TO_SHARP = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };

  let transpose = 0;

  function normalize(note){
    return FLAT_TO_SHARP[note] || note;
  }

  function transposeNote(note, steps) {
    note = normalize(note);
    let idx = NOTES.indexOf(note);
    if (idx === -1) return note;
    idx = (idx + steps + 12) % 12;
    return NOTES[idx];
  }

  function transposeChord(chord, steps) {
    const original = chord.trim();
    let hasParen = false;
    if (original.startsWith("(") && original.endsWith(")")) {
      hasParen = true;
      chord = original.slice(1, -1).trim();
    } else {
      chord = original;
    }

    const parts = chord.split(new RegExp("\\s+")).filter(Boolean);
    if (parts.length === 0) return original;

    const transposedParts = parts.map(part => {
      const slashMatch = part.match(new RegExp("(\\/+)$"));
      const slashes = slashMatch ? slashMatch[1] : "";
      const base = part.replace(new RegExp("\\/+$"), '');
      const match = base.match(/^([A-G][b#]?)(.*)$/);
      if (!match) return part;
      const root = match[1];
      const suffix = match[2];
      const newRoot = transposeNote(root, steps);
      if (!newRoot) return part;
      return newRoot + suffix + slashes;
    });
    let result = transposedParts.join(" ");
    if (hasParen) {
      result = "(" + result + ")";
    }
    return result;
  }

  function updateChords(){
    document.querySelectorAll(".chord").forEach(el => {
      const original = el.dataset.chord;
      const newChord = transposeChord(original, transpose);
      el.textContent = newChord;
    });
    document.getElementById("transpose-level").textContent =
      (transpose >= 0 ? "+" : "") + transpose;
  }

  document.getElementById("transpose-up").addEventListener("click", () => {
    transpose = (transpose + 1) % 12;
    updateChords();
  });

  document.getElementById("transpose-down").addEventListener("click", () => {
    transpose = (transpose - 1 + 12) % 12;
    updateChords();
  });

  </script>

</body>
</html>`;

  return html;
}

if (typeof module !== 'undefined') {
  module.exports = { renderSong };
}

if (typeof window !== 'undefined') {
  window.renderSong = renderSong;
}
