#!/usr/bin/env python3
"""
ug_chord_fetcher.py

Fetches a chord tab from Ultimate Guitar and converts its embedded
[ch]Chord[/ch] markup into clean inline [Chord]lyric text.

Ultimate Guitar pages embed the full tab (chords + lyrics) as JSON
inside a <div class="js-store" data-content="..."> element. The chords
are already marked inline as [ch]Cm[/ch], so this script just needs to:
  1. Download the page
  2. Locate and parse that JSON blob
  3. Extract the raw tab text (tab_view.wiki_tab.content)
  4. Convert [ch]X[/ch] -> [X] and unescape UG's formatting codes

Usage:
    pip install requests beautifulsoup4 --break-system-packages
    python3 ug_chord_fetcher.py "<ultimate-guitar-url>" output.txt

This script contains no lyrics of its own -- it only fetches and
reformats whatever page URL you give it, for your own personal use.
Respect the copyright of whatever you download; this is a formatting
convenience tool, not a distribution tool.
"""

import json
import re
import sys

import requests
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}


def fetch_tab_json(url: str) -> dict:
    """Download the page and extract the js-store JSON blob that
    Ultimate Guitar embeds with the full tab data."""
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    store_div = soup.find("div", class_="js-store")
    if store_div is None or not store_div.get("data-content"):
        raise RuntimeError(
            "Could not find embedded tab data on the page. "
            "The site's layout may have changed."
        )

    data = json.loads(store_div["data-content"])
    return data


def extract_raw_tab(data: dict) -> str:
    """Navigate the UG JSON structure to the raw tab text."""
    try:
        tab_view = data["store"]["page"]["data"]["tab_view"]
        content = tab_view["wiki_tab"]["content"]
    except KeyError as e:
        raise RuntimeError(f"Unexpected JSON structure, missing key: {e}")
    return content


def ug_markup_to_inline(raw: str) -> str:
    """Convert UG's [ch]Chord[/ch] tags to [Chord], and clean up
    UG's other formatting placeholders ([tab]...[/tab], [Verse], etc.
    are left intact as section labels)."""
    # [ch]Cm[/ch] -> [Cm]
    text = re.sub(r"\[ch\](.*?)\[/ch\]", r"[\1]", raw)
    # Remove [tab] / [/tab] wrapper tags (formatting only, no content change)
    text = text.replace("[tab]", "").replace("[/tab]", "")
    return text


def main():
    if len(sys.argv) != 3:
        print('Usage: python3 ug_chord_fetcher.py "<ultimate-guitar-url>" output.txt')
        sys.exit(1)

    url, out_path = sys.argv[1], sys.argv[2]

    print(f"Fetching {url} ...")
    data = fetch_tab_json(url)
    raw = extract_raw_tab(data)
    converted = ug_markup_to_inline(raw)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(converted)

    print(f"Saved converted chords/lyrics to '{out_path}'")


if __name__ == "__main__":
    main()
