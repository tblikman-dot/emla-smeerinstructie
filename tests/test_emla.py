# Emla-smeerinstructie, losse app: de acht regio's, het briefje en de tekst
# voor de brief. Draai met:  python3 -m http.server 9053  in de hoofdmap.
#
# Waar dit vooral op let: de zinnen moeten LETTERLIJK de overgetypte zinnen zijn
# (ze zijn overgetypt, niet herschreven), er mag nergens een bronvermelding
# staan, het briefje moet op één A4 passen, en er mag niets bewaard worden.
import base64
import re
import sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright

B = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
URL = "http://localhost:9053/"

# Letterlijk overgetypt. Wijkt een zin hiervan af, dan is er iets herschreven.
ZINNEN = [
    "Smeer de volledige voorzijde van het bovenbeen in, van heup tot net boven de knie.",
    "Smeer de binnenzijde van het bovenbeen in, van lies tot knie.",
    "Smeer de achterzijde van het bovenbeen in, van bilplooi tot net boven de knie.",
    "Smeer de volledige kuit in, van net onder de knieplooi tot aan de hiel.",
    "Smeer de voorzijde van het onderbeen in, over de volledige voorste onderbeenregio (van knie tot enkel).",
    "Smeer de binnenzijde van de voet in.",
    "Smeer de onderkant van de voet in, van de hiel tot aan de tenen.",
    # Deze stond niet in de oorspronkelijke instructie: achtste regio, toegevoegd
    # op aanwijzing van de arts, zin geschreven zoals de zeven andere.
    "Smeer de bovenkant van de voet in, van de enkel tot aan de tenen.",
]
ALLE = ["Voorzijde bovenbeen", "Binnenzijde bovenbeen", "Achterzijde bovenbeen",
        "Kuitregio", "Voorzijde onderbeen", "Bovenkant van de voet",
        "Binnenzijde van de voet", "Onderkant van de voet"]

# Op verzoek van de gebruiker staat er geen spiernaam meer op het briefje. Deze
# toets valt om zodra er toch weer een in de patiententekst sluipt.
VERBODEN = ["rectus femoris", "quadriceps", "adductoren", "adductorenregio", "hamstring",
            "triceps surae", "gastrocnemius", "soleus", "abductor hallucis",
            "mediale zijde", "plantaire"]

fails = 0


def check(naam, ok, extra=""):
    global fails
    print(("OK  " if ok else "FAIL"), naam, extra)
    if not ok:
        fails += 1


