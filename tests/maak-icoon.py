# Maakt de PNG's van het app-icoon uit icoon-bron.svg.
#
# Draaien vanuit deze map, met de app op poort 9053 (die server wordt gebruikt
# om de geschreven PNG's daarna weer in te lezen en na te meten):
#     python3 -I maak-icoon.py
#
# Er komen vier bestanden uit:
#   icon-192.png            de gewone tegel, klein
#   icon-512.png            de gewone tegel, groot
#   icon-maskable-512.png   voor Android: daar legt het toestel zelf een ronde
#                           of vierkante mal over het icoon en snijdt de randen
#                           weg. De tekening staat hier dus kleiner, binnen de
#                           veilige cirkel van 80%.
#   apple-touch-icon.png    voor de iPhone, 180 px. iOS rondt de hoeken zelf af
#                           en kan niet met doorzichtigheid overweg, dus deze is
#                           vierkant en volledig gevuld.
import os
import re
import sys

from playwright.sync_api import sync_playwright

B = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
URL = "http://localhost:9053/"
HIER = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HIER)

# naam, pixels, hoe groot de tekening binnen het vlak staat
UIT = [
    ("icon-192.png", 192, 1.0),
    ("icon-512.png", 512, 1.0),
    ("icon-maskable-512.png", 512, 0.72),
    ("apple-touch-icon.png", 180, 1.0),
]

# De vier hoeken moeten de achtergrondkleur hebben: blauw, helemaal dekkend.
# Dit staat er omdat het een keer mis is gegaan. De maat werd toen uit het
# bestand vervangen, en dat veranderde ook de maat van de achtergrondrechthoek;
# bij 192 en 180 px vulde die daarna nog maar een hoek van de tegel en was de
# rest wit. Op het grote formaat was er niets aan te zien.
HOEKPROEF = """
async ([naam, px]) => {
  const img = new Image();
  img.src = naam + '?t=' + Date.now();
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const lees = (px, py) => [...x.getImageData(px, py, 1, 1).data];
  const w = c.width - 1, h = c.height - 1;
  return {
    maat: [c.width, c.height],
    hoeken: [lees(1, 1), lees(w - 1, 1), lees(1, h - 1), lees(w - 1, h - 1)],
  };
}
"""


def blauw_en_dekkend(p):
    r, g, b, a = p
    return a == 255 and b > 120 and b > r + 40 and b > g + 20


with open(os.path.join(APP, "icoon-bron.svg"), encoding="utf-8") as f:
    svg = f.read()
svg = re.sub(r"^<!--.*?-->\s*", "", svg, flags=re.S)   # het commentaar eraf

fout = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=B)

    for naam, px, schaal in UIT:
        # om het midden schalen: eerst naar het midden, schalen, terug
        m = 256 - 256 * schaal
        groep = 'transform="translate(%.3f %.3f) scale(%.3f)"' % (m, m, schaal)
        deze = svg.replace('<g id="art">', '<g id="art" ' + groep + ">")

        pg = b.new_context(viewport={"width": px, "height": px},
                           device_scale_factor=1).new_page()
        # De maat komt uit het venster en uit de CSS, niet uit de width/height
        # in het svg-bestand: die staan daar ook op de achtergrondrechthoek.
        # svg is bovendien standaard inline, dus zonder display:block komt er
        # onderaan een paar pixel ruimte bij.
        pg.set_content(
            "<style>html,body{margin:0;padding:0;overflow:hidden}"
            "svg{display:block;width:100vw;height:100vh}</style>" + deze)
        pg.wait_for_timeout(120)
        pad = os.path.join(APP, naam)
        pg.screenshot(path=pad, omit_background=False)
        gemeten = pg.evaluate("[document.documentElement.scrollWidth,"
                              " document.documentElement.scrollHeight]")
        ok = gemeten == [px, px] and os.path.getsize(pad) > 0
        print(("OK  " if ok else "FAIL"), "geschreven", naam, px, "px", gemeten)
        if not ok:
            fout += 1
        pg.close()

    # de geschreven bestanden terugmeten
    pg = b.new_context(viewport={"width": 600, "height": 400}).new_page()
    pg.goto(URL)
    for naam, px, _ in UIT:
        uit = pg.evaluate(HOEKPROEF, [naam, px])
        maat_ok = uit["maat"] == [px, px]
        hoek_ok = all(blauw_en_dekkend(h) for h in uit["hoeken"])
        print(("OK  " if maat_ok and hoek_ok else "FAIL"),
              "nagemeten", naam, uit["maat"],
              "hoeken=" + ("vol" if hoek_ok else str(uit["hoeken"])))
        if not (maat_ok and hoek_ok):
            fout += 1
    b.close()

print("---", "ALLES GROEN" if not fout else "ER IS IETS STUK")
sys.exit(1 if fout else 0)
