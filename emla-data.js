// Emla-smeerinstructie — tekst en tekeningen.
//
// BRON VAN DE TEKST: poster "Waar Emla® insmeren? Voor botulinetoxine-injecties",
// UMCG Centrum voor Revalidatie, overgetypt uit een schermafbeelding van die
// poster — niet uit het bronbestand zelf.
//
// De zinnen zijn NIET meer letterlijk die van de poster. Op verzoek van de
// gebruiker zijn de spiernamen eruit gehaald (rectus femoris, quadricepsregio,
// adductorenregio, hamstringsregio, triceps surae-regio, gastrocnemius, soleus,
// abductor hallucis) omdat het briefje voor ouders is. De rest van de bewoording
// is onveranderd: er is niets bij verzonnen en niets herschreven dat er niet
// stond. De spiernamen staan nog wel bij 'arts', dat alleen op het scherm komt.
//
// Ook samengevoegd op verzoek: "rectus femoris" en "quadricepsregio" waren twee
// regio's en zijn nu één — "Voorzijde bovenbeen".
//
// EEN INSTRUCTIE IS VERVANGEN op aanwijzing van de behandelend arts. De poster
// zegt: "Verwijder de zalf of veeg overtollige crème af vlak voor de
// behandeling." Zo gaat het niet; de folie blijft zitten. Daarvoor in de plaats
// staat er nu, in de woorden van de arts: "De folie blijft om tot aan de
// behandeling." Zet de posterregel hier dus niet terug — tests/test_emla.py
// valt om als dat toch gebeurt.
//
// Twee dingen uit die poster zijn bewust niet gladgestreken:
//  - de poster gebruikt "zalf" en "crème" door elkaar, ook binnen één zin;
//  - links/rechts staat er niet op. Dat onderscheid komt uit deze app, omdat
//    botulinetoxine vaak eenzijdig wordt gegeven. Het is een keuze van de arts,
//    geen uitspraak uit de bron.
//
// EEN ACHTSTE REGIO IS TOEGEVOEGD, die niet op de poster staat: "Bovenkant van
// de voet". Dat is een toevoeging van de gebruiker; de zin erbij is door mij
// geschreven, op haar uitdrukkelijke aanwijzing ("die mag je zelf naar inzicht
// invullen"), in dezelfde bewoording als de zeven posterregio's. Alles wat van
// de poster komt staat er dus nog letterlijk; dit is het enige dat niet.
//
// BRON VAN DE FOTO'S: aangeleverd door de gebruiker, eigen materiaal; het paarse
// vlak zit al op de foto. De drie voetbeelden zijn renders, de vijf beenfoto's
// zijn fotografie. Zeven beelden tonen de RECHTERkant; de voetzool toont als
// enige de LINKERvoet (zie de aantekening bij die regio). De foto's gaan er ONBEWERKT in: alleen verkleind, niet
// bijgesneden. Bij de drie voetbeelden is alleen de witte rand eromheen
// weggehaald - geen inhoud, geen been, geen voet. Dat
// is een uitdrukkelijke afspraak — het hele been hoort in beeld te blijven, en
// alle vijf de foto's hebben daardoor dezelfde uitsnede en schaal. Snijd er dus
// niets af om een vlak groter te laten lijken. Een regio met een 'foto' toont die in plaats van de tekening. Zo'n foto
// laat één been zien, dus links/rechts kleurt daar niet mee — dat staat alleen
// in de tekst van het briefje. De regel bij 'arts' is een aantekening van de
// gebruiker voor zichzelf; die staat wel op het scherm en niet op het briefje.
//
// BRON VAN DE TEKENINGEN: anatomie-data.js (@musclemap/assets, MIT). Een regio
// beschrijft hier alleen wélk stuk van dat lichaam moet oplichten; emla.html
// tekent het. Vier soorten:
//   spier         - een of meer spierpaden lichten op
//   spierband     - een spierpad, afgeknipt tot een band (rectus femoris in de quadriceps)
//   lichaamsband  - de lichaamsomtrek, afgeknipt tot een band (binnenzijde dij, voorste onderbeen)
//   schets        - een eigen tekening; alleen de twee voeten, die zitten niet in de bron
// Banden staan als [x, y, breedte, hoogte] in de maten van het grote vlak
// (1024 x 1536), per kant van de AFBEELDING.

