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
      console.warn('â ï¸ Missing MusicXML file:', fullPath);
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

  // Single chord-diagram element per <uke-chord>. We remember the author's
  // original name / frets / position in data-* attributes so transposition
  // can restore them exactly when the transpose level goes back to 0.
  body = body.replace(
    /<uke-chord\b([^>]*)>(.*?)<\/uke-chord>/g,
    (match, attrs) => {
      const name = (attrs.match(/name="([^"]*)"/) || [])[1] || '';
      const frets = (attrs.match(/frets="([^"]*)"/) || [])[1] || '';
      const position = (attrs.match(/position="([^"]*)"/) || [])[1] || '';
      let data = ` data-original-name="${name}"`;
      if (frets) {
        data += ` data-custom="1" data-original-frets="${frets}"`;
        if (position) data += ` data-original-position="${position}"`;
      }
      return `<uke-chord${attrs}${data} size="1" class="chord-diagram"></uke-chord>`;
    }
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
<style>
  /* Hover label on chord diagrams: "shape/max" for click cycling.
     Absolutely positioned corner badge -> takes NO layout space and
     never overlaps the text below (paints over the diagram itself). */
  uke-chord[data-label] {
    display: inline-block;
    position: relative;
  }
  uke-chord[data-label]::after {
    content: attr(data-label);
    display: none;
    position: absolute;
    top: 0;
    right: 0;
    transform: translateY(-100%);
    padding: 0 4px;
    border-radius: 4px;
    background: rgba(76, 107, 139, 0.92);
    color: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.65em;
    font-weight: 600;
    line-height: 1.3;
    pointer-events: none;
    white-space: nowrap;
  }
  uke-chord[data-label]:hover::after {
    display: block;
  }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body>

<button id="controls-handle" title="Afficher/masquer les contrÃ´les">â°</button>


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
    <button id="transpose-down">-</button>
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

  /* -------------------------------------------------
     CHORD FINGERING DATABASE / FINDER
     Instead of a hand-written list, fingerings are
     computed from music theory for standard GCEA
     tuning, so every root x common quality is covered.
     ------------------------------------------------- */

  // MIDI notes of the open strings: G4 C4 E4 A4
  const STRING_NOTES = [67, 60, 64, 69];

  // Chord suffix -> intervals (semitones from the root)
  const QUALITIES = {
    "":      [0, 4, 7],
    "m":     [0, 3, 7],
    "7":     [0, 4, 7, 10],
    "maj7":  [0, 4, 7, 11],
    "m7":    [0, 3, 7, 10],
    "6":     [0, 4, 7, 9],
    "m6":    [0, 3, 7, 9],
    "sus2":  [0, 2, 7],
    "sus4":  [0, 5, 7],
    "7sus4": [0, 5, 7, 10],
    "dim":   [0, 3, 6],
    "dim7":  [0, 3, 6, 9],
    "aug":   [0, 4, 8],
    "m7b5":  [0, 3, 6, 10],
    "5":     [0, 7],
    "add9":  [0, 2, 4, 7],
    "madd9": [0, 2, 3, 7],
    "9":     [0, 2, 4, 7, 10],
    "m9":    [0, 2, 3, 7, 10],
    "maj9":  [0, 2, 4, 7, 11],
    "11":    [0, 2, 5, 7, 10]
  };

  function parseChordName(name) {
    const m = String(name).trim().match(/^([A-G][b#]?)(.*)$/);
    if (!m) return null;
    const root = NOTES.indexOf(normalize(m[1]));
    if (root === -1) return null;
    const intervals = QUALITIES[m[2]] || null;
    return { root, intervals };
  }

  // Search a compact, playable shape containing every chord tone,
  // with the root present (ideally as the lowest note).
  // Returns ALL playable shapes for a chord, ranked best-first.
  // The first one is the "usual" fingering used on load / transpose.
  function findFingering(root, intervals) {
    const pcs = new Set(intervals.map(i => (root + i) % 12));
    const rootPc = root % 12;

    const cands = STRING_NOTES.map(midi => {
      const list = [];
      for (let f = 0; f <= 12; f++) {
        if (pcs.has((midi + f) % 12)) list.push(f);
      }
      return list;
    });
    if (cands.some(l => l.length === 0)) return [];

    const all = [];
    const frets = [];

    function rec(si) {
      if (si === 4) {
        const pcsPresent = new Set();
        let lowest = Infinity;
        for (let i = 0; i < 4; i++) {
          const n = STRING_NOTES[i] + frets[i];
          pcsPresent.add(n % 12);
          if (n < lowest) lowest = n;
        }
        for (const p of pcs) if (!pcsPresent.has(p)) return;
        if (lowest % 12 !== rootPc && !frets.some((f, i) => (STRING_NOTES[i] + f) % 12 === rootPc)) return;

        const rootLowest = lowest % 12 === rootPc;
        const max = Math.max(...frets);
        const min = Math.min(...frets);
        if (max - min > 5) return;
        // Prefer low frets and open strings (the "usual" shapes),
        // with a small bonus when the root is the lowest note.
        const opens = frets.filter(f => f === 0).length;
        const score = max * 2 + frets.reduce((a, b) => a + b, 0) - opens * 3 + (rootLowest ? 0 : 4);
        all.push({ score, frets: frets.slice() });
        return;
      }
      for (const f of cands[si]) {
        frets.push(f);
        rec(si + 1);
        frets.pop();
      }
    }
    rec(0);
    all.sort((a, b) => a.score - b.score);
    return all.slice(0, 6).map(c => c.frets);
  }

  // Hover label: shows "current/total" under the diagram, only while the
  // mouse is over it (see the injected CSS rule using attr(data-label)).
  function applyCycleLabel(el, name, index) {
    const shapes = fingeringsFor(name);
    if (shapes.length < 2) {
      el.removeAttribute('data-label');
      return;
    }
    el.dataset.label = (index + 1) + "/" + shapes.length;
  }

  // The uke-chord web component renders itself once, when it is inserted
  // in the DOM, and does NOT react to later attribute changes. So instead
  // of mutating name/frets/position in place, we rebuild the element:
  // clone it, set the new attributes, and swap it in. A freshly inserted
  // <uke-chord> always renders its current attributes.
  function rebuildDiagram(el, name, frets, position) {
    const fresh = el.cloneNode(false);
    fresh.setAttribute('name', name);
    if (frets) {
      fresh.setAttribute('frets', frets);
      if (position) {
        fresh.setAttribute('position', position);
      } else {
        fresh.removeAttribute('position');
      }
    }
    // preserve the interactive size / visibility applied by the sliders
    fresh.style.zoom = el.style.zoom;
    fresh.style.display = el.style.display;
    fresh.style.cursor = "pointer"; // hint: click to cycle fingerings
    // reset the click-cycling position; the caller can set a new one
    fresh.removeAttribute('data-fing-index');
    fresh.removeAttribute('data-label');
    el.parentNode.replaceChild(fresh, el);
    return fresh;
  }

  // Compute frets/position for a fingering array, using position notation
  // whenever the shape has no open strings.
  function toFretsPosition(frets) {
    const min = Math.min(...frets);
    if (min === 0) return { frets: frets.join(''), position: null };
    return { frets: frets.map(f => f - min + 1).join(''), position: String(min) };
  }

  // Compute the usual fingering for a chord name.
  function usualFingering(name) {
    const parsed = parseChordName(name);
    if (!parsed || !parsed.intervals) return null;
    const list = findFingering(parsed.root, parsed.intervals);
    return list.length ? list[0] : null;
  }

  // All ranked fingerings for a chord name (for click cycling).
  function fingeringsFor(name) {
    const parsed = parseChordName(name);
    if (!parsed || !parsed.intervals) return [];
    return findFingering(parsed.root, parsed.intervals);
  }

  // Initial pass: fill in usual fingerings for name-only diagrams
  // (no frets given by the author). Also rebuild diagrams written with
  // frets="0003"-style open shapes so everything goes through the same path.
  document.querySelectorAll('uke-chord').forEach(el => {
    if (el.dataset.custom) return;
    const name = el.getAttribute('name') || el.dataset.originalName || '';
    const usual = usualFingering(name);
    if (usual) {
      const fp = toFretsPosition(usual);
      const fresh = rebuildDiagram(el, name, fp.frets, fp.position);
      applyCycleLabel(fresh, name, 0);
    }
  });

  function updateChords(){
    document.querySelectorAll(".chord").forEach(el => {
      const original = el.dataset.chord;
      const newChord = transposeChord(original, transpose);
      el.textContent = newChord;
    });

    // ---------- Chord diagrams ----------
    document.querySelectorAll("uke-chord").forEach(el => {
      const originalName = el.dataset.originalName || el.getAttribute("name") || "";
      const newName = transposeChord(originalName, transpose);

      // Back to the original key: restore exactly what the author wrote.
      if (transpose === 0) {
        if (el.dataset.custom) {
          const fresh0 = rebuildDiagram(
            el,
            originalName,
            el.dataset.originalFrets,
            el.dataset.originalPosition || null
          );
          // custom shape: label it "n/max" only if it matches a ranked
          // shape, otherwise leave unlabelled (no cycle from here anyway)
          applyCycleLabel(fresh0, originalName, 0);
        } else {
          const usual = usualFingering(originalName);
          if (usual) {
            const fp = toFretsPosition(usual);
            const fresh0 = rebuildDiagram(el, originalName, fp.frets, fp.position);
            applyCycleLabel(fresh0, originalName, 0);
          } else {
            rebuildDiagram(el, originalName, null, null);
          }
        }
        return;
      }

      // Author specified a custom fingering: try to keep it by shifting
      // the whole shape, which only works if it has no open strings.
      if (el.dataset.custom) {
        const hasPos = !!el.dataset.originalPosition;
        const pos = parseInt(el.dataset.originalPosition || '1', 10);
        const rel = el.dataset.originalFrets.split('').map(Number);
        const actual = rel.map(f => (hasPos ? pos - 1 + f : f));
        if (actual.every(f => f > 0)) {
          const shifted = actual.map(f => f + transpose);
          if (Math.min(...shifted) > 0 && Math.max(...shifted) <= 15) {
            const fp = toFretsPosition(shifted);
            const freshS = rebuildDiagram(el, newName, fp.frets, fp.position);
            applyCycleLabel(freshS, newName, 0);
            return;
          }
        }
        // Open-string custom shape (or shifted too high): fall back to
        // the usual fingering for the transposed chord.
      }

      const usual = usualFingering(newName);
      if (usual) {
        const fp = toFretsPosition(usual);
        const freshU = rebuildDiagram(el, newName, fp.frets, fp.position);
        applyCycleLabel(freshU, newName, 0);
      } else {
        rebuildDiagram(el, newName, null, null);
      }
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

  // ---------- Click a diagram to cycle its fingerings ----------
  // Event delegation on the whole document: the diagrams are rebuilt
  // (cloned + swapped) on every transpose / cycle, so per-element
  // listeners would be lost. A delegated listener survives that.
  document.addEventListener("click", (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest("uke-chord") : null;
    if (!el) return;
    const name = el.getAttribute("name");
    if (!name) return;

    const shapes = fingeringsFor(name);
    if (shapes.length < 2) return; // nothing else to try for this chord

    const current = parseInt(el.dataset.fingIndex || "0", 10);
    const next = (current + 1) % shapes.length;
    const fp = toFretsPosition(shapes[next]);
    const fresh = rebuildDiagram(el, name, fp.frets, fp.position);
    fresh.dataset.fingIndex = String(next);
    applyCycleLabel(fresh, name, next);
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