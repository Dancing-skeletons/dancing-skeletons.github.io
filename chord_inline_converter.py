#!/usr/bin/env python3
"""
chord_inline_converter.py

Converts "chords-over-lyrics" text (chord line above, lyric line below,
chords positioned by column) into "inline" [Chord]lyric format, e.g.:

    Cm          Bb            AbM7  G
    Comme un en-fant aux yeux de lu-mière

becomes:

    [Cm]Comme un en-[Bb]fant aux yeux de lu-[AbM7]mière [G]

Usage:
    1. Put your chord/lyric text in a file, alternating:
         chord line
         lyric line
         chord line
         lyric line
         ...
       (blank lines and section labels like "Intro:" or "(a cappella)"
       are preserved as-is)

    2. Run:
         python3 chord_inline_converter.py input.txt output.txt

    3. Or import convert_pair() / convert_text() into your own script.

Note: this script contains NO song lyrics or chords of its own — it's a
generic text transformer. Feed it your own copy of the text you want
converted.
"""

import re
import sys

# A chord token: root note (A-G) + optional accidental + optional quality/extension
CHORD_RE = re.compile(
    r"""^[A-G]              # root note
        [b#]?                # optional accidental
        (maj7|Maj7|M7|m7|m|dim|aug|sus[24]?|add\d+|7|9|11|13|6)?  # quality
        (\(?\d?\)?)?         # trailing parenthetical extension e.g. (7)
        \.*$                 # allow trailing dots
    """,
    re.VERBOSE,
)


def is_chord_line(line: str) -> bool:
    """Heuristic: a line is a 'chord line' if most whitespace-separated
    tokens on it look like chord symbols."""
    tokens = line.split()
    if not tokens:
        return False
    chordish = sum(1 for t in tokens if CHORD_RE.match(t.strip(".,;:")))
    return chordish >= max(1, len(tokens) * 0.6)


def convert_pair(chord_line: str, lyric_line: str) -> str:
    """Merge one chord line + one lyric line into inline [Chord]lyric format,
    based on the character column each chord starts at."""
    # Find (chord_text, start_column) for every chord on the chord line
    positions = []
    for m in re.finditer(r"\S+", chord_line):
        positions.append((m.group(0), m.start()))

    if not positions:
        return lyric_line

    # Pad lyric line so we can safely insert at any column
    padded = lyric_line
    if len(padded) < len(chord_line):
        padded = padded + " " * (len(chord_line) - len(padded))

    # Insert from right to left so earlier insertion points don't shift
    result = padded
    for chord, col in sorted(positions, key=lambda p: p[1], reverse=True):
        # Clamp column to within the lyric line length
        col = min(col, len(result))
        result = result[:col] + f"[{chord}]" + result[col:]

    # Collapse any run of spaces left over from padding, but keep single spaces
    result = re.sub(r" {2,}", " ", result).rstrip()
    return result


def convert_text(text: str) -> str:
    """Walk through the full text, pairing up chord lines with the
    lyric line that follows them, and converting each pair. Lines that
    aren't part of a chord/lyric pair (blank lines, section labels like
    'Intro:' or '(a cappella)') are passed through unchanged."""
    lines = text.splitlines()
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if is_chord_line(line) and i + 1 < len(lines) and lines[i + 1].strip():
            lyric_line = lines[i + 1]
            out.append(convert_pair(line, lyric_line))
            i += 2
        else:
            out.append(line)
            i += 1
    return "\n".join(out)


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 chord_inline_converter.py input.txt output.txt")
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]

    with open(in_path, "r", encoding="utf-8") as f:
        text = f.read()

    converted = convert_text(text)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(converted)

    print(f"Converted '{in_path}' -> '{out_path}'")


if __name__ == "__main__":
    main()