(function (global) {
  'use strict';

  // ---- uitsnedes uit het grote vlak ----
  var BOX_DIJ_VOOR   = '336 662 352 400';   // bovenbeen: heup tot net onder de knie
  var BOX_DIJ_ACHTER = '336 766 352 390';   // bovenbeen achter: bilplooi tot net onder de knie
  var BOX_KUIT       = '318 996 388 420';   // knieplooi tot de hiel
  var BOX_SCHEEN     = '318 976 388 372';   // knie tot enkel

  var REGIOS = [
    {
      id: 'bovenbeenvoor',
      titel: 'Voorzijde bovenbeen',
      sub: '',
      zin: 'Smeer de volledige voorzijde van het bovenbeen in, van heup tot net boven de knie.',
      arts: 'Rectus femoris en de overige quadriceps; op de poster waren dit twee regio\u2019s.',
      foto: 'smeer-bovenbeen-voor.webp',
      fotoKant: 'R',
      tekening: {
        soort: 'spier', aanzicht: 'voor', box: BOX_DIJ_VOOR, paden: ['QUADRICEPS_%'],
      },
    },
    {
      id: 'adductoren',
      titel: 'Binnenzijde bovenbeen',
      sub: '',
      zin: 'Smeer de binnenzijde van het bovenbeen in, van lies tot knie.',
      arts: 'Adductoren.',
      foto: 'smeer-bovenbeen-binnen.webp',
      fotoKant: 'R',          // de foto toont het rechterbeen; links wordt gespiegeld
      tekening: {
        soort: 'lichaamsband', aanzicht: 'voor', box: BOX_DIJ_VOOR,
        band: { LEFT: [444, 770, 68, 250], RIGHT: [512, 770, 68, 250] },
        bij: ['ADDUCTOR_%'],
      },
    },
    {
      id: 'hamstrings',
      titel: 'Achterzijde bovenbeen',
      sub: '',
      zin: 'Smeer de achterzijde van het bovenbeen in, van bilplooi tot net boven de knie.',
      arts: 'Hamstrings.',
      foto: 'smeer-bovenbeen-achter.webp',
      fotoKant: 'R',
      tekening: {
        soort: 'spier', aanzicht: 'achter', box: BOX_DIJ_ACHTER, paden: ['HAMSTRINGS_%'],
        flauw: ['GLUTEUS_LEFT', 'GLUTEUS_RIGHT'],
      },
    },
    {
      id: 'kuit',
      titel: 'Kuitregio',
      sub: '',
      zin: 'Smeer de volledige kuit in, van net onder de knieplooi tot aan de hiel.',
      arts: 'Gastrocnemius en soleus (triceps surae).',
      foto: 'smeer-kuit.webp',
      fotoKant: 'R',
      tekening: {
        soort: 'spier', aanzicht: 'achter', box: BOX_KUIT, paden: ['CALVES_%'],
      },
    },
    {
      id: 'scheen',
      titel: 'Voorzijde onderbeen',
      sub: '',
      zin: 'Smeer de voorzijde van het onderbeen in, over de volledige voorste onderbeenregio (van knie tot enkel).',
      arts: 'Dekt de tibialis anterior en ook de tibialis posterior (ventrale benadering).',
      foto: 'smeer-onderbeen-voor.webp',
      fotoKant: 'R',
      tekening: {
        soort: 'lichaamsband', aanzicht: 'voor', box: BOX_SCHEEN,
        band: { LEFT: [318, 1004, 194, 300], RIGHT: [512, 1004, 194, 300] },
      },
    },
    {
      // ACHTSTE REGIO, STAAT NIET OP DE POSTER. Toevoeging van de gebruiker;
      // de zin hieronder is van mij, op haar aanwijzing geschreven in dezelfde
      // bewoording als de andere zeven. Zie de kop van dit bestand.
      id: 'voetrug',
      titel: 'Bovenkant van de voet',
      sub: '',
      zin: 'Smeer de bovenkant van de voet in, van de enkel tot aan de tenen.',
      foto: 'smeer-voet-boven.webp',
      fotoKant: 'R',
    },
    {
      id: 'voetmediaal',
      titel: 'Binnenzijde van de voet',
      sub: '',
      zin: 'Smeer de binnenzijde van de voet in.',
      arts: 'Spierbuik van de abductor hallucis; zo stond het op de poster.',
      foto: 'smeer-voet-binnen.webp',
      fotoKant: 'R',
    },
    {
      id: 'voetzool',
      titel: 'Onderkant van de voet',
      sub: '',
      zin: 'Smeer de onderkant van de voet in, van de hiel tot aan de tenen.',
      foto: 'smeer-voet-zool.webp',
      // LET OP: dit is de enige foto van de LINKERvoet. Een zoolaanzicht is het
      // spiegelbeeld van een bovenaanzicht; op het bovenaanzicht en op dit beeld
      // staat de grote teen aan dezelfde kant van het plaatje, dus het kan niet
      // dezelfde voet zijn. De arts heeft bevestigd dat deze de linker is en de
      // andere zeven de rechter. Zet hem dus niet 'gelijk' met de rest.
      fotoKant: 'L',
    },
  ];

  // Het kader bovenaan de poster. In de schermafbeelding staan de woorden
  // "over het" in lichtere letters, alsof ze zijn doorgehaald; de zin is hier
  // overgenomen zoals hij gelezen hoort te worden.
  var INTRO = [
    "Smeer de zalf op de aangegeven regio('s), over het gehele gekleurde gebied.",
    "Bij injecties in meerdere spieren: smeer alle relevante regio's in.",
  ];

  var VOORAF = 'Minimaal 60 minuten voor de behandeling aanbrengen.';

  var ALGEMEEN = [
    "Breng een dikke laag Emla® crème aan op de aangegeven regio('s) en smeer goed uit.",
    'Dek eventueel af met een niet-luchtdoorlatende folie (bijv. huishoudfolie) en fixeer met een pleister.',
    'Laat minimaal 60 minuten zitten (langer mag, maximaal 4 uur).',
    'De folie blijft om tot aan de behandeling.',
    'Alleen op de huid aanbrengen. Niet op open wonden of geïrriteerde huid.',
    'Bij vragen kunt u contact opnemen met het revalidatieteam.',
  ];

  var LETOP = [
    'Gebruik uitsluitend Emla® crème (lidocaïne/prilocaïne).',
    'Vermijd contact met ogen, mond en slijmvliezen.',
    'Bij huidirritatie: afspoelen en contact opnemen.',
    'Niet aanbrengen bij bekende overgevoeligheid voor lidocaïne, prilocaïne of andere amide-type lokale anaesthetica.',
    'Volg altijd het persoonlijke advies van de behandelend arts.',
  ];

  // "Hoe dik is een dikke laag" — doorsnede: huid, laag crème, folie erover.
  var DIKTE_SVG =
    '<svg viewBox="0 0 200 86" role="img" aria-label="Doorsnede: een dikke laag crème met folie erover">' +
    '<path class="em-folie" d="M18,30 Q100,8 182,30"/>' +
    '<path class="em-creme" d="M30,60 Q36,30 60,30 L140,30 Q164,30 170,60 Z"/>' +
    '<rect class="em-huidlaag" x="14" y="60" width="172" height="14" rx="5"/>' +
    '<path class="em-pleister" d="M14,30 L30,26"/>' +
    '<path class="em-pleister" d="M186,30 L170,26"/>' +
    '<path class="em-maat" d="M24,30 L24,60"/>' +
    '<text class="em-maattekst" x="8" y="48">dik</text>' +
    '<text class="em-maattekst" x="86" y="13">folie</text>' +
    '<text class="em-maattekst" x="84" y="71">huid</text>' +
    '</svg>';

  global.EMLA = {
    bron: 'Naar de poster “Waar Emla® insmeren? Voor botulinetoxine-injecties”, UMCG Centrum voor Revalidatie; tekst aangepast op aanwijzing van de behandelend arts.',
    bronTekening: 'Lichaamstekeningen: @musclemap/assets (MIT).',
    vooraf: VOORAF,
    intro: INTRO,
    regios: REGIOS,
    algemeen: ALGEMEEN,
    letop: LETOP,
    dikteSvg: DIKTE_SVG,
  };
})(typeof window !== 'undefined' ? window : this);
