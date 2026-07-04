// PETQ.rooms — stanze 112x64 in rect-composition, temi 'lab' (robot) e 'ship' (alieno).
// Ogni mobile ha outline scuro e riempimento che stacca dalla parete (regola contrasto in scala di grigi).
// Layout a "slot": mobili chiave ai lati, centro parete/pavimento libero per pet e futuri arredi (modulo 6).
// Nessun modulo ES, nessuna libreria. Vedi docs/SPEC-MODULI-1-2-3.md sezione [B].
window.PETQ = window.PETQ || {};

(function () {
  "use strict";

  var W = 112, H = 64;
  var WALL_H = 44; // parete 0..44, pavimento 44..64

  function R(g, x, y, w, h, col) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  }
  // rettangolo con outline scuro 1px + riempimento, stile sprite
  function O(g, x, y, w, h, outline, fill) {
    R(g, x, y, w, h, outline);
    R(g, x + 1, y + 1, w - 2, h - 2, fill);
  }

  // ===== Palette LAB (grigio-azzurro, mobili a contrasto) =====
  var L = {
    out: "#2b3640",
    parete: "#c9d6de", fascia: "#aebfc9", pannello: "#b7c7d0", giunto: "#9fb2bc",
    battiscopa: "#8fa0aa", pavimento: "#7d909b", fuga: "#65767f",
    piastrella: "#bdd6e0", piastrellaFuga: "#9dbcca",
    crema: "#f2ede0", cremaOmbra: "#b9b2a2",
    metallo: "#5c6b74", metalloScuro: "#3d4a54", metalloChiaro: "#8fa3ad",
    fuoco: "#1e2830", pentola: "#37424c",
    bancone: "#4a6a7a", banconeTop: "#6a8a9a",
    verde: "#5ce87f", ciano: "#4dd8e8", ambra: "#f0b84a", vetroRim: "#eef6f8",
    led: "#4be8c8",
    bianco: "#f4f6f2", acqua: "#5fd0f0", acquaChiara: "#b8ecf8",
    specchio: "#e4f2f8", riflesso: "#f8fdff", ceramica: "#dfe4e2",
    divano: "#4a7ba6", divanoChiaro: "#5c8db8", divanoScuro: "#3d6a92",
    cuscino1: "#f08a3c", cuscino2: "#3ad8c8",
    schermoFrame: "#1e2830", schermoOn: "#3fd8ea", schermoBar: "#12707e", schermoGlow: "#a8f0f8",
    tappeto: "#a05838", tappetoBordo: "#5c3020", tappetoRiga: "#c07a52",
    cielo: "#a9d9f2", nuvola: "#e8f6fc"
  };

  // ===== Palette SHIP (scuro, luci accese; parete/accento diversi per stanza) =====
  var S = {
    out: "#120e20",
    metallo: "#6a5fa0", metalloChiaro: "#8a7fc0",
    spazio: "#0d0a1c", stella: "#f0e8ff",
    ghiaccio: "#a8e0f0", brina: "#e8f8fc",
    mobiletto: "#3a2e5c", mobilettoTop: "#241c3c", sportello: "#312752",
    fuoco: "#120e20", fuocoGlow: "#e85ad8", pentola: "#463868",
    bancone: "#463868", banconeTop: "#5c4d88",
    verde: "#5ce87f", ciano: "#4dd8e8", ambra: "#f0b84a",
    acqua: "#4ac8e8", bolla: "#a8ecf8",
    specchio: "#cfeef8", riflesso: "#effcff",
    seduta: "#8a4ab0", sedutaBase: "#6a5fa0", glow: "#5ae8e0",
    cuscino1: "#4ae0d8", cuscino2: "#f0b84a",
    holoFrame: "#1a1430", holoOn: "#3ae0c8", holoBar: "#17705f", holoGlow: "#b8f8ec",
    pad: "#3a3060",
    ledM: "#e85ad8", ledC: "#5ae8e0", ledA: "#f0b84a",
    pianta: "#3f9c6a", piantaBulbo: "#e85ad8", piantaBulbo2: "#5ae8e0"
  };

  // pareti ship per stanza: cucina teal, bagno blu acqua, salone viola caldo/magenta
  var S_WALLS = {
    cucina: { parete: "#1c3a36", fascia: "#2e5c54", pannello: "#142a27", giunto: "#2e6660", battiscopa: "#0f211e", pavimento: "#16302c", fuga: "#2a544c" },
    bagno:  { parete: "#1c2a4a", fascia: "#2e4474", pannello: "#141f38", giunto: "#31497c", battiscopa: "#101a2e", pavimento: "#162138", fuga: "#293e64" },
    salone: { parete: "#3a2148", fascia: "#5c2e6e", pannello: "#2a1836", giunto: "#6e3a80", battiscopa: "#1c1026", pavimento: "#281732", fuga: "#472a56" }
  };

  // stelline deterministiche dentro un rettangolo di vetro già disegnato (pattern ripetuto ogni 18px)
  var STAR_PTS = [[2, 2], [6, 4], [10, 1], [3, 6], [8, 7], [12, 3], [5, 1], [11, 6], [15, 4], [14, 8], [7, 9], [1, 4], [17, 2], [16, 7]];
  function stars(g, x, y, w, h, col) {
    g.fillStyle = col;
    for (var ox = 0; ox < w; ox += 18) {
      STAR_PTS.forEach(function (p) {
        if (p[0] + ox < w && p[1] < h) g.fillRect(x + ox + p[0], y + p[1], 1, 1);
      });
    }
  }

  // oblò ship: cornice metallica + vetro nero spazio + stelle
  function oblo(g, x, y, w, h) {
    O(g, x, y, w, h, S.out, S.metalloChiaro);
    R(g, x + 2, y + 2, w - 4, h - 4, S.spazio);
    stars(g, x + 2, y + 2, w - 4, h - 4, S.stella);
  }

  // pannellino a muro ship con led colorati
  function ledPanel(g, x, y) {
    O(g, x, y, 9, 10, S.out, S.mobiletto);
    R(g, x + 2, y + 2, 2, 2, S.ledM);
    R(g, x + 5, y + 2, 2, 2, S.ledC);
    R(g, x + 2, y + 6, 2, 2, S.ledA);
  }

  // ===== Pareti e pavimenti =====
  function labWall(g, tiles) {
    R(g, 0, 0, W, WALL_H, L.parete);
    R(g, 0, 4, W, 2, L.fascia);
    if (tiles) {
      R(g, 0, 24, W, 18, L.piastrella);
      R(g, 0, 32, W, 1, L.piastrellaFuga);
      for (var x = 10; x < W; x += 10) R(g, x, 24, 1, 18, L.piastrellaFuga);
    } else {
      R(g, 0, 34, W, 8, L.pannello);
      for (var j = 14; j < W; j += 14) R(g, j, 34, 1, 8, L.giunto);
    }
    R(g, 0, 42, W, 2, L.battiscopa);
    R(g, 0, WALL_H, W, H - WALL_H, L.pavimento);
    R(g, 0, 50, W, 1, L.fuga);
    R(g, 0, 57, W, 1, L.fuga);
  }

  function shipWall(g, wp) {
    R(g, 0, 0, W, WALL_H, wp.parete);
    R(g, 0, 4, W, 2, wp.fascia);
    R(g, 0, 34, W, 8, wp.pannello);
    for (var j = 14; j < W; j += 14) R(g, j, 34, 1, 8, wp.giunto);
    R(g, 0, 42, W, 2, wp.battiscopa);
    R(g, 0, WALL_H, W, H - WALL_H, wp.pavimento);
    R(g, 0, 50, W, 1, wp.fuga);
    R(g, 0, 57, W, 1, wp.fuga);
    R(g, 28, WALL_H, 1, H - WALL_H, wp.fuga);
    R(g, 56, WALL_H, 1, H - WALL_H, wp.fuga);
    R(g, 84, WALL_H, 1, H - WALL_H, wp.fuga);
  }

  // tre provette/contenitori colorati in piedi su un piano (topY = y del piano d'appoggio)
  function provette(g, xs, topY, rimCol) {
    var cols = [L.verde, L.ciano, L.ambra];
    for (var i = 0; i < 3; i++) {
      R(g, xs[i], topY - 9, 3, 1, rimCol);
      R(g, xs[i], topY - 8, 3, 8, cols[i]);
    }
  }

  // ===== LAB (slot: mobili ai lati, centro libero) =====
  function labCucina(g) {
    labWall(g, false);
    // finestra piccola al centro parete (dettaglio)
    O(g, 56, 8, 20, 14, L.out, L.cielo);
    R(g, 65, 9, 1, 12, L.out);
    R(g, 59, 12, 4, 1, L.nuvola);
    // frigo crema a sinistra, con split freezer e maniglie
    O(g, 6, 12, 16, 32, L.out, L.crema);
    R(g, 7, 22, 14, 1, L.cremaOmbra);
    R(g, 18, 15, 1, 4, L.out);
    R(g, 18, 25, 1, 6, L.out);
    // bancone con provette accanto al frigo
    O(g, 26, 32, 26, 12, L.out, L.bancone);
    R(g, 27, 33, 24, 2, L.banconeTop);
    provette(g, [30, 36, 42], 33, L.vetroRim);
    // fornelli a destra: 2 fuochi scuri + pentola + forno, led sopra
    R(g, 80, 16, 24, 2, L.out);
    R(g, 81, 17, 22, 1, L.led);
    O(g, 78, 26, 28, 18, L.out, L.metallo);
    R(g, 79, 27, 26, 4, L.metalloScuro);
    R(g, 82, 28, 6, 2, L.fuoco);
    R(g, 94, 28, 6, 2, L.fuoco);
    R(g, 92, 21, 9, 5, L.pentola);
    R(g, 93, 20, 7, 1, L.metalloChiaro);
    R(g, 96, 19, 1, 1, L.fuoco);
    R(g, 82, 33, 20, 9, "#4a5762");
    R(g, 86, 35, 10, 4, "#252f38");
    R(g, 82, 32, 20, 1, L.metalloChiaro);
  }

  function labBagno(g) {
    labWall(g, true);
    // infermeria: kit medico a muro nell'angolo in alto a sinistra (croce rossa)
    O(g, 6, 10, 12, 10, L.out, L.bianco);
    R(g, 11, 12, 2, 6, "#d84040");
    R(g, 9, 14, 6, 2, "#d84040");
    // specchio bordato con riflesso + led sopra (destra)
    R(g, 84, 4, 14, 2, L.out);
    R(g, 85, 5, 12, 1, L.led);
    O(g, 80, 8, 22, 14, L.out, L.specchio);
    R(g, 84, 10, 3, 8, L.riflesso);
    // lavandino con rubinetto e colonna (destra)
    R(g, 88, 26, 5, 1, L.pentola);
    R(g, 89, 27, 2, 3, L.pentola);
    O(g, 80, 30, 24, 8, L.out, L.bianco);
    O(g, 86, 38, 12, 10, L.out, L.ceramica);
    // vasca a sinistra: acqua celeste, rubinetto a muro, piedini
    R(g, 38, 20, 2, 8, L.pentola);
    R(g, 34, 20, 5, 2, L.pentola);
    R(g, 34, 24, 1, 3, L.acqua);
    O(g, 4, 28, 40, 16, L.out, L.bianco);
    R(g, 6, 30, 36, 6, L.acqua);
    R(g, 9, 31, 6, 1, L.acquaChiara);
    R(g, 21, 31, 6, 1, L.acquaChiara);
    R(g, 32, 31, 5, 1, L.acquaChiara);
    R(g, 7, 44, 4, 3, L.out);
    R(g, 37, 44, 4, 3, L.out);
  }

  function labSalone(g) {
    labWall(g, false);
    // targa a muro sopra il divano (dettaglio)
    O(g, 10, 8, 14, 8, L.out, L.metalloChiaro);
    R(g, 12, 10, 10, 1, L.parete);
    R(g, 12, 13, 7, 1, L.parete);
    // schermo a muro acceso con "grafico" (destra)
    O(g, 58, 8, 46, 22, L.out, L.schermoFrame);
    R(g, 60, 10, 42, 18, L.schermoOn);
    R(g, 60, 10, 42, 1, L.schermoGlow);
    R(g, 64, 20, 6, 6, L.schermoBar);
    R(g, 74, 16, 6, 10, L.schermoBar);
    R(g, 84, 12, 6, 14, L.schermoBar);
    // divano a sinistra: schienale + 2 cuscini accento + seduta + braccioli + piedini
    O(g, 6, 22, 38, 10, L.out, L.divano);
    O(g, 10, 24, 14, 8, L.out, L.cuscino1);
    O(g, 26, 24, 14, 8, L.out, L.cuscino2);
    O(g, 4, 30, 42, 10, L.out, L.divano);
    R(g, 5, 36, 40, 2, L.divanoChiaro);
    O(g, 4, 26, 6, 14, L.out, L.divanoScuro);
    O(g, 40, 26, 6, 14, L.out, L.divanoScuro);
    R(g, 6, 40, 3, 3, L.out);
    R(g, 41, 40, 3, 3, L.out);
    // tappeto a pavimento
    O(g, 18, 48, 50, 12, L.tappetoBordo, L.tappeto);
    R(g, 20, 51, 46, 1, L.tappetoRiga);
    R(g, 20, 56, 46, 1, L.tappetoRiga);
    mensolaSalone(g, "lab");
  }

  // Camera da letto (GDD "Casa" -> camera, playtest 4 lug 2026): 4a stanza, il letto qui
  // e' GRANDE e protagonista (era troppo piccolo nel salone). Comodino a fianco, finestra
  // sopra la testiera. TODO feature futura: il diario della giornata (testi del socio) va
  // appeso/appoggiato qui, probabilmente sul comodino o a muro sopra di esso.
  // Rettangoli letto (anche hotzone drag per la UI, pattern HOTZONE_VASCA): generosi,
  // protagonisti della scena, forma diversa per lab (capsula medicale) e ship (cupola).
  var LETTO_LAB_CAMERA = { x: 14, y: 20, w: 40, h: 30 };
  var LETTO_SHIP_CAMERA = { x: 14, y: 18, w: 40, h: 32 };

  // Frigo in cucina (GDD "Economia" -> "Spesa e dispensa"): hotzone tap sul frigo/capsula
  // criogenica gia' disegnati da labCucina/shipCucina, coordinate del rettangolo del mobile
  // (con un margine generoso applicato dalla UI in fase di hit-test, stesso pattern hotzone
  // vasca/letto). Esposta come _frigoZona per tema cosi' ui.js puo' fare hit-test sul tap.
  var FRIGO_LAB_CUCINA = { x: 6, y: 12, w: 16, h: 32 };
  var FRIGO_SHIP_CUCINA = { x: 6, y: 10, w: 16, h: 34 };

  function labCameraLetto(g) {
    var r = LETTO_LAB_CAMERA;
    // gambe/base capsula
    R(g, r.x + 2, r.y + r.h - 4, 3, 4, L.metalloScuro);
    R(g, r.x + r.w - 5, r.y + r.h - 4, 3, 4, L.metalloScuro);
    // scocca della capsula medicale, ampia e accogliente
    O(g, r.x, r.y + 4, r.w, r.h - 8, L.out, L.metallo);
    R(g, r.x + 2, r.y + 6, r.w - 4, r.h - 14, L.metalloChiaro);
    // cupola/vetro superiore semiaperta
    O(g, r.x + 4, r.y, r.w - 8, 10, L.out, L.specchio);
    R(g, r.x + 6, r.y + 2, r.w - 16, 3, L.riflesso);
    // cuscino + coperta ben visibili dentro la capsula
    O(g, r.x + 4, r.y + 9, 12, 7, L.out, L.crema);
    R(g, r.x + 4, r.y + 16, r.w - 8, r.h - 22, L.divano);
    R(g, r.x + 4, r.y + 16, r.w - 8, 2, L.divanoChiaro);
    // led di stato sulla scocca
    R(g, r.x + 3, r.y + r.h - 10, 3, 2, L.led);
  }
  function labCamera(g) {
    labWall(g, false);
    // finestra sopra la testiera del letto
    O(g, 6, 6, 20, 14, L.out, L.cielo);
    R(g, 15, 7, 1, 12, L.out);
    R(g, 9, 10, 4, 1, L.nuvola);
    labCameraLetto(g);
    // comodino a fianco del letto con lampada
    O(g, 78, 30, 16, 14, L.out, L.crema);
    R(g, 79, 36, 14, 1, L.cremaOmbra);
    R(g, 83, 22, 2, 8, L.metalloScuro);
    O(g, 80, 18, 8, 6, L.out, L.ambra);
    // oggetti sulla mensola/comodino: spazio slot pavimento+muro gestito da SLOT_SPOTS.camera
  }

  // Letto ship-camera: capsula cupola sospesa, piu' grande della versione salone precedente
  function shipCameraLetto(g) {
    var r = LETTO_SHIP_CAMERA;
    // base/piedistallo
    R(g, r.x + 3, r.y + r.h - 5, r.w - 6, 5, S.mobiletto);
    R(g, r.x + 5, r.y + r.h - 3, r.w - 10, 2, S.mobilettoTop);
    // scocca capsula-navicella
    O(g, r.x, r.y + 3, r.w, r.h - 10, S.out, S.metallo);
    R(g, r.x + 2, r.y + 5, r.w - 4, r.h - 16, S.mobiletto);
    // cupola trasparente in cima, con stelle
    O(g, r.x + 5, r.y, r.w - 10, 9, S.out, S.metalloChiaro);
    R(g, r.x + 7, r.y + 1, r.w - 14, 6, S.spazio);
    stars(g, r.x + 7, r.y + 1, r.w - 14, 6, S.stella);
    // giaciglio energetico interno + led
    R(g, r.x + 4, r.y + 12, r.w - 8, r.h - 20, S.sportello);
    R(g, r.x + 5, r.y + 13, 4, 2, S.ledC);
    R(g, r.x + r.w - 9, r.y + r.h - 9, 4, 2, S.ledM);
  }
  function shipCamera(g) {
    shipWall(g, S_WALLS.salone);
    oblo(g, 8, 6, 18, 13);
    shipCameraLetto(g);
    // comodino luminoso a fianco
    O(g, 78, 30, 16, 14, S.out, S.mobiletto);
    R(g, 80, 36, 12, 1, S.glow);
    ledPanel(g, 82, 18);
    // oggetti sulla mensola/comodino: spazio slot pavimento+muro gestito da SLOT_SPOTS.camera
  }

  // Mensola a muro del salone + zona ganci/quadri accanto (supporti collezione, GDD -> Casa).
  // Ripiano oggetti a y14-16 (lo slot "mensola" appoggia qui), ripiano decorativo sotto a y19-21.
  function mensolaSalone(g, tema) {
    if (tema === "lab") {
      // mensola metallica con montanti e staffe
      R(g, 25, 14, 16, 2, L.metalloChiaro);
      R(g, 25, 16, 16, 1, L.out);
      R(g, 25, 19, 16, 2, L.metalloChiaro);
      R(g, 25, 21, 16, 1, L.out);
      R(g, 25, 14, 1, 8, L.metalloScuro); // montanti
      R(g, 40, 14, 1, 8, L.metalloScuro);
      // mini-libri decorativi sul ripiano basso
      R(g, 28, 16, 2, 3, "#c22a3a");
      R(g, 31, 16, 2, 3, "#4a7ba6");
      R(g, 35, 17, 3, 2, "#f0b84a");
      // ganci a muro accanto (zona quadri)
      R(g, 44, 6, 2, 2, L.metalloScuro);
      R(g, 49, 6, 2, 2, L.metalloScuro);
    } else {
      // mensola fluttuante luminosa (niente montanti, glow sotto i ripiani)
      R(g, 25, 14, 16, 2, S.metalloChiaro);
      R(g, 25, 16, 16, 1, S.glow);
      R(g, 25, 19, 16, 2, S.metalloChiaro);
      R(g, 25, 21, 16, 1, S.glow);
      R(g, 28, 16, 2, 3, "#4ae0d8"); // mini-oggetti luminosi
      R(g, 31, 16, 2, 3, "#e85ad8");
      R(g, 35, 17, 3, 2, "#f0b84a");
      R(g, 44, 6, 2, 2, S.metalloChiaro); // ganci
      R(g, 49, 6, 2, 2, S.metalloChiaro);
    }
  }

  // ===== SHIP (stessi slot, skin sci-fi; oblò con stelle e palette parete diversa in ogni stanza) =====
  function shipCucina(g) {
    shipWall(g, S_WALLS.cucina);
    oblo(g, 56, 6, 24, 16);
    ledPanel(g, 42, 10);
    // distintivo cucina: tubo dispenser del cibo dal soffitto al bancone, con pellet in caduta
    O(g, 28, 0, 10, 31, S.out, S.metallo);
    R(g, 30, 2, 6, 27, S.ghiaccio);
    R(g, 32, 6, 2, 2, "#a8743c");
    R(g, 31, 13, 2, 2, "#c04a3c");
    R(g, 33, 20, 2, 2, "#a8743c");
    O(g, 26, 29, 14, 4, S.out, S.metalloChiaro);
    // capsula criogenica (frigo): vetro ghiaccio + brina + base con led
    O(g, 6, 10, 16, 34, S.out, S.metallo);
    R(g, 8, 12, 12, 24, S.ghiaccio);
    R(g, 10, 15, 3, 1, S.brina);
    R(g, 15, 20, 3, 1, S.brina);
    R(g, 11, 28, 4, 1, S.brina);
    R(g, 8, 37, 12, 5, S.bancone);
    R(g, 9, 39, 3, 1, S.ledC);
    R(g, 14, 39, 3, 1, S.ledM);
    R(g, 19, 20, 1, 5, S.out);
    // bancone con contenitori luminosi
    O(g, 26, 32, 26, 12, S.out, S.bancone);
    R(g, 27, 33, 24, 2, S.banconeTop);
    provette(g, [30, 36, 42], 33, S.brina);
    // fornelli sci-fi a destra: 2 fuochi con glow magenta + pentola
    O(g, 78, 26, 28, 18, S.out, S.mobiletto);
    R(g, 79, 27, 26, 4, S.mobilettoTop);
    R(g, 82, 28, 6, 2, S.fuoco);
    R(g, 83, 28, 4, 1, S.fuocoGlow);
    R(g, 94, 28, 6, 2, S.fuoco);
    R(g, 95, 28, 4, 1, S.fuocoGlow);
    R(g, 92, 21, 9, 5, S.pentola);
    R(g, 93, 20, 7, 1, S.metalloChiaro);
    R(g, 82, 33, 20, 9, S.sportello);
    R(g, 86, 35, 10, 4, S.out);
    R(g, 82, 32, 20, 1, S.metalloChiaro);
  }

  function shipBagno(g) {
    shipWall(g, S_WALLS.bagno);
    oblo(g, 10, 6, 20, 13);
    // distintivo bagno: capsula-doccia a tubo al centro (vetro + gocce + base)
    O(g, 48, 10, 16, 6, S.out, S.metalloChiaro);
    O(g, 50, 15, 12, 26, S.out, "#bfe8f4");
    R(g, 54, 19, 1, 3, S.acqua);
    R(g, 58, 24, 1, 3, S.acqua);
    R(g, 55, 30, 1, 3, S.acqua);
    R(g, 59, 35, 1, 2, S.acqua);
    O(g, 48, 40, 16, 4, S.out, S.metallo);
    // pannellino led tra doccia e specchio
    O(g, 68, 24, 9, 10, S.out, S.mobiletto);
    R(g, 70, 26, 2, 2, S.ledM);
    R(g, 73, 26, 2, 2, S.ledC);
    R(g, 70, 30, 2, 2, S.ledA);
    // specchio sci-fi (destra)
    O(g, 82, 8, 20, 13, S.out, S.specchio);
    R(g, 86, 10, 3, 7, S.riflesso);
    // lavandino: vaschetta ghiaccio + colonna metallica + rubinetto
    R(g, 89, 26, 5, 1, S.metalloChiaro);
    R(g, 90, 27, 2, 3, S.metalloChiaro);
    O(g, 82, 30, 22, 8, S.out, S.ghiaccio);
    O(g, 88, 38, 12, 10, S.out, S.metallo);
    // infermeria: capsula rigenerante compatta nell'angolo destro (croce verde luminosa)
    O(g, 104, 24, 7, 20, S.out, S.metallo);
    R(g, 105, 27, 5, 8, S.ghiaccio);
    R(g, 107, 37, 1, 4, "#4ae08a");
    R(g, 106, 38, 3, 2, "#4ae08a");
    // vasca a bolle a sinistra, con oblò sul fianco
    O(g, 4, 26, 40, 18, S.out, S.metallo);
    R(g, 6, 28, 36, 7, S.acqua);
    R(g, 10, 29, 3, 2, S.bolla);
    R(g, 20, 30, 2, 2, S.bolla);
    R(g, 30, 29, 3, 2, S.bolla);
    R(g, 12, 22, 2, 2, S.bolla);
    R(g, 24, 21, 2, 2, S.bolla);
    R(g, 34, 23, 1, 1, S.bolla);
    O(g, 18, 36, 10, 6, S.out, S.spazio);
    R(g, 21, 38, 3, 1, S.acqua);
  }

  function shipSalone(g) {
    shipWall(g, S_WALLS.salone);
    ledPanel(g, 10, 8);
    // distintivo salone: schermo panoramico stellare gigante (è anche l'oblò della stanza)
    oblo(g, 52, 6, 56, 22);
    // distintivo salone: pianta aliena in vaso (steli + bulbi luminosi)
    R(g, 99, 38, 2, 13, S.pianta);
    R(g, 103, 32, 2, 19, S.pianta);
    R(g, 95, 42, 2, 9, S.pianta);
    R(g, 98, 35, 4, 4, S.piantaBulbo);
    R(g, 102, 29, 4, 4, S.piantaBulbo);
    R(g, 94, 39, 4, 4, S.piantaBulbo2);
    O(g, 94, 50, 14, 8, S.out, S.pentola);
    // seduta futuristica a sinistra: schienale viola + 2 cuscini + base con striscia glow
    O(g, 6, 22, 38, 10, S.out, S.seduta);
    O(g, 10, 24, 14, 8, S.out, S.cuscino1);
    O(g, 26, 24, 14, 8, S.out, S.cuscino2);
    O(g, 4, 30, 42, 10, S.out, S.sedutaBase);
    R(g, 5, 37, 40, 1, S.glow);
    // pad luminoso a pavimento (tappeto)
    O(g, 18, 48, 50, 12, S.out, S.pad);
    R(g, 20, 49, 46, 1, S.glow);
    R(g, 20, 58, 46, 1, S.glow);
    mensolaSalone(g, "ship");
  }

  var BUILDERS = {
    lab: { cucina: labCucina, bagno: labBagno, salone: labSalone, camera: labCamera },
    ship: { cucina: shipCucina, bagno: shipBagno, salone: shipSalone, camera: shipCamera }
  };

  // ===== Poop: piccolo sprite marrone a terra, 1-3 in base a stato.poop =====
  var POOP_SPOTS = [[16, 52], [54, 55], [92, 52]];
  function drawPoop(g, count) {
    var n = Math.max(0, Math.min(3, count || 0));
    g.fillStyle = "#5c3a1e";
    for (var i = 0; i < n; i++) {
      var p = POOP_SPOTS[i];
      g.fillRect(p[0], p[1], 4, 3);
      g.fillRect(p[0] + 1, p[1] - 1, 2, 1);
    }
  }

  // ===== Mappa della città (tab Missioni): 144x128, crepuscolo, 9 luoghi + strade =====
  // Fix playtest "Mappa leggibilità": scena schiarita rispetto alla notte piena originale,
  // cosi' gli edifici a silhouette grande restano a contrasto invece di sparire nel buio.
  // Unica per entrambe le razze: è la città, non la casa.
  var MAPPA_W = 144, MAPPA_H = 128;

  // Palette mappa a CREPUSCOLO (fix playtest, GDD "Mappa leggibilità"): piu' chiara della
  // notte piena di prima, cosi' gli edifici (a silhouette grande) restano a contrasto sul
  // cielo della sera invece di sparire nel quasi-nero.
  var M = {
    fondo: "#2a3350", isolato: "#333d5c",
    strada: "#3d4666", corsia: "#6c7796", marciapiede: "#4b5578",
    lastricato: "#3c4562", lastricatoChiaro: "#485272",
    lampione: "#6c7796", lampLuce: "#f8e05a", lampAlone: "#5c5638",
    zebra: "#d8dfe8",
    pinOut: "#3a3208", pinFill: "#f0c832", pinBright: "#ffe066", pinLuce: "#fff6c0",
    // toni "spento" condivisi: piu' chiari di prima ma ancora chiaramente desaturati/spenti
    dimMuro: "#3a4058", dimScuro: "#323952", dimChiaro: "#484f6c", dimFinestra: "#383f58"
  };

  // rettangoli logici dei 9 luoghi missione (hit-test per la UI, generosi, min 16x14)
  var MAPPA_PINS = {
    m2: { x: 2,   y: 4,  w: 32, h: 36 }, // Parco delle Antenne
    m4: { x: 38,  y: 6,  w: 26, h: 34 }, // Biblioteca dei Bit Perduti
    m5: { x: 80,  y: 4,  w: 62, h: 36 }, // Vicoli della Zona Industriale
    m1: { x: 2,   y: 52, w: 32, h: 36 }, // Sala Giochi "Bit & Byte"
    m0: { x: 36,  y: 52, w: 18, h: 36 }, // Negozio di Giocattoli
    m6: { x: 90,  y: 52, w: 24, h: 36 }, // Studio di Trasmissione
    m3: { x: 118, y: 52, w: 24, h: 36 }, // Dojo del Rottame
    m8: { x: 2,   y: 98, w: 62, h: 26 }, // Neon Avenue
    m7: { x: 84,  y: 98, w: 34, h: 26 }  // Fogne / Laboratorio Abbandonato
  };

  // Shop cibo (GDD "Economia" -> "Spesa e dispensa"): pin FISSO e SEMPRE illuminato, distinto
  // dalla rosa a rotazione delle missioni (occupa lo spazio libero tra Neon Avenue e le Fogne,
  // sotto la strada verticale). Tap -> menu acquisto (ui.js), non una missione: nessuna
  // scheda in content/missioni.md, nessun id 'm*'. Chiave separata da MAPPA_PINS/LUOGHI cosi'
  // il resto del codice (rosaDelGiorno, statoMappa, hitPin sui soli 'attivi') non lo confonde
  // mai con un luogo missione.
  var SHOP_PIN_ID = 'shop';
  var MAPPA_PIN_SHOP = { x: 64, y: 100, w: 20, h: 24 };

  // pin a goccia gialla sopra un luogo; bright = frame di pulsazione
  function mapPin(g, cx, tipY, bright) {
    var yTop = tipY - 10;
    R(g, cx - 4, yTop, 9, 7, M.pinOut);
    R(g, cx - 2, yTop + 7, 5, 2, M.pinOut);
    R(g, cx - 1, yTop + 9, 3, 1, M.pinOut);
    R(g, cx - 3, yTop + 1, 7, 5, bright ? M.pinBright : M.pinFill);
    R(g, cx - 1, yTop + 6, 3, 2, bright ? M.pinBright : M.pinFill);
    R(g, cx - 2, yTop + 2, 2, 2, M.pinLuce);
  }
  function pinTipY(rect) { return Math.max(12, rect.y + 2); }
  function pinCx(rect) { return rect.x + Math.floor(rect.w / 2); }

  // ----- i 9 luoghi (on = illuminato/attivo, off = spento/desaturato) -----
  function luogoParco(g, on) { // m2: verde con laghetto, sentiero e due torri-antenna
    var r = MAPPA_PINS.m2;
    R(g, r.x, r.y, r.w, r.h, on ? "#24543a" : "#232c33");
    // laghetto in basso a sinistra
    R(g, r.x + 3, r.y + 24, 12, 9, on ? "#2e6a8a" : "#26303c");
    R(g, r.x + 5, r.y + 26, 8, 5, on ? "#4a9ab8" : "#2c3844");
    if (on) R(g, r.x + 7, r.y + 27, 3, 1, "#8fd8f0");
    // sentiero che sale dal bordo al centro
    R(g, r.x + 20, r.y + 30, 4, 6, on ? "#5c6450" : "#2e3440");
    R(g, r.x + 18, r.y + 24, 4, 6, on ? "#5c6450" : "#2e3440");
    R(g, r.x + 16, r.y + 18, 4, 6, on ? "#5c6450" : "#2e3440");
    // alberi
    R(g, r.x + 24, r.y + 8, 6, 6, on ? "#3f9c5c" : "#2c3844");
    R(g, r.x + 26, r.y + 14, 2, 3, on ? "#5c4a2e" : "#2a303c");
    R(g, r.x + 25, r.y + 20, 5, 5, on ? "#357a4a" : "#28323e");
    R(g, r.x + 2, r.y + 14, 5, 5, on ? "#3f9c5c" : "#2c3844");
    // due torri-antenna a traliccio con luci rosse
    R(g, r.x + 8, r.y + 4, 2, 16, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x + 6, r.y + 8, 6, 1, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x + 6, r.y + 14, 6, 1, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x + 8, r.y + 2, 2, 2, on ? "#e84040" : "#4a3540");
    R(g, r.x + 16, r.y + 8, 2, 12, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x + 14, r.y + 12, 6, 1, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x + 16, r.y + 6, 2, 2, on ? "#e84040" : "#4a3540");
  }
  function luogoBiblioteca(g, on) { // m4: facciata classica, colonne, scalinata
    var r = MAPPA_PINS.m4;
    O(g, r.x + 1, r.y + 5, r.w - 2, r.h - 12, "#0e1118", on ? "#6e5638" : M.dimMuro);
    R(g, r.x + 3, r.y, r.w - 6, 5, on ? "#8a6c46" : M.dimChiaro); // timpano
    R(g, r.x + 5, r.y + 2, r.w - 10, 1, on ? "#5c4426" : M.dimScuro);
    R(g, r.x + 4, r.y + 8, 3, 14, on ? "#c9a878" : M.dimChiaro); // colonne
    R(g, r.x + 11, r.y + 8, 3, 14, on ? "#c9a878" : M.dimChiaro);
    R(g, r.x + 19, r.y + 8, 3, 14, on ? "#c9a878" : M.dimChiaro);
    R(g, r.x + 8, r.y + 10, 2, 6, on ? "#f0b84a" : M.dimFinestra); // finestre calde
    R(g, r.x + 15, r.y + 10, 2, 6, on ? "#f0b84a" : M.dimFinestra);
    R(g, r.x + 10, r.y + 16, 6, 7, on ? "#f0d089" : M.dimFinestra); // portone
    // scalinata a 3 gradini
    R(g, r.x + 4, r.y + 27, r.w - 8, 2, on ? "#a08a68" : M.dimChiaro);
    R(g, r.x + 2, r.y + 29, r.w - 4, 2, on ? "#8a755a" : "#2e3440");
    R(g, r.x, r.y + 31, r.w, 3, on ? "#75634c" : "#2a303c");
  }
  function luogoIndustria(g, on) { // m5: capannoni a shed, ciminiere, serbatoio, recinzione
    var r = MAPPA_PINS.m5;
    R(g, r.x, r.y + 8, r.w, r.h - 8, on ? "#3a3644" : M.dimScuro); // lotto
    R(g, r.x, r.y + 8, r.w, 1, on ? "#5c5468" : "#2e3440"); // recinzione
    for (var f = 2; f < r.w; f += 6) R(g, r.x + f, r.y + 6, 1, 3, on ? "#5c5468" : "#2e3440");
    O(g, r.x + 2, r.y + 14, 24, 18, "#0e1118", on ? "#4a4456" : M.dimMuro); // capannone 1 (tetto a shed)
    R(g, r.x + 3, r.y + 12, 6, 3, on ? "#5c5468" : M.dimChiaro);
    R(g, r.x + 11, r.y + 12, 6, 3, on ? "#5c5468" : M.dimChiaro);
    R(g, r.x + 19, r.y + 12, 6, 3, on ? "#5c5468" : M.dimChiaro);
    O(g, r.x + 30, r.y + 18, 20, 14, "#0e1118", on ? "#443e50" : M.dimMuro); // capannone 2
    O(g, r.x + 53, r.y + 14, 8, 18, "#0e1118", on ? "#50485e" : M.dimMuro); // serbatoio
    R(g, r.x + 55, r.y + 12, 4, 3, on ? "#5c5468" : M.dimChiaro);
    R(g, r.x + 8, r.y, 5, 14, on ? "#5c5468" : M.dimChiaro); // ciminiera 1
    R(g, r.x + 20, r.y + 3, 5, 11, on ? "#5c5468" : M.dimChiaro); // ciminiera 2
    R(g, r.x + 38, r.y + 6, 5, 12, on ? "#5c5468" : M.dimChiaro); // ciminiera 3
    if (on) {
      R(g, r.x + 9, r.y - 3, 3, 3, "#6a7280"); // fumo
      R(g, r.x + 22, r.y, 3, 3, "#6a7280");
      R(g, r.x + 40, r.y + 2, 2, 2, "#6a7280");
      R(g, r.x + 8, r.y, 5, 1, "#e84040"); // luci di segnalazione
      R(g, r.x + 38, r.y + 6, 5, 1, "#f0b84a");
      R(g, r.x + 5, r.y + 18, 4, 4, "#f0b84a"); // finestre calde
      R(g, r.x + 14, r.y + 18, 4, 4, "#f0b84a");
      R(g, r.x + 34, r.y + 22, 3, 3, "#f0b84a");
      R(g, r.x + 43, r.y + 22, 3, 3, "#f0b84a");
    }
  }
  function luogoSalaGiochi(g, on) { // m1: vetrata con cabinati visibili dentro + insegna neon
    var r = MAPPA_PINS.m1;
    O(g, r.x, r.y + 7, r.w, r.h - 7, "#0e1118", on ? "#221c34" : M.dimScuro);
    R(g, r.x + 2, r.y, r.w - 4, 7, on ? "#2e2547" : M.dimMuro); // fascione insegna
    R(g, r.x + 4, r.y + 2, 7, 3, on ? "#e85ad8" : "#3d3247"); // neon insegna
    R(g, r.x + 13, r.y + 2, 7, 3, on ? "#4dd8e8" : "#32404a");
    R(g, r.x + 22, r.y + 2, 6, 3, on ? "#5ce87f" : "#324a3a");
    if (on) R(g, r.x + 2, r.y + 6, r.w - 4, 1, "#e85ad8"); // bordo glow
    // vetrata con dentro due cabinati
    O(g, r.x + 3, r.y + 11, 18, 16, "#0e1118", on ? "#1a1526" : M.dimFinestra);
    R(g, r.x + 5, r.y + 13, 5, 10, on ? "#2e2840" : "#252a36"); // cabinato 1
    R(g, r.x + 6, r.y + 14, 3, 3, on ? "#4dd8e8" : "#2c3540");
    R(g, r.x + 12, r.y + 13, 5, 10, on ? "#2e2840" : "#252a36"); // cabinato 2
    R(g, r.x + 13, r.y + 14, 3, 3, on ? "#e85ad8" : "#332c3e");
    // porta luminosa
    R(g, r.x + 24, r.y + 14, 6, 13, on ? "#e85ad8" : M.dimFinestra);
    R(g, r.x + 25, r.y + 15, 4, 12, on ? "#f8bff0" : M.dimScuro);
  }
  function luogoNegozio(g, on) { // m0: negozietto con tenda a strisce, vetrina e insegna
    var r = MAPPA_PINS.m0;
    O(g, r.x, r.y + 6, r.w, r.h - 6, "#0e1118", on ? "#5c4a6e" : M.dimMuro);
    R(g, r.x + 3, r.y + 1, r.w - 6, 4, on ? "#f0b84a" : M.dimChiaro); // insegna
    for (var i = 0; i < 5; i++) { // tenda a strisce
      var sx0 = r.x + 1 + i * 4;
      var sw = Math.min(4, r.x + r.w - 1 - sx0);
      if (sw > 0) R(g, sx0, r.y + 6, sw, 4, i % 2 === 0 ? (on ? "#e85a5a" : "#3d3038") : (on ? "#f4f0e0" : M.dimChiaro));
    }
    R(g, r.x + 2, r.y + 13, 9, 10, on ? "#f8e05a" : M.dimFinestra); // vetrina calda
    if (on) {
      R(g, r.x + 4, r.y + 18, 2, 4, "#d83048"); // giocattoli in vetrina
      R(g, r.x + 7, r.y + 16, 3, 3, "#4a7ba6");
      R(g, r.x + 4, r.y + 15, 2, 2, "#5ce87f");
    }
    R(g, r.x + 12, r.y + 16, 5, 12, on ? "#8a5c34" : M.dimScuro); // porta
    R(g, r.x + 2, r.y + 30, r.w - 4, 3, on ? "#75634c" : "#2a303c"); // gradino d'ingresso
  }
  function luogoStudioTV(g, on) { // m6: studio con parabolona, ON AIR e ingresso a vetri
    var r = MAPPA_PINS.m6;
    O(g, r.x, r.y + 9, r.w, r.h - 9, "#0e1118", on ? "#3a4258" : M.dimMuro);
    R(g, r.x + 16, r.y + 1, 2, 9, on ? "#8fa3ad" : M.dimChiaro); // palo
    R(g, r.x + 10, r.y, 6, 2, on ? "#c9d2dc" : M.dimChiaro); // parabola grande
    R(g, r.x + 8, r.y + 2, 6, 2, on ? "#c9d2dc" : M.dimChiaro);
    R(g, r.x + 7, r.y + 4, 4, 2, on ? "#c9d2dc" : M.dimChiaro);
    R(g, r.x + 2, r.y + 11, 6, 3, on ? "#e84040" : "#3d2c34"); // ON AIR
    if (on) R(g, r.x + 9, r.y + 12, 4, 1, "#8a2c2c");
    R(g, r.x + 3, r.y + 17, 6, 5, on ? "#4dd8e8" : M.dimFinestra); // vetrate regia
    R(g, r.x + 11, r.y + 17, 6, 5, on ? "#4dd8e8" : M.dimFinestra);
    O(g, r.x + 8, r.y + 25, 9, 11, "#0e1118", on ? "#4dd8e8" : M.dimFinestra); // ingresso a vetri
    R(g, r.x + 12, r.y + 27, 1, 9, "#0e1118");
  }
  function luogoDojo(g, on) { // m3: cortile murato con cancello + pagoda a due falde
    var r = MAPPA_PINS.m3;
    // cortile con muretto e cancello
    R(g, r.x, r.y + 16, r.w, r.h - 16, on ? "#3d3830" : M.dimScuro);
    R(g, r.x, r.y + 16, r.w, 1, on ? "#75634c" : "#2e3440");
    R(g, r.x, r.y + 34, r.w, 2, on ? "#75634c" : "#2e3440"); // muretto davanti
    R(g, r.x + 9, r.y + 34, 6, 2, on ? "#f0b84a" : M.dimFinestra); // cancello caldo
    // vialetto di pietre
    R(g, r.x + 10, r.y + 30, 4, 2, on ? "#8a755a" : "#2e3440");
    R(g, r.x + 10, r.y + 26, 4, 2, on ? "#8a755a" : "#2e3440");
    // pagoda
    R(g, r.x + 2, r.y + 6, r.w - 4, 3, on ? "#8a3038" : "#33262c"); // falda larga
    R(g, r.x + 5, r.y + 1, r.w - 10, 5, on ? "#a83c46" : "#3d2c32"); // falda alta
    O(g, r.x + 4, r.y + 9, r.w - 8, 13, "#0e1118", on ? "#8a5c34" : M.dimMuro);
    R(g, r.x + 9, r.y + 13, 6, 9, on ? "#f0b84a" : M.dimFinestra); // porta calda
    R(g, r.x + 5, r.y + 12, 2, 5, on ? "#f0e0c0" : M.dimFinestra); // lanterne
    R(g, r.x + 17, r.y + 12, 2, 5, on ? "#f0e0c0" : M.dimFinestra);
  }
  function luogoNeonAvenue(g, on) { // m8: boulevard con facciate, insegne neon e lampioni
    var r = MAPPA_PINS.m8;
    R(g, r.x, r.y, r.w, r.h, on ? "#1c1830" : M.dimScuro);
    R(g, r.x, r.y + 19, r.w, 2, on ? "#e85ad8" : "#3d3247"); // doppia striscia neon a terra
    R(g, r.x, r.y + 22, r.w, 1, on ? "#4dd8e8" : "#32404a");
    var facciate = [
      { fx: 2,  neon: "#e85ad8", dimN: "#3d3247" },
      { fx: 17, neon: "#5ce87f", dimN: "#324a3a" },
      { fx: 32, neon: "#4dd8e8", dimN: "#32404a" },
      { fx: 47, neon: "#f0b84a", dimN: "#3d3830" }
    ];
    facciate.forEach(function (f) {
      O(g, r.x + f.fx, r.y + 2, 13, 15, "#0e1118", on ? "#2e2547" : M.dimMuro);
      R(g, r.x + f.fx + 2, r.y + 4, 9, 3, on ? f.neon : f.dimN); // insegna
      if (on) {
        R(g, r.x + f.fx + 4, r.y + 10, 4, 6, "#f8e05a"); // porta accesa
        R(g, r.x + f.fx + 10, r.y + 9, 2, 3, f.neon); // dettaglio laterale
      }
    });
  }
  function luogoFogne(g, on) { // m7: piazzale con tombino grande, seconda grata, tubo e cartello
    var r = MAPPA_PINS.m7;
    R(g, r.x, r.y, r.w, r.h, on ? "#2e3547" : M.dimScuro);
    O(g, r.x + 6, r.y + 7, 16, 11, "#0e1118", on ? "#4a5268" : M.dimMuro); // tombino grande
    R(g, r.x + 8, r.y + 10, 12, 1, "#0e1118"); // grata
    R(g, r.x + 8, r.y + 13, 12, 1, "#0e1118");
    R(g, r.x + 25, r.y + 16, 6, 4, on ? "#3d4657" : M.dimMuro); // seconda grata a terra
    R(g, r.x + 26, r.y + 17, 4, 1, "#0e1118");
    R(g, r.x + 26, r.y + 3, 4, 14, on ? "#3f4a3a" : M.dimMuro); // tubo verticale
    R(g, r.x + 25, r.y + 3, 6, 2, on ? "#4a5744" : M.dimMuro);
    // cartello di pericolo
    R(g, r.x + 2, r.y + 10, 1, 8, on ? "#8fa3ad" : "#3a4150");
    R(g, r.x, r.y + 6, 5, 5, on ? "#f0b84a" : M.dimChiaro);
    R(g, r.x + 2, r.y + 7, 1, 2, "#0e1118");
    R(g, r.x + 2, r.y + 10, 1, 1, "#0e1118");
    if (on) {
      R(g, r.x + 8, r.y + 11, 12, 2, "#5ce87f"); // bagliore verde dalla grata
      R(g, r.x + 7, r.y + 18, 14, 1, "#2e5c3a");
      R(g, r.x + 27, r.y, 2, 2, "#6a7280"); // sbuffo dal tubo
    }
  }

  // Shop cibo "Market" (GDD "Economia" -> "Spesa e dispensa"): tettoia a righe verde/crema,
  // cassette di frutta colorate in vetrina, insegna sempre accesa. SEMPRE illuminato (nessun
  // parametro "on": a differenza dei luoghi missione non fa mai parte della rosa spenta),
  // silhouette diversa dal Negozio di Giocattoli (m0, tenda rosso/crema) per non confondersi.
  function luogoShop(g) {
    var r = MAPPA_PIN_SHOP;
    O(g, r.x, r.y + 6, r.w, r.h - 6, "#0e1118", "#e8dfc4"); // corpo edificio
    R(g, r.x + 1, r.y + 1, r.w - 2, 5, "#3f9c5c"); // tettoia verde
    R(g, r.x + 1, r.y + 5, r.w - 2, 1, "#2c7a44");
    for (var i = 0; i < r.w - 2; i += 4) R(g, r.x + 1 + i, r.y + 1, 2, 5, "#5cc47f"); // righe tenda
    R(g, r.x + 3, r.y + 9, r.w - 6, 3, "#f8e05a"); // insegna gialla
    // vetrina con cassette di frutta colorate
    R(g, r.x + 3, r.y + 13, r.w - 6, 8, "#2e3a2c");
    R(g, r.x + 4, r.y + 14, 4, 3, "#e85a5a"); // mele
    R(g, r.x + 9, r.y + 14, 4, 3, "#f0b84a"); // arance
    R(g, r.x + 14, r.y + 15, 3, 2, "#5ce87f"); // insalata
    // porta
    R(g, r.x + 7, r.y + 21, 6, 3, "#5c3a1e");
  }

  var LUOGHI = {
    m0: luogoNegozio, m1: luogoSalaGiochi, m2: luogoParco, m3: luogoDojo, m4: luogoBiblioteca,
    m5: luogoIndustria, m6: luogoStudioTV, m7: luogoFogne, m8: luogoNeonAvenue
  };

  // decorazioni di vita cittadina (sempre visibili, non sono luoghi missione)
  function mapAuto(g, x, y, col, verticale) {
    if (verticale) {
      R(g, x, y, 4, 9, "#0e1118");
      R(g, x, y + 1, 4, 7, col);
      R(g, x + 1, y + 2, 2, 2, "#1a2030"); // parabrezza
      R(g, x + 1, y + 6, 2, 1, "#1a2030");
    } else {
      R(g, x, y, 9, 4, "#0e1118");
      R(g, x + 1, y, 7, 4, col);
      R(g, x + 2, y + 1, 2, 2, "#1a2030");
      R(g, x + 6, y + 1, 1, 2, "#1a2030");
    }
  }
  function mapLampione(g, x, y) {
    R(g, x + 1, y + 2, 1, 7, M.lampione);
    R(g, x, y, 3, 2, M.lampLuce);
    R(g, x - 1, y + 2, 5, 1, M.lampAlone);
  }
  function mapZebra(g, x, y, orizzontale) {
    for (var i = 0; i < 4; i++) {
      if (orizzontale) R(g, x + i * 3, y, 2, 6, M.zebra);
      else R(g, x, y + i * 3, 6, 2, M.zebra);
    }
  }

  function mappaBase(g) {
    R(g, 0, 0, MAPPA_W, MAPPA_H, M.fondo);
    // isolati
    R(g, 0, 0, MAPPA_W, 43, M.isolato);
    R(g, 0, 51, MAPPA_W, 38, M.isolato);
    R(g, 0, 97, MAPPA_W, 31, M.isolato);
    // strade orizzontali
    R(g, 0, 44, MAPPA_W, 6, M.strada);
    R(g, 0, 90, MAPPA_W, 6, M.strada);
    for (var x = 2; x < MAPPA_W; x += 10) {
      R(g, x, 46, 5, 1, M.corsia);
      R(g, x, 92, 5, 1, M.corsia);
    }
    // strada verticale (interrotta dalla piazzetta)
    R(g, 69, 0, 6, 44, M.strada);
    R(g, 69, 96, 6, MAPPA_H - 96, M.strada);
    for (var y = 2; y < 44; y += 10) R(g, 71, y, 1, 5, M.corsia);
    for (var y2 = 98; y2 < MAPPA_H; y2 += 10) R(g, 71, y2, 1, 5, M.corsia);
    // marciapiedi
    R(g, 0, 43, MAPPA_W, 1, M.marciapiede);
    R(g, 0, 50, MAPPA_W, 1, M.marciapiede);
    R(g, 0, 89, MAPPA_W, 1, M.marciapiede);
    R(g, 0, 96, MAPPA_W, 1, M.marciapiede);
    R(g, 68, 0, 1, 44, M.marciapiede);
    R(g, 75, 0, 1, 44, M.marciapiede);
    R(g, 68, 96, 1, MAPPA_H - 96, M.marciapiede);
    R(g, 75, 96, 1, MAPPA_H - 96, M.marciapiede);
    // strisce pedonali
    mapZebra(g, 39, 44, true);
    mapZebra(g, 100, 90, true);
    // piazzetta centrale lastricata con fontana, panchina, idrante
    R(g, 58, 51, 28, 38, M.lastricato);
    for (var px = 60; px < 86; px += 6) R(g, px, 53, 1, 34, M.lastricatoChiaro);
    for (var py = 55; py < 89; py += 8) R(g, 59, py, 26, 1, M.lastricatoChiaro);
    O(g, 64, 62, 16, 12, "#0e1118", "#4a5268"); // fontana
    R(g, 66, 64, 12, 8, "#2e6a8a");
    R(g, 69, 66, 6, 2, "#8fd8f0");
    R(g, 71, 63, 2, 3, "#8fd8f0"); // zampillo
    R(g, 62, 80, 8, 2, "#75634c"); // panchina
    R(g, 62, 82, 1, 2, "#4a3a2e");
    R(g, 69, 82, 1, 2, "#4a3a2e");
    R(g, 80, 55, 3, 4, "#c23a3a"); // idrante
    R(g, 81, 54, 1, 1, "#c23a3a");
    // lampioni accesi
    mapLampione(g, 60, 53);
    mapLampione(g, 82, 78);
    mapLampione(g, 36, 32);
    mapLampione(g, 115, 78);
    // auto parcheggiate
    mapAuto(g, 100, 45, "#c23a3a", false);
    mapAuto(g, 20, 91, "#3a8ac2", false);
    mapAuto(g, 70, 20, "#8a4ab0", true);
    // casetta di riempimento (non è un luogo missione, sempre spenta)
    O(g, 122, 98, 20, 24, "#0e1118", M.dimMuro);
    R(g, 126, 104, 4, 5, M.dimFinestra);
    R(g, 134, 104, 4, 5, M.dimFinestra);
    R(g, 130, 114, 5, 8, M.dimScuro);
  }

  // stato = { attivi:['m1',...], inCorso:'m3'|null, frame:0|1 }
  function drawMappa(canvas, stato) {
    if (!canvas) return;
    stato = stato || {};
    var attivi = stato.attivi || [];
    var g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var sx = canvas.width / MAPPA_W;
    var sy = canvas.height / MAPPA_H;
    var needsScale = sx !== 1 || sy !== 1;
    if (needsScale) { g.save(); g.scale(sx, sy); }

    mappaBase(g);
    var id;
    for (id in LUOGHI) {
      if (!Object.prototype.hasOwnProperty.call(LUOGHI, id)) continue;
      var on = attivi.indexOf(id) >= 0 || stato.inCorso === id;
      LUOGHI[id](g, on);
    }
    // Shop cibo: SEMPRE disegnato illuminato (non fa parte della rosa a rotazione, v.
    // MAPPA_PIN_SHOP), con pin proprio sempre visibile (nessun frame di pulsazione: non e'
    // mai "in corso" come una missione).
    luogoShop(g);
    mapPin(g, pinCx(MAPPA_PIN_SHOP), pinTipY(MAPPA_PIN_SHOP), false);

    // pin sopra i luoghi attivi; quello in corso pulsa su 2 frame
    for (id in LUOGHI) {
      if (!Object.prototype.hasOwnProperty.call(LUOGHI, id)) continue;
      var rect = MAPPA_PINS[id];
      if (stato.inCorso === id) {
        var su = stato.frame === 1 ? 2 : 0;
        mapPin(g, pinCx(rect), pinTipY(rect) - su, stato.frame === 1);
      } else if (attivi.indexOf(id) >= 0) {
        mapPin(g, pinCx(rect), pinTipY(rect), false);
      }
    }

    if (needsScale) g.restore();
  }

  // assert di sviluppo: rettangoli dentro il canvas, dimensioni minime, niente sovrapposizioni (luoghi e pin)
  function assertMappa() {
    var tuttiIPin = {};
    var idL;
    for (idL in MAPPA_PINS) {
      if (Object.prototype.hasOwnProperty.call(MAPPA_PINS, idL)) tuttiIPin[idL] = MAPPA_PINS[idL];
    }
    tuttiIPin[SHOP_PIN_ID] = MAPPA_PIN_SHOP; // pin permanente shop, stesso check dei luoghi missione

    var ids = [];
    var id;
    for (id in tuttiIPin) {
      if (!Object.prototype.hasOwnProperty.call(tuttiIPin, id)) continue;
      ids.push(id);
      var r = tuttiIPin[id];
      if (r.x < 0 || r.y < 0 || r.x + r.w > MAPPA_W || r.y + r.h > MAPPA_H) {
        console.error("PETQ.rooms: _mappaPins." + id + " esce dal canvas " + MAPPA_W + "x" + MAPPA_H);
      }
      if (r.w < 16 || r.h < 14) {
        console.error("PETQ.rooms: _mappaPins." + id + " sotto la dimensione minima 16x14 (" + r.w + "x" + r.h + ")");
      }
    }
    function overlap(a, b) {
      return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }
    function pinBox(rect) {
      var tipY = pinTipY(rect), cx = pinCx(rect);
      return { x: cx - 4, y: tipY - 12, w: 9, h: 12 }; // include il margine di pulsazione
    }
    for (var i = 0; i < ids.length; i++) {
      for (var j = i + 1; j < ids.length; j++) {
        if (overlap(tuttiIPin[ids[i]], tuttiIPin[ids[j]])) {
          console.error("PETQ.rooms: luoghi sovrapposti " + ids[i] + " / " + ids[j]);
        }
        if (overlap(pinBox(tuttiIPin[ids[i]]), pinBox(tuttiIPin[ids[j]]))) {
          console.error("PETQ.rooms: pin sovrapposti " + ids[i] + " / " + ids[j]);
        }
      }
    }
  }
  assertMappa();

  // ===== Arredi piazzati nelle stanze (112x64): 3 slot per stanza, footprint max ~14x14 =====
  // Salone: supporti dedicati (GDD -> Casa) — mensola a muro (oggetti appoggiati, piano a y=14),
  // zona ganci/quadri accanto, pavimento a sinistra del letto. Cucina/bagno come prima.
  var SLOT_SPOTS = {
    cucina: [[24, 48], [70, 48], [96, 47]],
    bagno:  [[24, 48], [66, 46], [32, 8]],
    salone: [[26, 0], [40, 4], [2, 46]],
    // camera: solo 2 slot (pavimento + muro), il letto e' gia' il pezzo forte della stanza
    camera: [[96, 46], [58, 4]]
  };
  // tipo di supporto di ogni slot, nello stesso ordine di SLOT_SPOTS
  var SLOT_TIPI = {
    cucina: ["pavimento", "pavimento", "pavimento"],
    bagno:  ["pavimento", "pavimento", "pavimento"],
    salone: ["mensola", "muro", "pavimento"],
    camera: ["pavimento", "muro"]
  };

  // supporto naturale di ogni arredo (chiavi normalizzate); tutto il resto -> pavimento
  var ARREDO_SUPPORTO = {
    postermotivazionale: "muro", fasciadamartialartist: "muro", completodamartialartist: "muro",
    bastonedacombattimento: "muro", saigemelli: "muro", nunchakuarrugginiti: "muro",
    kataneafarfalla: "muro", megafono: "muro", ombrellomeccanico: "muro",
    pattinospaiato: "muro", pattinidagara: "muro",
    coppaarcade: "mensola", statuettatipooscar: "mensola", macchininagiocattolo: "mensola",
    gamebitportatile: "mensola", fumettosarcastico: "mensola", albumdadisegno: "mensola",
    libro: "mensola", microfonogiocattolo: "mensola",
    tappetomorbido: "pavimento", pesi: "pavimento", scootergiocattolo: "pavimento",
    pallonedacalcio: "pavimento", lampadadaterra: "pavimento", piantinastrana: "pavimento",
    vascaidromassaggio: "pavimento", acquariodimeduse: "pavimento",
    servostazionediricarica: "pavimento", frigonuovo: "pavimento"
  };
  function supportoDi(nome) {
    var k = normalizzaArredo(nome);
    if (ARREDO_SUPPORTO[k]) return ARREDO_SUPPORTO[k];
    return "pavimento"; // topo, fallback e sconosciuti stanno a terra
  }

  var A_OUT = "#241c14";

  function normalizzaArredo(nome) {
    return String(nome || "").toLowerCase().replace(/\s+/g, "");
  }

  // rastrelliera condivisa per le 4 armi
  function rastrelliera(g, x, y) {
    R(g, x + 2, y + 2, 2, 12, "#5c4426");
    R(g, x + 10, y + 2, 2, 12, "#5c4426");
    R(g, x + 2, y + 4, 10, 1, "#3a2c1a");
    R(g, x + 2, y + 11, 10, 1, "#3a2c1a");
  }

  var ARREDI = {
    pallonedacalcio: function (g, x, y) { // bianco/nero a esagoni accennati
      O(g, x + 2, y + 3, 10, 11, "#0e1118", "#ffffff");
      R(g, x + 6, y + 7, 3, 3, "#16120e"); // pentagono centrale
      R(g, x + 3, y + 5, 2, 2, "#16120e"); // spicchi ai bordi
      R(g, x + 9, y + 5, 2, 2, "#16120e");
      R(g, x + 4, y + 11, 2, 2, "#16120e");
      R(g, x + 8, y + 11, 2, 2, "#16120e");
    },
    gamebitportatile: function (g, x, y) { // schermo acceso
      O(g, x + 2, y + 6, 10, 8, "#0e1118", "#5c6b74");
      R(g, x + 4, y + 8, 4, 4, "#5ce87f");
      R(g, x + 4, y + 8, 4, 1, "#b8ffd0"); // scanline
      R(g, x + 9, y + 8, 2, 2, "#e85a5a");
      R(g, x + 9, y + 11, 2, 1, "#f0b84a");
    },
    microfonogiocattolo: function (g, x, y) {
      R(g, x + 6, y + 5, 2, 7, "#5c6b74");
      O(g, x + 4, y + 1, 6, 5, A_OUT, "#c9d2dc");
      R(g, x + 5, y + 2, 2, 1, "#f4f4f0");
      R(g, x + 3, y + 12, 8, 2, "#37424c");
    },
    fumettosarcastico: function (g, x, y) {
      O(g, x + 3, y + 2, 9, 12, A_OUT, "#f0b84a");
      R(g, x + 4, y + 3, 7, 3, "#d83048");
      R(g, x + 6, y + 7, 2, 4, "#1e2830");
      R(g, x + 6, y + 12, 2, 1, "#1e2830");
    },
    coppaarcade: function (g, x, y) { // dorata brillante, base a filo mensola
      O(g, x + 2, y + 1, 10, 6, "#3a2808", "#f8c832");
      R(g, x, y + 2, 2, 3, "#f8c832"); // manici
      R(g, x + 12, y + 2, 2, 3, "#f8c832");
      R(g, x + 6, y + 7, 2, 4, "#c99a3c"); // stelo
      R(g, x + 3, y + 11, 8, 3, "#3a2808"); // base
      R(g, x + 4, y + 11, 6, 1, "#c99a3c");
      R(g, x + 3, y + 2, 2, 3, "#fff0a0"); // riflesso
    },
    macchininagiocattolo: function (g, x, y) {
      R(g, x + 1, y + 6, 12, 5, A_OUT);
      R(g, x + 2, y + 7, 10, 3, "#d83048");
      R(g, x + 4, y + 4, 6, 3, "#d83048");
      R(g, x + 5, y + 5, 3, 2, "#8fd8f0");
      R(g, x + 3, y + 11, 3, 3, "#1e2830");
      R(g, x + 9, y + 11, 3, 3, "#1e2830");
    },
    fasciadamartialartist: function (g, x, y) { // appesa a un chiodo
      R(g, x + 6, y + 1, 2, 2, "#8fa3ad");
      R(g, x + 3, y + 3, 8, 3, "#c22a3a");
      R(g, x + 4, y + 6, 2, 6, "#c22a3a");
      R(g, x + 8, y + 6, 2, 5, "#a02430");
    },
    completodamartialartist: function (g, x, y) { // su appendino
      R(g, x + 6, y, 2, 2, "#8fa3ad");
      R(g, x + 2, y + 2, 10, 1, "#5c4426");
      R(g, x + 3, y + 3, 8, 6, "#f4f0e0");
      R(g, x + 3, y + 9, 8, 2, "#c22a3a");
      R(g, x + 3, y + 11, 3, 3, "#f4f0e0");
      R(g, x + 8, y + 11, 3, 3, "#f4f0e0");
    },
    albumdadisegno: function (g, x, y) {
      O(g, x + 2, y + 5, 10, 9, A_OUT, "#f8f4ec");
      R(g, x + 3, y + 6, 1, 7, "#8fa3ad");
      R(g, x + 5, y + 8, 5, 1, "#4a7ba6");
      R(g, x + 5, y + 10, 4, 1, "#e85a5a");
      R(g, x + 10, y + 2, 2, 5, "#f0b84a"); // matita appoggiata
      R(g, x + 10, y + 1, 2, 1, "#37424c");
    },
    libro: function (g, x, y) { // dorso colorato ben visibile
      O(g, x + 4, y + 3, 7, 11, "#0e1118", "#4a7ba6");
      R(g, x + 5, y + 4, 2, 9, "#e85a5a"); // dorso rosso
      R(g, x + 9, y + 4, 1, 9, "#f4f0e0"); // taglio pagine
      R(g, x + 7, y + 6, 1, 3, "#f0b84a"); // fregio
    },
    ombrellomeccanico: function (g, x, y) { // chiuso, appoggiato
      R(g, x + 6, y + 1, 3, 3, "#8fa3ad");
      R(g, x + 6, y + 4, 3, 6, "#5c6b74");
      R(g, x + 5, y + 5, 1, 4, "#4a5760");
      R(g, x + 7, y + 10, 1, 3, "#37424c");
      R(g, x + 8, y + 12, 2, 1, "#37424c");
    },
    scootergiocattolo: function (g, x, y) {
      R(g, x + 10, y + 3, 2, 8, "#8fa3ad");
      R(g, x + 8, y + 3, 6, 1, "#8fa3ad");
      R(g, x + 2, y + 10, 9, 2, "#d83048");
      R(g, x + 2, y + 12, 3, 2, "#1e2830");
      R(g, x + 9, y + 12, 3, 2, "#1e2830");
    },
    megafono: function (g, x, y) { // rosso acceso, bocca bianca, outline scuro
      R(g, x + 1, y + 5, 5, 7, "#3a0e0e");
      R(g, x + 2, y + 6, 3, 5, "#c22a3a");
      R(g, x + 5, y + 3, 6, 11, "#3a0e0e");
      R(g, x + 6, y + 4, 4, 9, "#e84040");
      R(g, x + 11, y + 2, 2, 12, "#f4f0e0"); // bocca bianca
      R(g, x + 2, y + 12, 2, 2, "#37424c"); // manico
    },
    statuettatipooscar: function (g, x, y) { // oro brillante su base nera
      R(g, x + 6, y + 1, 2, 2, "#f8c832");
      R(g, x + 5, y + 3, 4, 6, "#f8c832");
      R(g, x + 6, y + 3, 1, 4, "#fff0a0");
      R(g, x + 6, y + 9, 2, 2, "#c99a3c");
      R(g, x + 3, y + 11, 8, 3, "#16120e"); // base nera
    },
    bastonedacombattimento: function (g, x, y) {
      rastrelliera(g, x, y);
      R(g, x + 6, y + 1, 2, 13, "#8a5c2e");
      R(g, x + 6, y + 1, 2, 1, "#5c3a1e");
      R(g, x + 6, y + 13, 2, 1, "#5c3a1e");
    },
    saigemelli: function (g, x, y) {
      rastrelliera(g, x, y);
      R(g, x + 5, y + 3, 1, 8, "#c9ccd4");
      R(g, x + 4, y + 5, 3, 1, "#c9ccd4");
      R(g, x + 8, y + 3, 1, 8, "#c9ccd4");
      R(g, x + 7, y + 5, 3, 1, "#c9ccd4");
    },
    nunchakuarrugginiti: function (g, x, y) {
      rastrelliera(g, x, y);
      R(g, x + 5, y + 3, 2, 5, "#a8622e");
      R(g, x + 8, y + 6, 2, 5, "#a8622e");
      R(g, x + 7, y + 5, 1, 2, "#5c5468");
    },
    kataneafarfalla: function (g, x, y) {
      rastrelliera(g, x, y);
      R(g, x + 5, y + 2, 1, 9, "#dfe4ec");
      R(g, x + 5, y + 11, 1, 2, "#5c3a1e");
      R(g, x + 8, y + 2, 1, 9, "#dfe4ec");
      R(g, x + 8, y + 11, 1, 2, "#5c3a1e");
    },
    pesi: function (g, x, y) { // outline netto + barra chiara: leggibile anche sul pad scuro ship
      O(g, x + 1, y + 7, 4, 7, "#0e1118", "#37424c");
      O(g, x + 9, y + 7, 4, 7, "#0e1118", "#37424c");
      R(g, x + 5, y + 9, 4, 2, "#c9d2dc");
      R(g, x + 2, y + 8, 1, 3, "#8fa3ad"); // riflesso piastra
    },
    pattinospaiato: function (g, x, y) {
      R(g, x + 4, y + 5, 6, 5, "#e85a3c");
      R(g, x + 3, y + 10, 8, 2, "#f4f4f0");
      R(g, x + 4, y + 12, 2, 2, "#1e2830");
      R(g, x + 8, y + 12, 2, 2, "#1e2830");
    },
    pattinidagara: function (g, x, y) {
      R(g, x + 1, y + 5, 5, 5, "#e85a3c");
      R(g, x, y + 10, 7, 2, "#f4f4f0");
      R(g, x + 8, y + 5, 5, 5, "#e85a3c");
      R(g, x + 7, y + 10, 7, 2, "#f4f4f0");
      R(g, x + 1, y + 12, 2, 2, "#1e2830");
      R(g, x + 10, y + 12, 2, 2, "#1e2830");
      R(g, x + 6, y + 2, 1, 3, "#f8f0a0"); // scintilla
      R(g, x + 5, y + 3, 3, 1, "#f8f0a0");
    },
    lampadadaterra: function (g, x, y) {
      R(g, x + 4, y + 1, 6, 4, "#f0b84a");
      R(g, x + 5, y + 2, 4, 1, "#f8e05a");
      R(g, x + 6, y + 5, 2, 7, "#5c6b74");
      R(g, x + 4, y + 12, 6, 2, "#37424c");
      R(g, x + 2, y + 5, 2, 1, "#4a4430"); // alone
      R(g, x + 10, y + 5, 2, 1, "#4a4430");
    },
    tappetomorbido: function (g, x, y) {
      O(g, x, y + 5, 14, 9, "#5c3020", "#a05838");
      R(g, x + 2, y + 7, 10, 1, "#c07a52");
      R(g, x + 2, y + 11, 10, 1, "#c07a52");
    },
    postermotivazionale: function (g, x, y) { // a muro
      O(g, x + 3, y + 1, 9, 12, A_OUT, "#f4f0e0");
      R(g, x + 4, y + 2, 7, 1, "#4a7ba6");
      R(g, x + 5, y + 4, 5, 4, "#f0b84a"); // sole
      R(g, x + 5, y + 9, 5, 1, "#37424c"); // motto
      R(g, x + 5, y + 11, 3, 1, "#37424c");
    },
    piantinastrana: function (g, x, y) {
      R(g, x + 5, y + 4, 1, 6, "#3f9c6a");
      R(g, x + 8, y + 2, 1, 8, "#3f9c6a");
      R(g, x + 4, y + 2, 2, 2, "#e85ad8");
      R(g, x + 7, y, 2, 2, "#5ae8e0");
      O(g, x + 3, y + 9, 8, 5, A_OUT, "#463868");
    },
    vascaidromassaggio: function (g, x, y) { // versione compatta
      O(g, x, y + 6, 14, 8, A_OUT, "#6a5fa0");
      R(g, x + 2, y + 8, 10, 3, "#4ac8e8");
      R(g, x + 4, y + 7, 2, 1, "#a8ecf8");
      R(g, x + 9, y + 5, 2, 2, "#a8ecf8"); // bolle
      R(g, x + 3, y + 3, 2, 2, "#a8ecf8");
    },
    acquariodimeduse: function (g, x, y) {
      O(g, x + 1, y + 2, 12, 12, A_OUT, "#123246");
      R(g, x + 3, y + 4, 8, 8, "#1a4a66");
      R(g, x + 4, y + 5, 3, 2, "#f0a0c0"); // medusa 1
      R(g, x + 5, y + 7, 1, 2, "#f0a0c0");
      R(g, x + 8, y + 8, 3, 2, "#c4a4e8"); // medusa 2
      R(g, x + 9, y + 10, 1, 2, "#c4a4e8");
      R(g, x + 3, y + 3, 8, 1, "#4dd8e8");
    },
    servostazionediricarica: function (g, x, y) {
      O(g, x + 3, y + 1, 8, 13, A_OUT, "#3a4258");
      R(g, x + 5, y + 3, 4, 3, "#4be8c8");
      R(g, x + 7, y + 7, 1, 2, "#f8e05a"); // fulmine
      R(g, x + 6, y + 9, 1, 2, "#f8e05a");
      R(g, x + 5, y + 12, 4, 1, "#5ae8e0");
    },
    frigonuovo: function (g, x, y) { // versione mini con badge
      O(g, x + 3, y + 1, 8, 13, A_OUT, "#f2ede0");
      R(g, x + 4, y + 6, 6, 1, "#b9b2a2");
      R(g, x + 9, y + 3, 1, 2, A_OUT);
      R(g, x + 9, y + 8, 1, 3, A_OUT);
      R(g, x + 4, y + 2, 3, 3, "#4dd8e8"); // badge nuovo
    }
  };

  function arredoFallback(g, x, y) { // cassa con fiocco per nomi non riconosciuti
    O(g, x + 2, y + 4, 10, 10, A_OUT, "#a8743c");
    R(g, x + 3, y + 8, 8, 1, "#6e4826");
    R(g, x + 6, y + 5, 2, 8, "#e85a78"); // nastro
    R(g, x + 3, y + 7, 8, 2, "#e85a78");
    R(g, x + 5, y + 2, 4, 2, "#e85a78"); // fiocco
    R(g, x + 6, y + 3, 2, 1, "#a02430");
  }

  // disegna l'arredo "nome" con angolo alto-sinistra (x,y), footprint max 14x14
  function drawArredo(ctx, nome, x, y) {
    if (!ctx) return;
    var key = normalizzaArredo(nome);
    if (ARREDI[key]) { ARREDI[key](ctx, x, y); return; }
    // il topo allenatore: sprite RAT_AMICO seduto nella stanza
    if (key.indexOf("topo") >= 0 || key.indexOf("allenatore") >= 0) {
      if (window.PETQ.sprites && window.PETQ.sprites.drawRatAmico) {
        window.PETQ.sprites.drawRatAmico(ctx, x - 1, y - 2, 1);
        return;
      }
    }
    arredoFallback(ctx, x, y);
  }

  // estrae fino a 3 nomi dallo stato.arredi (stringhe o {nome}), tollerante col vecchio formato
  function nomiArrediDaStato(arredi) {
    var nomi = [];
    if (!arredi || !arredi.length) return nomi;
    for (var i = 0; i < arredi.length && nomi.length < 3; i++) {
      var a = arredi[i];
      var nome = typeof a === "string" ? a : (a && a.nome);
      if (nome) nomi.push(nome);
    }
    // ordinamento per slot: tappeto per primo (sotto gli altri, slot a pavimento),
    // il topo preferisce il pavimento, poster/fascia vanno all'ultimo slot (a muro)
    function pesoSlot(nome) {
      var k = normalizzaArredo(nome);
      if (k.indexOf("tappeto") >= 0) return 0;
      if (k.indexOf("topo") >= 0 || k.indexOf("allenatore") >= 0) return 1;
      if (k.indexOf("poster") >= 0 || k.indexOf("fascia") >= 0) return 3;
      return 2;
    }
    nomi.sort(function (a, b) { return pesoSlot(a) - pesoSlot(b); });
    return nomi;
  }

  // assert di sviluppo: slot dentro il canvas stanza, senza sovrapposizioni tra loro né col letto
  function assertSlots() {
    function overlap(a, b) {
      return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }
    for (var stanza in SLOT_SPOTS) {
      if (!Object.prototype.hasOwnProperty.call(SLOT_SPOTS, stanza)) continue;
      var boxes = SLOT_SPOTS[stanza].map(function (s) { return { x: s[0], y: s[1], w: 14, h: 14 }; });
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].x < 0 || boxes[i].y < 0 || boxes[i].x + boxes[i].w > W || boxes[i].y + boxes[i].h > H) {
          console.error("PETQ.rooms: slot " + stanza + "[" + i + "] esce dal canvas " + W + "x" + H);
        }
        for (var j = i + 1; j < boxes.length; j++) {
          if (overlap(boxes[i], boxes[j])) {
            console.error("PETQ.rooms: slot sovrapposti " + stanza + "[" + i + "]/[" + j + "]");
          }
        }
        if (stanza === "camera" && (overlap(boxes[i], LETTO_LAB_CAMERA) || overlap(boxes[i], LETTO_SHIP_CAMERA))) {
          console.error("PETQ.rooms: slot camera[" + i + "] si sovrappone al letto");
        }
      }
      if ((SLOT_TIPI[stanza] || []).length !== SLOT_SPOTS[stanza].length) {
        console.error("PETQ.rooms: _slotTipi." + stanza + " non allineato agli slot");
      }
    }
  }
  assertSlots();

  // ===== Draw pubblico =====
  // tema 'lab'|'ship'; stanza 'cucina'|'bagno'|'salone'; stato {poop:int, arredi:[nomi|{nome}]}
  function draw(canvas, tema, stanza, stato) {
    if (!canvas) return;
    var g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);

    var scaleX = canvas.width / W;
    var scaleY = canvas.height / H;
    var needsScale = scaleX !== 1 || scaleY !== 1;

    var draw112 = function () {
      var temaSet = BUILDERS[tema] || BUILDERS.lab;
      var builder = temaSet[stanza] || temaSet.cucina;
      builder(g);
      // arredi piazzati della stanza corrente: ognuno sul SUO supporto (mensola/muro/pavimento);
      // se lo slot naturale è occupato o assente, primo slot libero (meglio fuori posto che invisibile)
      var spots = SLOT_SPOTS[stanza] || SLOT_SPOTS.cucina;
      var tipi = SLOT_TIPI[stanza] || SLOT_TIPI.cucina;
      var nomi = nomiArrediDaStato(stato && stato.arredi);
      var occupato = [false, false, false];
      for (var i = 0; i < nomi.length; i++) {
        var idx = tipi.indexOf(supportoDi(nomi[i]));
        if (idx < 0 || occupato[idx]) idx = occupato.indexOf(false);
        if (idx < 0) break;
        occupato[idx] = true;
        drawArredo(g, nomi[i], spots[idx][0], spots[idx][1]);
      }
      if (stato && stato.poop) drawPoop(g, stato.poop);
    };

    if (needsScale) {
      g.save();
      g.scale(scaleX, scaleY);
      draw112();
      g.restore();
    } else {
      draw112();
    }
  }

  window.PETQ.rooms = {
    draw: draw,
    drawMappa: drawMappa,
    drawArredo: drawArredo,
    _W: W,
    _H: H,
    _MAPPA_W: MAPPA_W,
    _MAPPA_H: MAPPA_H,
    _mappaPins: MAPPA_PINS,
    _assertMappa: assertMappa,
    _slotSpots: SLOT_SPOTS,
    _slotTipi: SLOT_TIPI,
    _arredoSupporto: ARREDO_SUPPORTO,
    _assertSlots: assertSlots,
    // hotzone letto per tema (GDD "Casa" -> camera): la UI sceglie in base a temaRazza(pet)
    _letto: { camera: { lab: LETTO_LAB_CAMERA, ship: LETTO_SHIP_CAMERA } },
    // hotzone frigo per tema (GDD "Economia" -> "Spesa e dispensa"): tap -> menu posseduto
    _frigoZona: { cucina: { lab: FRIGO_LAB_CUCINA, ship: FRIGO_SHIP_CUCINA } },
    _arredi: Object.keys(ARREDI),
    _temi: Object.keys(BUILDERS),
    _stanze: ["cucina", "bagno", "salone", "camera"],
    // Shop cibo (GDD "Economia" -> "Spesa e dispensa"): pin permanente, separato dai luoghi
    // missione (mai in MAPPA_PINS/LUOGHI). ui.js lo usa per il proprio hit-test dedicato.
    _shopPinId: SHOP_PIN_ID,
    _shopPin: MAPPA_PIN_SHOP
  };
})();
