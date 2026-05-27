const fs = require("fs");
const path = require("path");
const MarkdownIt = require("markdown-it");
const container = require("markdown-it-container");

/* -------------------------
   INIT
-------------------------- */
const md = new MarkdownIt({ html: true });

/* -------------------------
   INLINE CHORDS [Eb]
-------------------------- */
function inlineChordPlugin(md) {
  const chordRegex = /\[([A-G][b#]?[^\]]*)\]/g;

  const defaultRender =
    md.renderer.rules.text ||
    function (tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

  md.renderer.rules.text = function (tokens, idx, options, env, self) {
    const text = tokens[idx].content;

    return text.replace(chordRegex, (match, chord) => {
      return `<span class="chord-inline" data-chord="${chord.trim()}">${chord.trim()}</span>`;
    });
  };
}

md.use(inlineChordPlugin);

/* -------------------------
   STRUCTURED CHORD BLOCKS
   [chord:Eb 0331 position:3 length:2]
-------------------------- */
function chordBlockPlugin(md) {
  function parseMeta(str = "") {
    const meta = {};
    const regex = /(\w+):([^\s]+)/g;
    let m;
    while ((m = regex.exec(str))) {
      meta[m[1]] = m[2];
    }
    return meta;
  }

  function tokenize(state, silent) {
    const start = state.pos;
    if (state.src[start] !== "[") return false;

    const end = state.src.indexOf("]", start);
    if (end === -1) return false;

    const raw = state.src.slice(start + 1, end);

    const match = raw.match(/^chord:([^\s]+)\s*([^\s]*)\s*(.*)$/);
    if (!match) return false;

    const [, name, frets, metaStr] = match;

    if (!silent) {
      const token = state.push("chord_block", "span", 0);
      token.meta = {
        name,
        frets,
        meta: parseMeta(metaStr),
      };
    }

    state.pos = end + 1;
    return true;
  }

  md.inline.ruler.before("emphasis", "chord_block", tokenize);

  md.renderer.rules.chord_block = (tokens, idx) => {
    const t = tokens[idx].meta;

    const attrs = [
      `data-chord="${t.name}"`,
      `data-frets="${t.frets || ""}"`,
      `data-position="${t.meta.position || ""}"`,
      `data-length="${t.meta.length || ""}"`,
    ].join(" ");

    return `<uke-chord name="${t.name}" frets="${t.frets}" ${attrs}></uke-chord>`;
  };
}

md.use(chordBlockPlugin);

/* -------------------------
   STRUM BLOCKS
-------------------------- */
md.use(container, "strum", {
  render(tokens, idx) {
    return tokens[idx].nesting === 1
      ? `<div class="strum">\n`
      : `</div>\n`;
  },
});

/* -------------------------
   HIGHLIGHT BLOCKS
-------------------------- */
md.use(container, "highlight", {
  render(tokens, idx) {
    return tokens[idx].nesting === 1
      ? `<div class="highlight">\n`
      : `</div>\n`;
  },
});

/* -------------------------
   MUSICXML
-------------------------- */
function musicXmlBlockPlugin(md, baseDir) {
  function removePartNames(xml) {
    return xml
      .replace(/<part-name>[^<]*<\/part-name>/g, "<part-name></part-name>")
      .replace(/<part-abbreviation>[^<]*<\/part-abbreviation>/g, "<part-abbreviation></part-abbreviation>");
  }

  function tokenize(state, silent) {
    const line = state.src.slice(state.bMarks[state.line], state.eMarks[state.line]).trim();

    if (!line.startsWith("musicxml:")) return false;

    const filePath = line.replace("musicxml:", "").trim();
    const fullPath = path.resolve(baseDir, filePath);

    if (!fs.existsSync(fullPath)) {
      console.warn("Missing MusicXML:", fullPath);
      return false;
    }

    const xml = removePartNames(fs.readFileSync(fullPath, "utf8"));
    const encoded = encodeURIComponent(xml);

    if (!silent) {
      const token = state.push("musicxml_block", "div", 0);
      token.meta = { encoded };
    }

    state.line += 1;
    return true;
  }

  md.block.ruler.before("paragraph", "musicxml_block", tokenize);

  md.renderer.rules.musicxml_block = (tokens, idx) => {
    const xml = tokens[idx].meta.encoded;
    return `<div class="verovio-block" data-musicxml="${xml}"></div>`;
  };
}

/* -------------------------
   CLI
-------------------------- */
const input = process.argv[2];
if (!input) {
  console.error("Usage: node md_to_html.js input.md [output.html]");
  process.exit(1);
}

const baseDir = path.dirname(path.resolve(input));
md.use(musicXmlBlockPlugin, baseDir);

const out = process.argv[3] || input.replace(/\.md$/, ".html");
const src = fs.readFileSync(input, "utf8");

let body = md.render(src);

/* -------------------------
   FINAL HTML WRAPPER
-------------------------- */
const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${path.basename(input)}</title>
<link rel="stylesheet" href="../../styles.css">

<script src="https://pianosnake.github.io/uke-chord/webcomponents-lite.min.js"></script>
<script src="https://pianosnake.github.io/uke-chord/uke-chord.js"></script>
<script src="https://www.verovio.org/javascript/latest/verovio-toolkit.js"></script>
</head>

<body>

<div id="content" class="two-column">

<div id="transpose-controls">
  <button id="transpose-down">−</button>
  <span id="transpose-level">0</span>
  <button id="transpose-up">+</button>
</div>

${body}

</div>

<script>
/* -------------------------
   COLUMN TOGGLE
-------------------------- */
const content = document.getElementById("content");
const columnClasses = ["one-column", "two-column", "three-column"];
let current = 1;

document.getElementById("toggle-columns")?.addEventListener("click", () => {
  content.classList.remove(columnClasses[current]);
  current = (current + 1) % columnClasses.length;
  content.classList.add(columnClasses[current]);
});

/* -------------------------
   CHORD TOGGLE
-------------------------- */
let chordsVisible = true;
document.getElementById("toggle-chords")?.addEventListener("click", () => {
  chordsVisible = !chordsVisible;

  document.querySelectorAll("uke-chord").forEach(el => {
    el.style.display = chordsVisible ? "inline-block" : "none";
  });

  document.querySelectorAll(".chord-inline").forEach(el => {
    el.style.display = chordsVisible ? "inline" : "none";
  });
});

/* -------------------------
   VEROVIO
-------------------------- */
(() => {
  const toolkit = new verovio.toolkit();

  function render() {
    document.querySelectorAll(".verovio-block").forEach(block => {
      const xml = decodeURIComponent(block.dataset.musicxml);
      const width = block.clientWidth || 800;

      const svg = toolkit.renderData(xml, {
        scale: 100,
        pageWidth: width * 2,
        adjustPageHeight: true,
        breaks: "auto",
        header: "none",
        footer: "none",
      });

      block.innerHTML = svg;
    });
  }

  document.addEventListener("DOMContentLoaded", render);
  window.addEventListener("resize", render);
})();

/* -------------------------
   TRANSPOSE
-------------------------- */
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const FLAT = { Db:"C#", Eb:"D#", Gb:"F#", Ab:"G#", Bb:"A#" };

let transpose = 0;

function normalize(n){ return FLAT[n] || n; }

function transposeChord(chord, steps){
  const m = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return chord;

  let root = normalize(m[1]);
  let suffix = m[2];

  let i = NOTES.indexOf(root);
  if (i === -1) return chord;

  i = (i + steps + 12) % 12;

  return NOTES[i] + suffix;
}

function updateChords(){
  document.querySelectorAll("[data-chord]").forEach(el => {
    el.textContent = transposeChord(el.dataset.chord, transpose);
  });

  document.getElementById("transpose-level").textContent =
    (transpose >= 0 ? "+" : "") + transpose;
}

document.getElementById("transpose-up")?.addEventListener("click", () => {
  transpose++;
  updateChords();
});

document.getElementById("transpose-down")?.addEventListener("click", () => {
  transpose--;
  updateChords();
});
</script>

</body>
</html>`;

fs.writeFileSync(out, html, "utf8");
console.log("Wrote", out);