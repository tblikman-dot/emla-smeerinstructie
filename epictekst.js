// Tekst die zonder opmaakschade in een dossiereditor (Epic) geplakt kan worden.
//
// Stond eerst in dosering.html; staat hier apart omdat de Emla-smeerinstructie
// dezelfde tekstregels nodig heeft. Eenmaal goed krijgen is lastig genoeg om
// het niet twee keer te willen doen. tests/test_dossier.py toetst dit gedrag.

(function (global) {
  'use strict';

  // Waarom zo kaal: deze tekst wordt geplakt in een dossier waarvan de
  // teksteditor opmaak kan overnemen of juist weggooien. Alles wat daar
  // misgaat is hier vooraf weggehaald:
  //
  // - Alleen ASCII. Em-dash, maalteken, gedachtestreepje, aanhalingstekens,
  //   het graadteken, het registered-teken en de harde spatie worden vervangen
  //   of verwijderd. Anders krijg je vraagtekens of ruitjes in het dossier.
  // - Geen tabs: die springen in sommige editors naar het volgende veld.
  // - Geen regel die begint met een streepje, sterretje, hekje of "1.",
  //   want dat maakt een tekstverwerker stilzwijgend om tot een opsomming
  //   met eigen inspringing.
  // - Geen inspringing met spaties, om dezelfde reden.
  // - Geen dubbele lege regels; sommige editors plakken die dubbel.
  //
  // De tekst komt in een textarea te staan. Kopieren uit een textarea levert
  // altijd text/plain op - uit een div zou de HTML meekomen.

  var ASCII_VERVANG = [
    [/[‐‑‒–—―−]/g, '-'],
    [/[×✕✖]/g, 'x'],
    [/[‘’‚‛′]/g, "'"],
    [/[“”„‟″]/g, '"'],
    [/[→⇒]/g, '->'],
    [/≤/g, '<='], [/≥/g, '>='],
    [/≈/g, 'ca. '],   // let op: de tilde blijft staan, die is gewoon ASCII
    [/°/g, ' graden'],
    [/[®™©]/g, ''],
    [/[     ]/g, ' '],
    [/[​‌‍﻿]/g, ''],
    [/[•·‧]/g, '-'],
    [/…/g, '...'],
    [/½/g, '1/2'],
    [/\t/g, ' ']
  ];

  function naarAscii(t) {
    var r = String(t == null ? '' : t);
    ASCII_VERVANG.forEach(function (p) { r = r.replace(p[0], p[1]); });
    // Accenten losweken en weggooien: e-accent wordt e.
    if (String.prototype.normalize) {
      r = r.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
    // Wat dan nog overblijft buiten het gewone toetsenbord gaat eruit.
    r = r.replace(/[^\x20-\x7E\n]/g, '');
    // Opruimen. Geen schoonheid maar noodzaak zodra deze functie ook over
    // zelf getypte tekst loopt: spaties aan het regeleind, drie lege regels
    // achter elkaar en lege regels aan begin of eind plakken slecht.
    r = r.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').replace(/^\n+|\n+$/g, '');
    // Een regel die begint met een opsommingsteken, een nummer of een letter
    // met punt wordt door een tekstverwerker stilzwijgend een lijst met eigen
    // inspringing. Er komt een punt voor zodat dat niet gebeurt; de tekst
    // blijft leesbaar.
    r = r.replace(/^(([-*+#>|]|\d+[.)]|[a-zA-Z][.)])\s)/gm, '. $1');
    return r;
  }

  global.naarAscii = naarAscii;
})(typeof window !== 'undefined' ? window : this);
