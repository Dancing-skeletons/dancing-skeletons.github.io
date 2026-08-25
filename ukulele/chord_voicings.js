/*
 * Ukulele chord voicings.
 *
 * Frets are ordered G-C-E-A, in standard high-G tuning.
 *
 * The first voicing is the default.
 * Additional voicings are shown using the ‹ / › buttons.
 */

const UKE_CHORD_VOICINGS = {
  C: [
    "0003",
    "0432",
    "5433"
  ],

  Cm: [
    "0333",
    "3336"
  ],

  C7: [
    "0001",
    "3433"
  ],

  Cmaj7: [
    "0002",
    "0432"
  ],

  C6: [
    "0000",
    "2433"
  ],

  Csus2: [
    "0233",
    "5533"
  ],

  Csus4: [
    "0013",
    "3013"
  ],

  D: [
    "2220",
    "6420"
  ],

  Dm: [
    "2210",
    "5553"
  ],

  D7: [
    "2223",
    "2020"
  ],

  Dmaj7: [
    "2224",
    "6424"
  ],

  Dsus2: [
    "2200",
    "2000"
  ],

  Dsus4: [
    "2230",
    "0030"
  ],

  E: [
    "1402",
    "4442"
  ],

  Em: [
    "0432",
    "4432"
  ],

  E7: [
    "1202",
    "1400"
  ],

  Emaj7: [
    "1302",
    "4444"
  ],

  F: [
    "2010",
    "5553"
  ],

  Fm: [
    "1013",
    "5554"
  ],

  F7: [
    "2310",
    "5556"
  ],

  Fmaj7: [
    "2410",
    "5557"
  ],

  G: [
    "0232",
    "4232",
    "7875"
  ],

  Gm: [
    "0231",
    "5233"
  ],

  G7: [
    "0212",
    "4533"
  ],

  Gmaj7: [
    "0222",
    "4422"
  ],

  A: [
    "2100",
    "6454"
  ],

  Am: [
    "2000",
    "5453"
  ],

  A7: [
    "0100",
    "6453"
  ],

  Amaj7: [
    "1100",
    "6454"
  ],

  Asus2: [
    "2200",
    "6452"
  ],

  Asus4: [
    "2200",
    "2300"
  ],

  B: [
    "4321",
    "7876"
  ],

  Bm: [
    "4222",
    "7775"
  ],

  B7: [
    "2322",
    "4320"
  ],

  Bmaj7: [
    "3322",
    "7776"
  ],

  Bb: [
    "3211",
    "7655"
  ],

  Bbm: [
    "3111",
    "6654"
  ]
};

if (typeof module !== "undefined") {
  module.exports = { UKE_CHORD_VOICINGS };
}

if (typeof window !== "undefined") {
  window.UKE_CHORD_VOICINGS = UKE_CHORD_VOICINGS;
}