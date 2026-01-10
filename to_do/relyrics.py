import re

CHORD_REGEX = re.compile(r"[A-G](?:#|b)?(?:maj|min|dim|aug|sus)?\d*[/A-G#b\d]*")

def chords_above_to_inline(lines):
    """
    Convert chords-above-lyrics text into inline [Chord] lyrics.
    Removes all empty lines.
    """
    result = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i].rstrip("\n")

        # Skip empty lines
        if not line.strip():
            i += 1
            continue

        # Detect likely chord line
        if CHORD_REGEX.search(line) and not line.strip().endswith(":"):
            chord_line = line
            i += 1

            # skip empty lines between chord and lyric
            while i < n and not lines[i].strip():
                i += 1

            # next non-empty line is lyric
            if i < n:
                lyric_line = lines[i].rstrip("\n")
                result.append(inject_chords(chord_line, lyric_line))
                i += 1
                continue
            else:
                # no lyric line found — just append chord line
                result.append(chord_line)
                break

        # otherwise just append line
        result.append(line)
        i += 1

    return "\n".join(result)


def inject_chords(chord_line, lyric_line):
    """
    Insert chords inline based on character alignment.
    """
    output = list(lyric_line)
    inserts = []

    j = 0
    while j < len(chord_line):
        if chord_line[j].strip():
            k = j
            while k < len(chord_line) and chord_line[k].strip():
                k += 1
            chord = chord_line[j:k].strip()
            if CHORD_REGEX.fullmatch(chord):
                pos = min(j, len(output))
                inserts.append((pos, f"[{chord}]"))
            j = k
        else:
            j += 1

    # insert chords from right to left to preserve positions
    for pos, chord in reversed(inserts):
        output.insert(pos, chord)

    return "".join(output)


if __name__ == "__main__":
    # Example with your own lyrics, empty lines removed in output
    text = """
[Intro]

 

D  G  D  G

 

[Verse]

 

D                    G

I - I wish you could swim

         D                            G

Like the dolphins - like dolphins can swim

       C                                D

Though nothing - nothing will keep us together

       Am       Em            D

We can beat them  forever and ever

             C     G             D

Oh we can be Heroes just for one day

 

[Instrumental]

 

D  G  D  G

 

[Verse]

 

D             G

I - I will be King

    D                 G

And you - you will be Queen

    C                        D

For nothing will drive them away

          Am     Em             D

We can be Heroes - just for one day

          C  G              D

We can be us - just for one day

 

[Verse]

 

D           G

I - I can remember (I remember)

D               G

Standing by the wall (By the wall)

        D            G

And the guards shot above our heads (Over our heads)

       D                              G

And we kissed as though nothing would fall (Nothing could fall)

 

[Bridge]

 

        C                D

And the shame was on the other side

          Am           Em       D

Oh we can beat them forever and ever

               C      G             D

Then we can be Heroes  just for one day

 

[Instrumental]

 

D  G  D  G

 

[Outro]

 

D         G      D

We can be Heroes

          G      D

We can be Heroes

          G                   D

We can be Heroes just for one day

          G

We can be Heroes
"""

    lines = text.strip("\n").split("\n")
    converted = chords_above_to_inline(lines)
    print(converted)