def kies(pg, naam):
    pg.locator(".em-kaart", has_text=naam).first.click()
    pg.wait_for_timeout(90)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path=B)
    pg = b.new_context(viewport={"width": 390, "height": 900}).new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_timeout(500)

    check("acht regio's", pg.locator(".em-kaart").count() == 8,
          "| " + str(pg.locator(".em-kaart").count()))
    check("geen horizontale scroll", pg.evaluate("document.documentElement.scrollWidth") <= 390)

    # Het merkje rechtsboven: van wie de app is. Klein en rechts, en het mag de
    # titel niet uit het midden duwen.
    merk = pg.locator(".topbar-merk")
    check("het merkje staat in de balk", merk.count() == 1 and "Blikman" in merk.inner_text())
    mdoos = merk.bounding_box()
    tdoos = pg.locator(".topbar-title").bounding_box()
    check("het merkje staat rechts", mdoos["x"] > tdoos["x"] + tdoos["width"],
          "| merk=" + str(round(mdoos["x"])) + " titel eindigt op "
          + str(round(tdoos["x"] + tdoos["width"])))
    check("de titel staat nog in het midden",
          abs((tdoos["x"] + tdoos["width"] / 2) - 195) <= 2,
          "| midden=" + str(round(tdoos["x"] + tdoos["width"] / 2)))
    check("het merkje is kleiner dan de titel",
          pg.evaluate("""() => parseFloat(getComputedStyle(
              document.querySelector('.topbar-merk')).fontSize)""") < 13)
    check("leeg briefje legt uit wat te doen", "Kies hierboven" in pg.inner_text("#emBlad"))
    check("leeg: geen tekst voor de brief", pg.input_value("#emEpic") == "")

    data = pg.evaluate("() => EMLA.regios.map(r => r.zin)")
    ontbreekt = [z for z in ZINNEN if z not in data]
    check("zinnen ongewijzigd overgetypt", not ontbreekt, "| anders: " + str(ontbreekt)[:160])
    # De licentietekst zelf blijft in anatomie-data.js staan: dat eist de
    # MIT-licentie zolang de tekeningen gebruikt worden. Op het scherm komt hij
    # niet meer; dat bewaakt de toets "nergens een bronvermelding" hieronder.
    check("licentie van de tekeningen blijft in het bestand staan",
          pg.evaluate("() => /MIT/.test(ANATOMIE.bron) && !!ANATOMIE.paden.voor.BODY"))

    # Alle vijf de beenregio's tonen nu een aangeleverde foto; alleen de twee
    # voeten worden nog getekend. Elke foto toont het RECHTERbeen, dus voor links
    # hoort hij gespiegeld te staan en bij "beide" twee keer. Spiegelen is
    # makkelijk andersom te krijgen en een gespiegeld briefje is een echte fout,
    # dus dit wordt per regio en per kant nagemeten.
    MET_FOTO = ["Voorzijde bovenbeen", "Binnenzijde bovenbeen", "Achterzijde bovenbeen",
                "Kuitregio", "Voorzijde onderbeen", "Bovenkant van de voet",
                "Binnenzijde van de voet", "Onderkant van de voet"]

    def spiegelstand():
        return pg.evaluate("""() => [...document.querySelectorAll('#emBlad .em-tekfoto')]
            .map(i => i.classList.contains('em-gespiegeld'))""")

    for naam in MET_FOTO:
        kies(pg, naam)
        pg.wait_for_timeout(150)
        check(naam + ": toont de aangeleverde foto, niet de tekening",
              pg.locator("#emBlad .em-bladregio img.em-tekfoto").count() > 0
              and pg.locator("#emBlad .em-bladregio svg.em-tek").count() == 0)
        # Zeven foto's tonen de rechterkant, de voetzool de linker. Gespiegeld
        # hoort dus zodra de gevraagde kant niet de kant van de foto is.
        kant = pg.evaluate("""(n) => (EMLA.regios.find(r => r.titel === n) || {}).fotoKant""", naam)

        # Beide zijden: dan staan er twee beelden, en het zijn echt het linker-
        # en het rechterbeen. Het linkerbeeld hoort gespiegeld te staan als de
        # foto de rechterkant toont, en andersom bij de voetzool. Twee keer
        # hetzelfde been afdrukken is precies de fout die dit moet vangen.
        check(naam + ": beide zijden geeft twee beelden",
              len(spiegelstand()) == 2, "| " + str(spiegelstand()))
        check(naam + ": het linker- en het rechterbeen staan goed om",
              spiegelstand() == [kant != "L", kant != "R"], "| " + str(spiegelstand()))
        bijschrift = pg.evaluate(
            """() => [...document.querySelectorAll('#emBlad .em-fotopaar figcaption')]
                .map(f => f.textContent)""")
        check(naam + ": onder de beelden staat links en rechts",
              bijschrift == ["links", "rechts"], "| " + str(bijschrift))

        for knop in ("Rechts", "Links"):
            verwacht = [knop[0] != kant]
            pg.locator(".em-kaart", has_text=naam).first.locator(
                ".em-kant", has_text=knop).click()
            pg.wait_for_timeout(150)
            check(naam + ", " + knop.lower() + ": " +
                  ("ongespiegeld" if verwacht == [False] else "gespiegeld"),
                  spiegelstand() == verwacht, "| " + str(spiegelstand()))
        kies(pg, naam)
        pg.wait_for_timeout(80)

    check("alle acht regio's hebben een meegeleverde foto",
          pg.evaluate("() => EMLA.regios.filter(r => r.foto).length") == 8,
          "| " + str(pg.evaluate("() => EMLA.regios.filter(r => r.foto).length")))
    # De vijf beenregio's houden hun anatomische tekening als terugval; de foto
    # wint. Voor de drie voeten is de tekening helemaal weg: die waren eigen
    # schetsen en zijn vervangen.
    check("de drie voeten hebben geen eigen schets meer",
          pg.evaluate("""() => EMLA.regios
              .filter(r => r.id.indexOf('voet') === 0 && r.tekening).length""") == 0)
    check("zeven beelden tonen de rechterkant",
          pg.evaluate("() => EMLA.regios.filter(r => r.fotoKant === 'R').length") == 7,
          "| " + str(pg.evaluate("() => EMLA.regios.filter(r => r.fotoKant === 'R').length")))
    # Een zoolaanzicht is het spiegelbeeld van een bovenaanzicht; deze foto toont
    # daardoor als enige de linkervoet. Gelijktrekken met de rest is een fout.
    # Harde controle, niet afgeleid uit de data: de zoolfoto toont de linkervoet,
    # dus bij de keuze "rechts" hoort hij gespiegeld op het briefje te staan en
    # bij "links" juist niet. Precies andersom dan bij de andere zeven.
    kies(pg, "Onderkant van de voet")
    for knop, moet in (("Rechts", True), ("Links", False)):
        pg.locator(".em-kaart", has_text="Onderkant van de voet").first.locator(
            ".em-kant", has_text=knop).click()
        pg.wait_for_timeout(180)
        check("voetzool, " + knop.lower() + ": " + ("gespiegeld" if moet else "ongespiegeld"),
              spiegelstand() == [moet], "| " + str(spiegelstand()))
    kies(pg, "Onderkant van de voet")
    pg.wait_for_timeout(100)

    check("de voetzool is de enige linkervoet",
          pg.evaluate("""() => EMLA.regios
              .filter(r => r.fotoKant === 'L').map(r => r.id)""") == ["voetzool"],
          "| " + str(pg.evaluate("() => EMLA.regios.filter(r => r.fotoKant === 'L').map(r => r.id)")))

    # Vroeger waren de voeten eigen schetsen zonder links/rechts. Sinds de arts
    # drie eigen voetbeelden aanleverde zijn het foto's van de rechtervoet, net
    # als de vijf beenfoto's, en spiegelen ze dus mee.
    check("er is geen eigen schets meer over",
          pg.evaluate("""() => EMLA.regios
              .filter(r => r.tekening && r.tekening.soort === 'schets').length""") == 0)

    # kiezen, kant wisselen
    kies(pg, "Voorzijde bovenbeen")
    blad = pg.inner_text("#emBlad")
    # Bij beide zijden staan er twee merkjes achter de naam, elk in zijn eigen
    # kleur. Eén merkje met één kleur voor allebei was juist het bezwaar.
    check("standaard beide zijden", "links" in blad and "rechts" in blad)
    merkkleuren = pg.evaluate(
        """() => [...document.querySelectorAll('#emBlad .em-bkant')]
            .map(s => [s.textContent, getComputedStyle(s).backgroundColor])""")
    check("twee merkjes: links en rechts",
          [m[0] for m in merkkleuren] == ["links", "rechts"], "| " + str(merkkleuren))
    check("links en rechts hebben niet dezelfde kleur",
          merkkleuren[0][1] != merkkleuren[1][1], "| " + str(merkkleuren))
    pg.locator(".em-kaart", has_text="Voorzijde bovenbeen").first.locator(".em-kant", has_text="Links").click()
    pg.wait_for_timeout(200)
    blad = pg.inner_text("#emBlad")
    check("kant komt op het briefje", "links" in blad and "beide zijden" not in blad)
    kies(pg, "Kuitregio")
    pg.wait_for_timeout(150)
    check("tweede regio erbij", pg.locator(".em-bladregio").count() == 2)
    kies(pg, "Kuitregio")  # weer uit
    pg.wait_for_timeout(150)
    check("nog eens tikken zet hem weer uit", pg.locator(".em-bladregio").count() == 1)

    # tijd terugrekenen
    pg.fill("#emTijd", "14:30")
    pg.wait_for_timeout(250)
    check("60 minuten eerder", "13:30" in pg.inner_text("#emUitkomst"))
    check("tijd staat op het briefje", "13:30" in pg.inner_text("#emBlad"))
    pg.fill("#emTijd", "00:30")
    pg.wait_for_timeout(250)
    check("over middernacht heen", "23:30" in pg.inner_text("#emUitkomst"),
          "| " + pg.inner_text("#emUitkomst"))
    pg.fill("#emTijd", "")
    pg.wait_for_timeout(200)
    check("zonder tijd de algemene regel",
          "Minimaal 60 minuten" in pg.inner_text("#emBlad") and pg.inner_text("#emUitkomst") == "")

    # tekst voor de brief: moet zonder opmaakschade te plakken zijn
    for naam in ALLE:
        if naam not in ("Voorzijde bovenbeen",):   # die staat al aan
            kies(pg, naam)
    pg.fill("#emTijd", "09:15")
    pg.wait_for_timeout(400)
    t = pg.input_value("#emEpic")
    check("alles in de tekst", all(z.split(",")[0][:40] for z in ZINNEN) and len(t) > 900,
          "| " + str(len(t)) + " tekens")
    check("alleen ASCII", all(ord(c) < 127 for c in t),
          "| " + str(sorted({c for c in t if ord(c) >= 127})))
    check("geen tabs", "\t" not in t)
    check("geen inspringing", not any(r.startswith(" ") for r in t.split("\n")))
    check("geen regel die een opsomming wordt",
          not any(r[:2] in ("- ", "* ", "# ", "> ", "+ ") or
                  (r[:1].isdigit() and r[1:2] in (".", ")"))
                  for r in t.split("\n")))
    check("geen spaties aan het regeleind", not any(r != r.rstrip() for r in t.split("\n")))
    check("geen drie lege regels achter elkaar", "\n\n\n" not in t)
    check("alle regio's in de tekst", sum(t.count(n) for n in ALLE) >= 7)
    check("terugrekentijd in de tekst", "08:15" in t, "| " + t.split("\n")[2][:70])
    # Nergens een bronvermelding: niet op het scherm, niet op het briefje en niet
    # in de tekst voor het dossier. Dit was een uitdrukkelijke wens; eerder stond
    # er onderaan de pagina en onderaan de Epic-tekst nog wel een bronregel.
    # Op hele woorden, niet op losse letterreeksen: "poster" zit óók in
    # "tibialis posterior", en dat is een spiernaam, geen bronvermelding. Die
    # eerste versie van deze toets sloeg daarop aan. "mit" staat er niet bij,
    # dat is als woord te gewoon.
    SPOREN = ["poster", "umcg", "centrum voor revalidatie", "bron", "musclemap",
              "bronvermelding", "overgenomen"]
    pagina = pg.inner_text("body").lower()
    gevonden_bron = sorted({w for w in SPOREN
                            if re.search(r"\b" + w + r"\b", pagina)
                            or re.search(r"\b" + w + r"\b", t.lower())})
    check("nergens een bronvermelding", not gevonden_bron, "| " + str(gevonden_bron))
    check("het herkomstregeltje is van de pagina af",
          pg.locator("#emHerkomst").count() == 0)
    check("EMLA heeft geen bronvelden meer",
          pg.evaluate("() => !('bron' in EMLA) && !('bronTekening' in EMLA)"))

    # Geen spiernamen meer op het briefje en niet in de brief; dat was de
    # uitdrukkelijke wens. Zowel het blad als de Epic-tekst wordt nagelopen.
    blad_tekst = pg.inner_text("#emBlad").lower()
    brief = t.lower()
    gevonden = sorted({w for w in VERBODEN if w in blad_tekst or w in brief})
    check("geen spiernamen in de patiententekst", not gevonden, "| " + str(gevonden))

    # De oorspronkelijke regel "Verwijder de zalf ... vlak voor de behandeling" is op
    # aanwijzing van de arts vervangen: de folie blijft om tot aan de
    # behandeling. Deze toets valt om zodra de oude instructie terugkeert.
    check("de folie blijft om tot aan de behandeling",
          "de folie blijft om tot aan de behandeling" in blad_tekst
          and "de folie blijft om tot aan de behandeling" in brief)
    check("de oude instructie over verwijderen staat er niet meer",
          "verwijder de zalf" not in blad_tekst and "verwijder de zalf" not in brief
          and "overtollige creme" not in brief)

    # leegmaken en herladen laten niets achter
    pg.click("#emWis")
    pg.wait_for_timeout(250)
    check("leegmaken werkt", pg.locator(".em-bladregio").count() == 0 and pg.input_value("#emTijd") == "")
    kies(pg, "Achterzijde bovenbeen")
    pg.fill("#emTijd", "11:00")
    pg.wait_for_timeout(200)
    opgeslagen = pg.evaluate("() => Object.keys(localStorage).filter(k => /emla/i.test(k))")
    check("niets in localStorage", opgeslagen == [], "| " + str(opgeslagen))
    pg.reload()
    pg.wait_for_timeout(500)
    check("na herladen leeg", pg.locator(".em-bladregio").count() == 0)
    pg.close()

    # printweergave: alleen het briefje, en het past op één A4
    # Een heel A4 is bij 96 dpi 794 x 1123 px; de witrand zit in de pagina zelf.
    pg = b.new_context(viewport={"width": 794, "height": 1123}).new_page()
    pg.goto(URL)
    pg.wait_for_timeout(400)
    for naam in ALLE:
        kies(pg, naam)
    # het zwaarste geval: alles aangevinkt én een tijd ingevuld.
    # De witrand zit sinds krn-v82 als padding in de pagina en niet meer in
    # @page (anders drukt de browser zijn eigen koptekst met de URL mee), dus
    # de hele body is de maat: een A4 is 1123 px bij 96 dpi.
    pg.fill("#emTijd", "14:30")
    pg.wait_for_timeout(300)
    pg.emulate_media(media="print")
    pg.wait_for_timeout(200)
    hoogte = pg.evaluate("document.body.scrollHeight")
    check("acht regio's én een tijd passen op één A4", hoogte <= 1123, "| " + str(hoogte) + " px")

    # Alles hierboven staat op "beide zijden": twee beelden per regio. Eenzijdig
    # is een ander geval — één beeld per regio, geen bijschrift, en daardoor een
    # grotere foto. Dat moet ook passen, dus hier apart gemeten.
    pg3 = b.new_context(viewport={"width": 794, "height": 1123}).new_page()
    pg3.goto(URL)
    pg3.wait_for_timeout(400)
    for naam in ALLE:
        pg3.locator(".em-kaart", has_text=naam).first.click()
        pg3.wait_for_timeout(70)
        pg3.locator(".em-kaart", has_text=naam).first.locator(
            ".em-kant", has_text="Rechts").click()
        pg3.wait_for_timeout(70)
    pg3.fill("#emTijd", "14:30")
    pg3.wait_for_timeout(350)
    beelden = pg3.locator("#emBlad .em-tekfoto").count()
    check("eenzijdig geeft één beeld per regio", beelden == 8, "| " + str(beelden))
    check("geen bijschriften als er maar één kant is",
          pg3.locator("#emBlad .em-fotopaar").count() == 0)
    pg3.emulate_media(media="print")
    pg3.wait_for_timeout(200)
    h1 = pg3.evaluate("document.body.scrollHeight")
    fh1 = pg3.evaluate("""() => getComputedStyle(document.getElementById('emBlad'))
        .getPropertyValue('--fotohoog').trim()""")
    check("acht regio's eenzijdig passen op één A4 (foto " + fh1 + ")",
          h1 <= 1123, "| " + str(h1) + " px")
    pg3.close()

    # De foto's worden groter naarmate er minder regio's op het briefje staan.
    # Elk aantal moet op één A4 blijven passen; dat wordt hier allemaal gemeten.
    for aantal in (1, 2, 3, 4, 5, 6, 7, 8):
        pg2 = b.new_context(viewport={"width": 794, "height": 1123}).new_page()
        pg2.goto(URL)
        pg2.wait_for_timeout(450)
        for naam in ALLE[:aantal]:
            pg2.locator(".em-kaart", has_text=naam).first.click()
            pg2.wait_for_timeout(70)
        pg2.fill("#emTijd", "14:30")
        pg2.wait_for_timeout(350)
        pg2.emulate_media(media="print")
        pg2.wait_for_timeout(200)
        h = pg2.evaluate("document.body.scrollHeight")
        fh = pg2.evaluate("""() => getComputedStyle(document.getElementById('emBlad'))
            .getPropertyValue('--fotohoog').trim()""")
        check(str(aantal) + " regio's passen op één A4 (foto " + fh + ")", h <= 1123,
              "| " + str(h) + " px")
        pg2.close()
    # De binnenzijde van de voet is een liggend beeld; zonder breedtegrens duwt
    # het de tekst ernaast in een smalle strook.
    breedtes = pg.evaluate("""() => [...document.querySelectorAll('#emBlad .em-tekfoto')]
        .map(i => i.getBoundingClientRect().width)""")
    check("geen enkel beeld wordt breder dan de ruimte toelaat",
          breedtes and max(breedtes) <= 120, "| " + str([round(x) for x in breedtes]))

    check("app-onderdelen staan niet op papier",
          not pg.locator(".topbar").is_visible()
          and not pg.locator("#emRaster").is_visible()
          and not pg.locator("#emEpic").is_visible())
    # Het merkje hoort bij de app, niet op het briefje dat de ouders meekrijgen.
    check("het merkje staat niet op het briefje",
          not pg.locator(".topbar-merk").is_visible()
          and "Blikman" not in pg.inner_text("#emBlad"))
    check("het briefje staat er wel op", pg.locator("#emBlad").is_visible())
    pg.close()

    # ---- eigen foto met markeervlak ----
    # De foto blijft op het toestel; de test controleert dat hij opgeslagen
    # wordt, het vlak meegaat, en alles een herlaadbeurt overleeft.
    ctx = b.new_context(viewport={"width": 420, "height": 900})
    pg = ctx.new_page()
    errs2 = []
    pg.on("pageerror", lambda e: errs2.append(str(e)))
    buiten = []
    pg.on("request", lambda r: buiten.append(r.url) if "localhost:9053" not in r.url else None)
    pg.goto(URL)
    pg.wait_for_timeout(600)

    kies(pg, "Binnenzijde van de voet")
    pg.wait_for_timeout(150)
    check("knop voor een eigen foto", pg.locator(".em-fotoknop").count() == 1)

    plaatje = pg.evaluate("""() => { const c = document.createElement('canvas');
      c.width = 900; c.height = 600; const x = c.getContext('2d');
      x.fillStyle = '#E8C9A0'; x.fillRect(0, 0, 900, 600);
      x.fillStyle = '#BE8C60'; x.beginPath(); x.ellipse(450, 320, 330, 150, 0, 0, 7); x.fill();
      return c.toDataURL('image/jpeg', 0.85); }""")
    rauw = base64.b64decode(plaatje.split(",", 1)[1])
    with pg.expect_file_chooser() as fc:
        pg.locator(".em-fotoknop").first.click()
    fc.value.set_files({"name": "voet.jpg", "mimeType": "image/jpeg", "buffer": rauw})
    pg.wait_for_timeout(1800)

    check("markeerscherm gaat open", not pg.locator("#emMarkeer").is_hidden())
    check("foto staat op het briefje", pg.locator("#emBlad .em-bfoto img").count() == 1)
    check("foto vervangt de tekening", pg.locator("#emBlad .em-bladregio svg.em-tek").count() == 0)

    pg.locator("#emDoek").scroll_into_view_if_needed()
    pg.wait_for_timeout(200)
    bb = pg.locator("#emDoek").bounding_box()
    pg.mouse.move(bb["x"] + bb["width"] * 0.30, bb["y"] + bb["height"] * 0.66)
    pg.mouse.down()
    pg.mouse.move(bb["x"] + bb["width"] * 0.38, bb["y"] + bb["height"] * 0.62)
    pg.mouse.up()
    for sel, waarde in (("#emBreed", "40"), ("#emHoog", "12"), ("#emHoek", "-15")):
        pg.fill(sel, waarde)
        pg.dispatch_event(sel, "input")
    pg.wait_for_timeout(800)

    vlek = pg.evaluate("""async () => {
      const db = await new Promise(r => { const q = indexedDB.open('krnFotos'); q.onsuccess = () => r(q.result); });
      return await new Promise(r => {
        const t = db.transaction('fotos', 'readonly').objectStore('fotos').getAll();
        t.onsuccess = () => r(t.result.map(x => ({ cat: x.catId, vlek: x.vlek })));
      });
    }""")
    check("foto bewaard onder een eigen sleutel",
          len(vlek) == 1 and vlek[0]["cat"] == "emla:voetmediaal", "| " + str(vlek)[:90])
    v = vlek[0]["vlek"] if vlek else {}
    check("slepen verzet het vlak", v and abs(v["cx"] - 0.5) > 0.05 and abs(v["cy"] - 0.5) > 0.05,
          "| " + str(v))
    check("schuiven worden bewaard",
          v and round(v["rx"], 2) == 0.4 and round(v["ry"], 2) == 0.12 and v["hoek"] == -15,
          "| " + str(v))

    pg.reload()
    pg.wait_for_timeout(1800)
    kies(pg, "Binnenzijde van de voet")
    pg.wait_for_timeout(600)
    check("foto overleeft herladen", pg.locator("#emBlad .em-bfoto img").count() == 1)
    check("knop zegt nu bijstellen", pg.locator(".em-fotoknop.heeft").count() == 1)

    pg.locator(".em-fotoknop").first.click()
    pg.wait_for_timeout(400)
    pg.click("#emFotoWeg")
    pg.wait_for_timeout(900)
    # Deze regio had vroeger een eigen schets als terugval; nu is dat de
    # meegeleverde foto van de arts. De hele keten wordt hier nagelopen.
    # Twee beelden, want deze regio staat op "beide zijden".
    check("foto weghalen zet de meegeleverde foto terug",
          pg.locator("#emBlad .em-bfoto img").count() == 0
          and pg.locator(
              '#emBlad .em-bladregio img.em-tekfoto[src*="smeer-voet-binnen"]').count() == 2)

    check("de pagina haalt niets van buiten", not buiten, "| " + str(buiten)[:120])
    pg.close()

    # ---- op het startscherm zetten ----
    # De app wordt niet uit een store geïnstalleerd maar via "toevoegen aan
    # startscherm". Daar moet het manifest voor kloppen, moeten de iconen echt
    # bestaan, en moet de service worker ze alle vier kunnen ophalen.
    pg = b.new_context(viewport={"width": 390, "height": 900}).new_page()
    pg.goto(URL)
    pg.wait_for_timeout(400)
    vraag = pg.context.request

    # 1. Elk bestand dat de service worker bij het installeren ophaalt moet
    #    bestaan. cache.addAll() weigert in zijn geheel zodra er één 404 geeft;
    #    dan installeert de worker niet en werkt offline stilletjes niet meer.
    sw = vraag.get(URL + "sw.js").text()
    bestanden = re.findall(r"'\./([^']*)'", sw)
    weg = [n for n in bestanden if n and vraag.get(URL + n).status >= 400]
    check("de service worker mist geen bestand", not weg, "| " + str(weg))
    check("de nieuwe iconen staan in de service worker",
          "icon-maskable-512.png" in bestanden and "apple-touch-icon.png" in bestanden)

    # 2. Het manifest: naam, standalone, en een maskeerbaar icoon voor Android.
    mani = vraag.get(URL + "manifest.json").json()
    check("het manifest opent als app, niet als tabblad",
          mani.get("display") == "standalone")
    doelen = {i["src"]: i for i in mani["icons"]}
    check("er is een maskeerbaar icoon voor Android",
          any("maskable" in i.get("purpose", "") for i in mani["icons"]))

    # 3. De iconen bestaan én hebben de maat die het manifest belooft.
    MAAT = """async (naam) => { const i = new Image(); i.src = naam + '?t=' + Date.now();
               await i.decode(); return [i.naturalWidth, i.naturalHeight]; }"""
    for src, item in doelen.items():
        w, h = item["sizes"].split("x")
        echt = pg.evaluate(MAAT, src)
        check("icoon " + src + " is echt " + item["sizes"],
              echt == [int(w), int(h)], "| " + str(echt))

    # 4. iOS gebruikt de apple-touch-icon, niet het manifest. Die moet er zijn,
    #    en hij mag niet meer naar het oude icoon van het naslagwerk wijzen.
    appel = pg.get_attribute("link[rel='apple-touch-icon']", "href")
    check("de iPhone krijgt een eigen icoon", appel == "apple-touch-icon.png",
          "| " + str(appel))
    check("dat bestand bestaat ook", vraag.get(URL + appel).status < 400)

    # 5. De tegel mag niet meer de donkergroene KR-tegel van het naslagwerk zijn.
    #    Die was egaal donker; deze heeft een blauwe achtergrond met wit erin.
    KLEUREN = """async (naam) => {
      const i = new Image(); i.src = naam + '?t=' + Date.now(); await i.decode();
      const c = document.createElement('canvas');
      c.width = i.naturalWidth; c.height = i.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(i, 0, 0);
      const p = (a, b) => [...x.getImageData(a, b, 1, 1).data];
      const mid = c.width >> 1;
      return { hoek: p(2, 2),
               lijf: p(mid, Math.round(c.height * 0.40)),
               band: p(mid, Math.round(c.height * 0.56)) };
    }"""
    for naam in ("icon-192.png", "icon-512.png", "apple-touch-icon.png"):
        k = pg.evaluate(KLEUREN, naam)
        r, g, bl, a = k["hoek"]
        blauw = a == 255 and bl > 120 and bl > r + 40          # achtergrond
        wit = min(k["lijf"][:3]) > 150                          # het lijf
        pr, pg_, pb, _ = k["band"]                              # de band erover
        paars = pr > 150 and pb > 150 and pg_ < pr - 50
        check("icoon " + naam + " is de nieuwe tegel", blauw and wit and paars,
              "| " + str({n: k[n] for n in ("hoek", "lijf", "band")}))
    pg.close()

    print("\nfails:", fails, "| errors:", errs + errs2)
    b.close()
