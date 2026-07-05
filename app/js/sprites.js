// PETQ.sprites — pixel art 16x16 per razza/sottorazza/stadio/corpo + overlay sporco.
// Nessun modulo ES, nessuna libreria: si aggancia a window.PETQ. Vedi docs/SPEC-MODULI-1-2-3.md sezione [B].
window.PETQ = window.PETQ || {};

(function () {
  "use strict";

  var SIZE = 16;

  // ===== Palette =====
  // Blob alieno: canone dalla spec. Variante colore = pelle "b" + guancia "c".
  var PAL_BLOB = [
    { "#": "#2d4a38", b: "#7fd8a4", e: "#ffffff", p: "#33475c", c: "#f09bb0" }, // verde menta (canone)
    { "#": "#4a2d3a", b: "#e8a4c4", e: "#ffffff", p: "#33475c", c: "#f0d29b" }, // rosa
    { "#": "#38304a", b: "#c4a4e8", e: "#ffffff", p: "#2d3347", c: "#f09bcf" }  // lilla
  ];
  // Insettoide (mantide-folk umanoide): outline "#", corpo "b", occhio "e", pupilla "i",
  // braccia raptatorie "m", antenne "n", astucci alari teen "w".
  var PAL_INS = [
    { "#": "#1f3a22", b: "#7fc95c", e: "#d8f07a", i: "#1a2a14", m: "#4a8c3a", n: "#2f5c2a", w: "#3f7030" }, // verde mantide
    { "#": "#3a1f2e", b: "#e8b4cc", e: "#f8ecb0", i: "#2a141f", m: "#c05a88", n: "#8a3a5c", w: "#a04a70" }, // mantide orchidea
    { "#": "#332a14", b: "#c2a45a", e: "#f0e0a8", i: "#2a2214", m: "#8a6c32", n: "#5c4a22", w: "#6e5628" }  // mantide secca
  ];
  // Rettiliano (lizardfolk umanoide): outline "#", squame "b", ventre/muso chiaro "v",
  // occhio giallo "y", fessura pupilla "s", cresta+coda "r", artigli "c".
  var PAL_REP = [
    { "#": "#1f3a24", b: "#54a848", v: "#c8e8a0", y: "#f0d84a", s: "#141410", r: "#2f6e3a", c: "#e8e4d0" }, // verde
    { "#": "#3a2a14", b: "#e8a84a", v: "#f8e4c0", y: "#f8f0a0", s: "#201808", r: "#a86428", c: "#fff8ec" }, // sabbia
    { "#": "#16262e", b: "#4a9ab8", v: "#b8e0e8", y: "#f0d84a", s: "#0e141a", r: "#2e6480", c: "#e8f4f0" }  // teal
  ];
  // Robot: outline "#", corazza "b" (colorabile), scocca scura "k", visore "e", antenna "a", accento "h".
  var PAL_ROBOT = [
    { "#": "#37424c", b: "#c6cfd6", k: "#1e2830", e: "#3ee6d0", a: "#5aa8e8", h: "#e85a78" }, // grigio (canone)
    { "#": "#4c4237", b: "#e8d8b0", k: "#302819", e: "#3ee6d0", a: "#5aa8e8", h: "#e85a78" }, // crema
    { "#": "#374252", b: "#b8d4e8", k: "#1e2838", e: "#3ee6d0", a: "#5aa8e8", h: "#e85a78" }  // celeste
  ];

  // ===== Dati sprite: alieno blob =====
  // Baby ridisegnato su direzione fondatore (regola stadi): tondo/informe, niente guance né bocca, antenna accennata.
  var A_BABY = ["................","................","................","................","................",".......#........",".....######.....","...##bbbbbb##...","..#bbbbbbbbbb#..","..#bbeeeeeebb#..","..#bbeeppeebb#..","..#bbeeeeeebb#..","..#bbbbbbbbbb#..","..#bbbbbbbbbb#..","...##bbbbbb##...",".....##..##....."];
  // Teen = canone dalla spec (antenne e sorriso pieno), NON toccato.
  var A_TEEN = ["................","...##......##...","....#......#....","....########....","...#bbbbbbbb#...","..#bbbbbbbbbb#..","..#bbeeeeeebb#..","..#bbeeppeebb#..","..#bbeeeeeebb#..","..#cbbbbbbbbc#..","..#bbb####bbb#..","..#bbbbbbbbbb#..",".##bbbbbbbbbb##.","..#bbbbbbbbbb#..","...##bbbbbb##...","....##....##...."];

  // ===== Dati sprite: insettoide = mantide-folk umanoide (testa triangolare, braccia "a preghiera") =====
  var INS_BABY = ["................","................","................","................","................","....n......n....",".#eee######eee#.","..#ei#bbbb#ie#..","...#e#bbbb#e#...","....##bbbb##....",".....#bbbb#.....","......#bb#......","....m#bbbb#m....",".....#bbbb#.....",".....#....#.....","....##....##...."];
  var INS_TEEN = ["...n........n...","..n..........n..","...n.######.n...",".#eee######eee#.","..#ei#bbbb#ie#..","...#e#bbbb#e#...","....##bbbb##....",".....#bbbb#.....","...w##bbbb##w...","..#ww#mbbm#ww#..","..#ww#mmmm#ww#..","..#ww#bbbb#ww#..","...w#bbbbbb#w...","....#bbbbbb#....","....#b#..#b#....","....##....##...."];

  // ===== Dati sprite: rettiliano = lizardfolk umanoide (cresta mohawk, muso chiaro, coda, artigli) =====
  var REP_BABY = ["................","................","................","................","................",".......r........","....########....","...#bbbbbbbb#...","...#bysbbysb#...","...#bbbbbbbb#...","...#bvvvvvvb#...","....########....","....#bvvvvb#....","....#bbbbbb#.rr.","....#b#..#b#....","....##....##...."];
  var REP_TEEN = [".....r.r.r.r....","....########....","...#bbbbbbbb#...","...#bysbbysb#...","...#bvvvvvvb#...","...#bvvvvvvb#...","....########....","..##bbbbbbbb##..",".#b#bvvvvvvb#b#.",".#b#bvvvvvvb#b#.","..##bvvvvvvb##..","...#bbbbbbbb#...","...#bbbbbbbb#rr.","...#bb#..#bb#.rr","...#bb#..#bb#...",".#ccbb#..#bbcc#."];

  // ===== Dati sprite: robot (canone per antenna 0 + testa 0; NON ridisegnato) =====
  var R_BABY = ["................","................","................","................",".......aa.......","........#.......","....########....","...#bbbbbbbb#...","...#bkkkkkkb#...","...#bkekkekb#...","...#bkkeekkb#...","...#bbbbbbbb#...","...#ba####ab#...","....########....",".....#....#.....","....##....##...."];
  var R_TEEN = ["................","................",".......aa.......","........#.......","...##########...","..#bbbbbbbbbb#..","..#bkkkkkkkkb#..","..#bkekkkkekb#..","..#bkkeeeekkb#..","..#bbbbbbbbbb#..","..############..",".##bbbbbbbbbb##.",".##bbbahhabbb##.","..#bbbbbbbbbb#..","..############..","...##......##..."];

  // Robot componibile: antenna (righe 0-1 baby / 0-1 teen dello slot, posizionate secondo canone),
  // testa (blocco testa+collo), piedi fissi. Antenna0+Testa0 = canone esatto.
  var ROBOT_ANTENNA_BABY = [
    [".......aa.......", "........#......."], // 0 pallina dritta (canone)
    ["......a..a......", "......#..#......"], // 1 doppia
    [".......aa.......", "......##........"]  // 2 piegata
  ];
  var ROBOT_ANTENNA_TEEN = [
    [".......aa.......", "........#......."], // 0 pallina dritta (canone)
    ["......a..a......", "......#..#......"], // 1 doppia
    [".......aa.......", "......##........"]  // 2 piegata
  ];
  var ROBOT_BABY_FEET = [".....#....#.....", "....##....##...."];
  var ROBOT_TEEN_FEET = ["..############..", "...##......##..."];

  var ROBOT_TESTA_BABY = [
    // 0 quadrata (canone)
    ["....########....", "...#bbbbbbbb#...", "...#bkkkkkkb#...", "...#bkekkekb#...", "...#bkkeekkb#...", "...#bbbbbbbb#...", "...#ba####ab#...", "....########...."],
    // 1 tonda
    ["....########....", "...#bbbbbbbb#...", "..#bbbbbbbbbb#..", "..#bkekkkkekb#..", "..#bkkkkkkkkb#..", "...#bbbbbbbb#...", "...#ba####ab#...", "....########...."],
    // 2 visiera larga
    ["....########....", "...#bbbbbbbb#...", "...#kkkkkkkk#...", "...#keeeeeek#...", "...#kkkkkkkk#...", "...#bbbbbbbb#...", "...#ba####ab#...", "....########...."]
  ];
  var ROBOT_TESTA_TEEN = [
    // 0 quadrata (canone)
    ["...##########...", "..#bbbbbbbbbb#..", "..#bkkkkkkkkb#..", "..#bkekkkkekb#..", "..#bkkeeeekkb#..", "..#bbbbbbbbbb#..", "..############..", ".##bbbbbbbbbb##.", ".##bbbahhabbb##.", "..#bbbbbbbbbb#.."],
    // 1 tonda
    ["...##########...", "..#bbbbbbbbbb#..", ".#bbbbbbbbbbbb#.", ".#bkekkkkkkekb#.", ".#bkkkkkkkkkkb#.", "..#bbbbbbbbbb#..", "..############..", ".##bbbbbbbbbb##.", ".##bbbahhabbb##.", "..#bbbbbbbbbb#.."],
    // 2 visiera larga
    ["...##########...", "..#bbbbbbbbbb#..", "..#kkkkkkkkkk#..", "..#keeeeeeeek#..", "..#kkkkkkkkkk#..", "..#bbbbbbbbbb#..", "..############..", ".##bbbbbbbbbb##.", ".##bbbahhabbb##.", "..#bbbbbbbbbb#.."]
  ];

  function buildRobotBaby(antenna, testa) {
    var a = ROBOT_ANTENNA_BABY[antenna] || ROBOT_ANTENNA_BABY[0];
    var t = ROBOT_TESTA_BABY[testa] || ROBOT_TESTA_BABY[0];
    return ["................", "................", "................", "................"]
      .concat(a, t, ROBOT_BABY_FEET);
  }
  function buildRobotTeen(antenna, testa) {
    var a = ROBOT_ANTENNA_TEEN[antenna] || ROBOT_ANTENNA_TEEN[0];
    var t = ROBOT_TESTA_TEEN[testa] || ROBOT_TESTA_TEEN[0];
    return ["................", "................"]
      .concat(a, t, ROBOT_TEEN_FEET);
  }

  // ===== Varianti corpo (solo stadio teen): righe "sicure" senza landmark laterali (braccia/coda) =====
  function applyBodyVariant(frame, corpo, rowMap) {
    if (corpo === "normale" || !rowMap) return frame;
    var out = frame.slice();
    for (var idx in rowMap) {
      if (Object.prototype.hasOwnProperty.call(rowMap, idx)) {
        out[idx] = rowMap[idx][corpo];
      }
    }
    return out;
  }

  // righe modificabili per corpo, per sottorazza teen (indice riga -> {magro, ciccione})
  var BLOB_TEEN_ROWS = {
    9:  { magro: "...#cbbbbbbc#...", ciccione: ".#cbbbbbbbbbbc#." },
    10: { magro: "...#bbb##bbb#...", ciccione: ".#bbbbb##bbbbb#." },
    11: { magro: "...#bbbbbbbb#...", ciccione: "#bbbbbbbbbbbbbb#" },
    12: { magro: "...#bbbbbbbb#...", ciccione: "#bbbbbbbbbbbbbb#" },
    13: { magro: "...#bbbbbbbb#...", ciccione: ".#bbbbbbbbbbbb#." }
  };
  // mantide-folk: cambia l'addome; le righe con braccia raptatorie (9-10) restano intatte
  var INS_TEEN_ROWS = {
    11: { magro: "...#w#bbbb#w#...", ciccione: ".#ww#bbbbbb#ww#." },
    12: { magro: "....#bbbbbb#....", ciccione: "..w#bbbbbbbb#w.." },
    13: { magro: ".....#bbbb#.....", ciccione: "...#bbbbbbbb#..." }
  };
  // lizardfolk: cambia spalle/busto/fianchi; coda (righe 12-13) e gambe restano intatte
  var REP_TEEN_ROWS = {
    7:  { magro: "...##bbbbbb##...", ciccione: ".##bbbbbbbbbb##." },
    8:  { magro: "..#b#bvvvvb#b#..", ciccione: "#b#bvvvvvvvvb#b#" },
    9:  { magro: "..#b#bvvvvb#b#..", ciccione: "#b#bvvvvvvvvb#b#" },
    10: { magro: "...##bvvvvb##...", ciccione: ".##bvvvvvvvvb##." },
    11: { magro: "....#bbbbbb#....", ciccione: "..#bbbbbbbbbb#.." }
  };
  var ROBOT_TEEN_TORSO_ROWS = {
    10: { magro: "...##########...", ciccione: ".##############." },
    11: { magro: "...##bbbbbb##...", ciccione: "##bbbbbbbbbbbb##" },
    12: { magro: "...##bahhab##...", ciccione: "##bbaahhhhaabb##" },
    13: { magro: "...#bbbbbbbb#...", ciccione: ".#bbbbbbbbbbbb#." }
  };

  // ===== Selettori di frame =====
  function getAlienFrame(sottorazza, stadio, corpo) {
    if (sottorazza === "insettoide") {
      var fi = stadio === "teen" ? INS_TEEN.slice() : INS_BABY.slice();
      if (stadio === "teen") fi = applyBodyVariant(fi, corpo, INS_TEEN_ROWS);
      return fi;
    }
    if (sottorazza === "rettiliano") {
      var fr = stadio === "teen" ? REP_TEEN.slice() : REP_BABY.slice();
      if (stadio === "teen") fr = applyBodyVariant(fr, corpo, REP_TEEN_ROWS);
      return fr;
    }
    // blob default
    var fb = stadio === "teen" ? A_TEEN.slice() : A_BABY.slice();
    if (stadio === "teen") fb = applyBodyVariant(fb, corpo, BLOB_TEEN_ROWS);
    return fb;
  }

  function getRobotFrame(parts, stadio, corpo) {
    var antenna = (parts && parts.antenna) || 0;
    var testa = (parts && parts.testa) || 0;
    var frame = stadio === "teen" ? buildRobotTeen(antenna, testa) : buildRobotBaby(antenna, testa);
    if (stadio === "teen") frame = applyBodyVariant(frame, corpo, ROBOT_TEEN_TORSO_ROWS);
    return frame;
  }

  function getPalette(razza, sottorazza, colore) {
    var idx = colore || 0;
    if (razza === "robot") return PAL_ROBOT[idx] || PAL_ROBOT[0];
    if (sottorazza === "insettoide") return PAL_INS[idx] || PAL_INS[0];
    if (sottorazza === "rettiliano") return PAL_REP[idx] || PAL_REP[0];
    return PAL_BLOB[idx] || PAL_BLOB[0];
  }

  // ===== Overlay sporco: macchie deterministiche (seed dalla forma) + 2 moschine animabili =====
  var DIRT_COLOR = "#8a6a42";
  var FLY_COLOR = "#141414";

  // hash semplice e deterministico da stringa (nessun random a runtime)
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function findBodyPixels(frame) {
    var pts = [];
    for (var y = 0; y < frame.length; y++) {
      var row = frame[y];
      for (var x = 0; x < row.length; x++) {
        if (row[x] !== "." && row[x] !== "#") pts.push([x, y]);
      }
    }
    return pts;
  }

  function drawDirtOverlay(ctx, frame, scale, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    var seed = hashStr(frame.join("\n"));
    var pts = findBodyPixels(frame);
    if (pts.length === 0) return;
    var n = 4 + (seed % 3); // 4-6 macchie
    var used = {};
    ctx.fillStyle = DIRT_COLOR;
    var s = seed;
    for (var i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      var pick = s % pts.length;
      var key = pick;
      var tries = 0;
      while (used[key] && tries < pts.length) {
        pick = (pick + 1) % pts.length;
        key = pick;
        tries++;
      }
      used[key] = true;
      var p = pts[pick];
      ctx.fillRect(ox + p[0] * scale, oy + p[1] * scale, scale, scale);
    }
  }

  function drawFlies(ctx, frame, scale, flyFrame, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    var seed = hashStr(frame.join("|") + "_flies");
    var w = frame[0].length, h = frame.length;
    // due posizioni fisse (deterministiche) appena sopra/lato al corpo, alternate su 2 frame
    var basePositions = [
      { x: (seed % (w - 2)) + 1, y: (Math.floor(seed / 7) % 3) },
      { x: ((seed >> 3) % (w - 2)) + 1, y: (Math.floor(seed / 11) % 3) + 1 }
    ];
    ctx.fillStyle = FLY_COLOR;
    basePositions.forEach(function (p, i) {
      var offset = flyFrame === 1 ? (i % 2 === 0 ? 1 : -1) : 0;
      var fx = Math.max(0, Math.min(w - 1, p.x + offset));
      var fy = p.y;
      ctx.fillRect(ox + fx * scale, oy + fy * scale, scale, scale);
    });
  }

  // ===== Draw pubblico =====
  // risolve petLike in frame+palette (condiviso tra draw e cartoline)
  function resolvePet(petLike) {
    var stadio = petLike.stadio === "teen" ? "teen" : "baby";
    var corpo = petLike.corpo || "normale";
    var parts = petLike.parts || {};
    var razza = petLike.razza === "robot" ? "robot" : "alieno";
    var sottorazza = petLike.sottorazza || "blob";
    var frame = razza === "robot"
      ? getRobotFrame(parts, stadio, corpo)
      : getAlienFrame(sottorazza, stadio, corpo);
    return { frame: frame, palette: getPalette(razza, sottorazza, parts.colore) };
  }

  // dipinge un frame a griglia sul ctx, con offset in pixel destinazione
  function paintFrame(ctx, frame, palette, scale, ox, oy) {
    for (var y = 0; y < frame.length; y++) {
      var row = frame[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        ctx.fillStyle = palette[ch] || "#ff00ff"; // magenta = carattere palette mancante (debug visivo)
        ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
      }
    }
  }

  // petLike: {razza:'robot'|'alieno', sottorazza:'blob'|'insettoide'|'rettiliano', parts:{antenna,testa,colore}, stadio, corpo, sporco}
  function draw(canvas, petLike, opts) {
    if (!canvas || !petLike) return;
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var res = resolvePet(petLike);
    var scale = canvas.width / SIZE;
    paintFrame(ctx, res.frame, res.palette, scale, 0, 0);

    if (petLike.sporco) {
      drawDirtOverlay(ctx, res.frame, scale, 0, 0);
      drawFlies(ctx, res.frame, scale, opts.frame === 1 ? 1 : 0, 0, 0);
    }
  }

  // Resa "sdraiato" (dorme, GDD "Energia e sonno" -> "posa ben leggibile da dormiente,
  // sdraiato, testa verso il cuscino"): ruota lo sprite esistente di 90 gradi cosi' il pet
  // appare disteso in orizzontale invece che in piedi, senza bisogno di ridisegnare ogni
  // creatura in una posa dedicata. Il canvas resta quadrato (stesso PET_PX x PET_PX usato per
  // lo sprite in piedi, v. ui.js PET_PX) cosi' il chiamante non deve toccare hit-test/
  // posizionamento: la rotazione avviene internamente attorno al centro.
  // "lato": 1 = testa a sinistra / verso il cuscino (default, per il letto), -1 = testa a
  // destra (specchiato, variante per il crollo sul pavimento).
  //
  // Nota di design: gli sprite di questo gioco sono tutti tozzi/compatti (16x16, "umanoidi
  // rotondi") - una rotazione pura di 90 gradi da sola non basta a leggersi come "disteso",
  // perche' silhouette gia' quasi quadrate restano quasi quadrate anche ruotate (verificato:
  // baby e teen ruotati restano un blocco compatto senza un lato chiaramente "testa"). Per
  // questo aggiungiamo due indizi extra, disegnati insieme alla rotazione invece di ridisegnare
  // ogni creatura: un CUSCINO (rettangolo chiaro dietro la testa, dal lato "lato") e una
  // COPERTA (fascia semi-trasparente sulla meta' del corpo lontana dalla testa) - questi due
  // elementi ancorano visivamente "dove sta la testa" e "il pet e' sotto qualcosa", cosa che la
  // sola rotazione non comunicava.
  var CUSCINO_COLOR = "#eef1f6";
  var COPERTA_COLOR = "rgba(80, 110, 150, 0.55)";
  function drawSdraiato(canvas, petLike, opts) {
    if (!canvas || !petLike) return;
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var res = resolvePet(petLike);
    var scale = canvas.width / SIZE;
    var cx = canvas.width / 2, cy = canvas.height / 2;
    var lato = opts.lato === -1 ? -1 : 1;
    var w = canvas.width, h = canvas.height;

    // Cuscino: rettangolo chiaro nel terzo di canvas dal lato della testa, DIETRO il corpo.
    // Un po' piu' alto del corpo (sporge sopra/sotto) cosi' si legge come oggetto a se',
    // non come parte dello sprite.
    var cuscinoW = w * 0.3;
    var cuscinoX = lato === 1 ? 0 : w - cuscinoW;
    ctx.fillStyle = CUSCINO_COLOR;
    ctx.fillRect(cuscinoX, h * 0.12, cuscinoW, h * 0.76);

    ctx.save();
    // ruota di un quarto di giro attorno al centro: "in piedi" (verticale) -> "disteso"
    // (orizzontale). Verso scelto cosi' la testa (riga 0 del frame) finisce dal lato "lato",
    // sovrapposta al cuscino appena disegnato.
    ctx.translate(cx, cy);
    ctx.rotate(lato === 1 ? -Math.PI / 2 : Math.PI / 2);
    ctx.translate(-cx, -cy);
    paintFrame(ctx, res.frame, res.palette, scale, 0, 0);
    if (petLike.sporco) {
      drawDirtOverlay(ctx, res.frame, scale, 0, 0);
      drawFlies(ctx, res.frame, scale, opts.frame === 1 ? 1 : 0, 0, 0);
    }
    ctx.restore();

    // Coperta: fascia semi-trasparente sulla meta' del corpo LONTANA dalla testa (dove
    // starebbero gambe/piedi), NON ruotata (resta un rettangolo pulito allineato al canvas).
    // Rinforza la lettura "disteso sotto una coperta" senza dover disegnare gambe/piedi
    // per ogni creatura.
    var copertaW = w * 0.62;
    var copertaX = lato === 1 ? (w - copertaW) : 0;
    ctx.fillStyle = COPERTA_COLOR;
    ctx.fillRect(copertaX, h * 0.2, copertaW, h * 0.68);

    // occhi chiusi: NON riusiamo drawPalpebre "di fronte" (due fasce ai lati sinistro/destro
    // pensate per il volto frontale in piedi) perche' ruotata di 90 gradi diventerebbe
    // un'unica fascia scura che taglia tutta la larghezza del canvas, sopra il cuscino incluso
    // (bug visto in verifica manuale). Da sdraiato disegniamo invece un trattino unico,
    // piccolo, posizionato sopra la testa (accanto al cuscino, lato "lato").
    var palpX = lato === 1 ? w * 0.32 : w * 0.5;
    ctx.fillStyle = "rgba(20,20,24,0.75)";
    ctx.fillRect(palpX, h * 0.28, w * 0.18, h * 0.06);
    // Zzz: SOLO se il chiamante non li ridisegna gia' altrove (opts.zzz === false). Bug noto
    // (fix 5 lug 2026): sul mini-canvas quadrato del pet (16x16 logici) le "Z" piu' grandi
    // escono dal bordo superiore/destro (drawZzz usa y negativi e x+size>16, v. sotto) — il
    // chiamante con una scena piu' ampia (canvas stanza) puo' passare zzz:false e richiamare
    // PETQ.sprites.drawZzz direttamente sul canvas stanza, dove il margine extra le contiene
    // per intero (v. ui.js disegnaZzzStanza).
    if (opts.zzz !== false) drawZzz(ctx, opts.frame);
  }

  // ===== Icone cibo 12x12 (outline scuro + fill, "." trasparente) =====
  var ICON_SIZE = 12;

  var FOOD_ICONS = {
    crocchettesemplici: {
      px: ["............","............","....k..k....","..k..k..k...",".##########.",".#rrrrrrrr#.",".#rrrrrrrr#.","..#rrrrrr#..","...######...","....####....","............","............"],
      pal: { "#": "#33201a", k: "#a8743c", r: "#d85a4a" }
    },
    bistecca: {
      px: ["............","............","..#######...",".#fffffff#..",".#mmoommm#..",".#mmoommm#..",".#mmmmmmm#..","..#######...","............","............","............","............"],
      pal: { "#": "#3a1616", m: "#c04a3c", f: "#f0d0b8", o: "#f4ecd8" }
    },
    spiedino: {
      px: ["............",".....s......","...#####....","...#mmm#....","...#####....","...#ppp#....","...#####....","...#mmm#....","...#####....",".....s......",".....s......","............"],
      pal: { "#": "#33201a", m: "#c04a3c", p: "#5cb84a", s: "#a8743c" }
    },
    insalatona: {
      px: ["............","............","...vlvlv....","..vlvlvlv...",".##########.",".#wwwwwwww#.","..#wwwwww#..","...######...","....####....","............","............","............"],
      pal: { "#": "#2b3020", v: "#3f8c34", l: "#7fd45c", w: "#f0ead8" }
    },
    zuppadiverdure: {
      px: ["............","...q..q.....","....q..q....","...q..q.....",".##########.",".#oooooooo#.",".#bbbbbbbb#.","..#bbbbbb#..","...######...","....####....","............","............"],
      pal: { "#": "#2b2430", q: "#c8d8e0", o: "#e8963c", b: "#4a7ba6" }
    },
    sushi: {
      px: ["............","............","............","..########..",".#ssskksss#.",".#ssskksss#.",".#rrrkkrrr#.",".#rrrrrrrr#.","..########..","............","............","............"],
      pal: { "#": "#33202a", s: "#f08a5c", r: "#f8f4ec", k: "#22331e" }
    },
    pesceallagriglia: {
      px: ["............","............","............","...#####....","..#fgfgf#.t.",".#efgfgff#tt","..#fgfgf#.t.","...#####....","............","............","............","............"],
      pal: { "#": "#1a2a34", f: "#5aa8d8", g: "#2c485c", e: "#10141a", t: "#3f7ea6" }
    },
    biscotto: {
      px: ["............","............","...######...","..#bbbbbb#..",".#bcbbbbcb#.",".#bbbcbbbb#.",".#bbbbbcbb#.","..#bbbbbb#..","...######...","............","............","............"],
      pal: { "#": "#3a2814", b: "#d8a05c", c: "#4a2c14" }
    },
    tortaintera: {
      px: ["............",".....xx.....","..########..",".#iiiiiiii#.",".#ipiipiip#.",".#pppppppp#.",".#pppppppp#.",".#pppppppp#.","..########..","............","............","............"],
      pal: { "#": "#3a1a28", i: "#f8f0f4", p: "#f0a0c0", x: "#d83048" }
    }
  };

  // fallback per categoria per cibi futuri non mappati
  var FOOD_FALLBACK = {
    carne: {
      px: ["............","............","...#####....","..#mmmmm#...",".#mmmmmm#oo.",".#mmmmmm#oo.","..#mmmmm#...","...#####....","............","............","............","............"],
      pal: { "#": "#3a1616", m: "#c04a3c", o: "#f4ecd8" }
    },
    verdura: {
      px: ["............","......v.....","....vv.v....","...#cccc#...","...#cccc#...","....#cc#....","....#cc#....",".....##.....","............","............","............","............"],
      pal: { "#": "#4a2c14", c: "#f08a3c", v: "#3f8c34" }
    },
    pesce: {
      px: ["............","............","............","...#####....","..#fffff#.t.",".#effffff#tt","..#fffff#.t.","...#####....","............","............","............","............"],
      pal: { "#": "#1a2a34", f: "#5aa8d8", e: "#10141a", t: "#3f7ea6" }
    },
    dolce: {
      px: ["............","............","....#ii#....","...#iiii#...","..#iiiiii#..","..########..","...#wwww#...","...#wwww#...","....####....","............","............","............"],
      pal: { "#": "#3a1a28", i: "#f0a0c0", w: "#e8d8b0" }
    },
    base: {
      px: ["............","............","............","............",".##########.",".#bbbbbbbb#.",".#bbbbbbbb#.","..#bbbbbb#..","...######...","....####....","............","............"],
      pal: { "#": "#1e2830", b: "#4a7ba6" }
    }
  };

  // ===== Prop attività 12x12 (libro=Intelligenza, pesi=Forza, specchio=Carisma, corsa=Velocità) =====
  var PROP_ICONS = {
    libro: {
      px: ["............","............","..########..",".#bkbbbbbb#.",".#bkbbbbbb#.",".#bkbbbbbb#.",".#bkbbbbbb#.",".#bkbbbbbb#.",".#wwwwwwww#.","..########..","............","............"],
      pal: { "#": "#1e2830", b: "#4a7ba6", k: "#e85a78", w: "#f4f0e0" }
    },
    pesi: {
      px: ["............","............","............",".##......##.",".##......##.",".##bbbbbb##.",".##bbbbbb##.",".##......##.",".##......##.","............","............","............"],
      pal: { "#": "#37424c", b: "#8fa3ad" }
    },
    specchio: {
      px: ["............","...######...","..#mmmmmm#..","..#rmmmmm#..","..#rmmmmm#..","..#mmmmmm#..","..#mmmmmm#..","..#mmmmmm#..","...######...","....#..#....","...##..##...","............"],
      pal: { "#": "#3a2c14", m: "#cfeef8", r: "#ffffff" }
    },
    corsa: {
      px: ["............","............","............","...####.....","..#ssss#....",".#sssssss##.",".#wwwwwwww#.","..########..","............","............","............","............"],
      pal: { "#": "#1e2830", s: "#e85a3c", w: "#f4f4f0" }
    }
  };

  // ===== Prop animazioni idle di personalita' (GDD "Personalita'" -> "Animazioni idle di
  // personalita'", P1 leggero): 2 frame ciascuno, stesso stile outline+fill 12x12 dei prop
  // sopra. cuboRubik (nerd b), note (gentile a), monete (maleducato a), boccaccia NON e' un
  // prop ma un overlay sul volto del pet (v. drawBoccaccia sotto) quindi non e' qui dentro.
  var IDLE_PROP_ICONS = {
    // Cubo di Rubik (nerd, azione b): 2 frame con le facce colorate "spostate" per dare
    // l'idea che il pet lo stia girando tra le mani.
    cuborubik_0: {
      px: ["............","............","..########..",".#rrrgggbb#.",".#rrrgggbb#.","..########..",".#yyywwwoo#.",".#yyywwwoo#.","..########..","............","............","............"],
      pal: { "#": "#1a1a1a", r: "#d8402c", g: "#4aa84a", b: "#3a6ec4", y: "#e8d83c", w: "#f4f4f0", o: "#e8862c" }
    },
    cuborubik_1: {
      px: ["............","............","..########..",".#gggbbrr#..",".#gggbbrr#..","..########..","..#wwwooyyy#","..#wwwooyyy#","..########..","............","............","............"],
      pal: { "#": "#1a1a1a", r: "#d8402c", g: "#4aa84a", b: "#3a6ec4", y: "#e8d83c", w: "#f4f4f0", o: "#e8862c" }
    },
    // Note musicali (gentile, azione a): salgono (frame 1 piu' in alto), stile minimale.
    note_0: {
      px: ["............","...n........","...nn.......","...n.n......","..nn..n.....","............","......n.....","......nn....","......n.n...","............","............","............"],
      pal: { n: "#f0d84a" }
    },
    note_1: {
      px: ["...n........","...nn.......","...n.n......","..nn..n.....","............","......n.....","......nn....","......n.n...","............","............","............","............"],
      pal: { n: "#f0d84a" }
    },
    // Mucchietto di monete (maleducato, azione a): la moneta in cima "si sposta" tra i due frame,
    // come se il pet la stesse contando spostandola da una pila all'altra.
    monete_0: {
      px: ["............","............","............","............","......oo....","....ooooo...",".##ooooooo#.",".#ooooooooo.","...########.","............","............","............"],
      pal: { "#": "#8a5c14", o: "#f0c23c" }
    },
    monete_1: {
      px: ["............","............","............","....oo......","............","....ooooo...",".##ooooooo#.",".#ooooooooo.","...########.","............","............","............"],
      pal: { "#": "#8a5c14", o: "#f0c23c" }
    }
  };

  // Valigetta (PROTOTIPO 2, Blocco 2 "Partenza (valigia)"): sprite semplice 12x12, disegnato in
  // scena accanto al pet quando e' in fase valigia (state.valigia). Valigia marrone con manico
  // in alto, due borchie/chiusure dorate e una banda piu' scura. Stesso formato px/pal delle
  // altre icone (drawIcon).
  var VALIGETTA_ICON = {
    px: [
      "............",
      "....####....",
      "...#....#...",
      "..########..",
      ".#bbbbbbbb#.",
      ".#bbggbbgg#.",
      ".#bbbbbbbb#.",
      ".#bBBBBBBb#.",
      ".#bbbbbbbb#.",
      "..########..",
      "............",
      "............"
    ],
    pal: { "#": "#3a2412", b: "#9c6a34", B: "#6e4a22", g: "#f0c23c" }
  };

  // Disegna la valigetta su un canvas (di solito 12x12 o 24x24, la scala si adatta come drawIcon).
  function drawValigetta(canvas) {
    if (!canvas) return;
    drawIcon(canvas, VALIGETTA_ICON);
  }

  // ===== Scena PIANETA / STAZIONE dei ritirati (PROTOTIPO-2.md Blocco 4) =====
  // Dove sta il pet PARTITO (state.petPartito): sfondo stellato, un pianetino (alieno, sul suo
  // pianeta) o una stazione orbitante (robot, al centro di manutenzione) e il pet disegnato
  // sopra in posa d'attesa/malinconica. Riusa lo sprite del pet via draw() su un canvas
  // temporaneo, poi lo compone sulla scena (stesso pattern di disegnaScenaAddio in ui.js).
  // "flavor": { razza, tinta, corpo } opzionale; se assente si deduce dalla razza del pet.
  // La scena e' disegnata su base 112x64 (come le stanze) e scalata sul canvas passato.
  var PIANETA_BASE_W = 112;
  var PIANETA_BASE_H = 64;
  var PIANETA_FLAVOR = {
    alieno: { cielo: "#241a3a", pianeta: "#7a5cc0", pianetaOmbra: "#4d3a86", suolo: "#33265e", stazione: false },
    robot: { cielo: "#141c2c", pianeta: "#3a4c66", pianetaOmbra: "#26384f", suolo: "#1e2838", stazione: true }
  };

  function drawPianeta(canvas, petLike, opts) {
    if (!canvas || !petLike) return;
    opts = opts || {};
    var g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var sx = canvas.width / PIANETA_BASE_W;
    var sy = canvas.height / PIANETA_BASE_H;
    var needsScale = sx !== 1 || sy !== 1;
    if (needsScale) { g.save(); g.scale(sx, sy); }
    disegnaScenaPianeta(g, petLike, opts);
    if (needsScale) g.restore();
  }

  // Disegno alla base 112x64 (il chiamante scala). Deterministico: le stelle usano una
  // sequenza fissa (nessun rng) cosi' la scena e' identica a ogni ridisegno.
  var STELLE = [
    [8, 6], [20, 12], [34, 4], [48, 10], [60, 5], [74, 14], [88, 8], [100, 4],
    [14, 22], [40, 18], [66, 24], [92, 20], [104, 30], [6, 34], [26, 30], [82, 32]
  ];
  function disegnaScenaPianeta(g, petLike, opts) {
    var razza = (opts.razza || petLike.razza) === "robot" ? "robot" : "alieno";
    var fl = PIANETA_FLAVOR[razza];
    var W = PIANETA_BASE_W, H = PIANETA_BASE_H;

    // cielo notturno
    g.fillStyle = fl.cielo;
    g.fillRect(0, 0, W, H);

    // stelle (2 tinte, punti fissi)
    for (var i = 0; i < STELLE.length; i++) {
      g.fillStyle = (i % 3 === 0) ? "#fff6c8" : "#cfd8ff";
      var s = (i % 4 === 0) ? 2 : 1;
      g.fillRect(STELLE[i][0], STELLE[i][1], s, s);
    }

    if (fl.stazione) {
      // ROBOT: stazione spaziale orbitante sullo sfondo (a destra, in alto)
      disegnaStazione(g, 78, 8, fl);
    } else {
      // ALIENO: pianeta grande sullo sfondo (a destra, in alto)
      disegnaPianetino(g, 86, 18, 16, fl);
    }

    // "terreno" in primo piano dove sta il pet (curva bassa a suolo)
    g.fillStyle = fl.suolo;
    // semplice collinetta: rettangolo di base + smusso agli angoli
    g.fillRect(0, H - 14, W, 14);
    g.fillStyle = fl.pianetaOmbra;
    g.fillRect(0, H - 14, W, 2);

    // il PET partito, in posa d'attesa al centro sul suolo. Riuso lo sprite in piedi (frame 0),
    // corpo forzato a 'normale' e sporco off: e' "il ricordo" del pet, non lo stato di cura.
    var petCanvas = document.createElement("canvas");
    petCanvas.width = SIZE * 2;
    petCanvas.height = SIZE * 2;
    var petLike2 = {
      razza: petLike.razza,
      sottorazza: petLike.sottorazza,
      parts: petLike.parts,
      stadio: petLike.stadio || "teen",
      corpo: opts.corpo || "normale",
      sporco: false
    };
    draw(petCanvas, petLike2, { frame: 0 });
    var pw = SIZE * 2;
    var px = Math.round((W - pw) / 2);
    var py = (H - 14) - pw + 4; // piedi appoggiati al suolo
    g.drawImage(petCanvas, px, py);

    // piccola "nuvoletta di malinconia": un sospiro sopra la testa (tre puntini che salgono)
    g.fillStyle = "rgba(207,216,255,0.8)";
    var hx = px + pw - 3;
    var hy = py + 1;
    g.fillRect(hx, hy, 2, 2);
    g.fillRect(hx + 3, hy - 3, 2, 2);
    g.fillRect(hx + 6, hy - 7, 3, 3);
  }

  // pianetino: cerchio pixel semplice con terminatore d'ombra + anello sottile
  function disegnaPianetino(g, cx, cy, r, fl) {
    for (var y = -r; y <= r; y++) {
      for (var x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          // meta' in ombra (lato destro/basso)
          g.fillStyle = (x + y > r * 0.3) ? fl.pianetaOmbra : fl.pianeta;
          g.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
    // anello
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse ? g.ellipse(cx, cy, r + 5, 3, -0.3, 0, Math.PI * 2) : g.arc(cx, cy, r + 5, 0, Math.PI * 2);
    g.stroke();
  }

  // stazione spaziale: corpo centrale + due pannelli solari + luce lampeggiante-fissa
  function disegnaStazione(g, x, y, fl) {
    // pannelli solari (bracci)
    g.fillStyle = "#2a3d5c";
    g.fillRect(x - 12, y + 4, 10, 6);
    g.fillRect(x + 14, y + 4, 10, 6);
    g.fillStyle = "#4a6fa0";
    g.fillRect(x - 11, y + 5, 8, 1);
    g.fillRect(x + 15, y + 5, 8, 1);
    // corpo centrale
    g.fillStyle = fl.pianeta;
    g.fillRect(x - 2, y, 16, 12);
    g.fillStyle = fl.pianetaOmbra;
    g.fillRect(x - 2, y + 8, 16, 4);
    // oblo'
    g.fillStyle = "#bfe0ff";
    g.fillRect(x + 2, y + 3, 3, 3);
    g.fillRect(x + 8, y + 3, 3, 3);
    // luce di segnalazione
    g.fillStyle = "#ff6a6a";
    g.fillRect(x + 5, y - 2, 2, 2);
  }

  function normalizzaNome(nome) {
    return String(nome || "").toLowerCase().replace(/\s+/g, "");
  }

  function drawIcon(canvas, icon) {
    if (!canvas || !icon) return;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var scale = canvas.width / ICON_SIZE;
    for (var y = 0; y < icon.px.length; y++) {
      var row = icon.px[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === ".") continue;
        ctx.fillStyle = icon.pal[ch] || "#ff00ff";
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  // cibo: oggetto da PETQ.content.data.cibi ({nome, categoria, ...}); match per nome normalizzato, fallback per categoria
  function drawFood(canvas, cibo) {
    if (!canvas || !cibo) return;
    var icon = FOOD_ICONS[normalizzaNome(cibo.nome)] ||
               FOOD_FALLBACK[normalizzaNome(cibo.categoria)] ||
               FOOD_FALLBACK.base;
    drawIcon(canvas, icon);
  }

  // id: 'libro' | 'pesi' | 'specchio' | 'corsa'
  function drawProp(canvas, id) {
    if (!canvas) return;
    drawIcon(canvas, PROP_ICONS[id] || PROP_ICONS.libro);
  }

  // Prop delle animazioni idle di personalita' (GDD "Personalita'"): id 'cuborubik' | 'note' |
  // 'monete' (2 frame ciascuno, v. IDLE_PROP_ICONS sopra). frame: 0|1. Usata da ui.js per il
  // prop nuovo mostrato accanto al pet durante la mini-azione idle (nerd/gentile/maleducato).
  function drawIdleProp(canvas, id, frame) {
    if (!canvas) return;
    var key = (id || "cuborubik") + "_" + (frame === 1 ? 1 : 0);
    drawIcon(canvas, IDLE_PROP_ICONS[key] || IDLE_PROP_ICONS.cuborubik_0);
  }

  // ===== Effetti overlay sul canvas del pet (griglia 16x16, scala presa da ctx.canvas) =====
  var FOAM_WHITE = "#ffffff", FOAM_AZURE = "#a8e0f0";
  var CRUMB_BROWN = "#8a5c2e", CRUMB_DARK = "#5c3a1e";

  // 3-4 nuvolette di schiuma sul corpo del pet, 2 frame alternabili (lavaggio)
  function drawFoam(ctx, frame) {
    if (!ctx) return;
    var s = ctx.canvas.width / SIZE;
    var f = frame === 1 ? 1 : 0;
    var clouds = [[4, 8], [9, 6], [6, 11], [11, 10]];
    clouds.forEach(function (c, i) {
      var dx = f === 1 ? (i % 2 === 0 ? 1 : -1) : 0;
      var x = c[0] + dx, y = c[1];
      ctx.fillStyle = FOAM_WHITE;
      ctx.fillRect(x * s, y * s, 2 * s, 2 * s);
      ctx.fillStyle = FOAM_AZURE;
      ctx.fillRect((x - 1) * s, (y + 1) * s, s, s);
      ctx.fillRect((x + 2) * s, y * s, s, s);
      ctx.fillRect((x + 1) * s, (y - 1) * s, s, s);
    });
  }

  // 3-4 briciole che cadono davanti al pet, 2 frame (frame 1 = più in basso)
  function drawCrumbs(ctx, frame) {
    if (!ctx) return;
    var s = ctx.canvas.width / SIZE;
    var f = frame === 1 ? 1 : 0;
    var crumbs = [[6, 9], [9, 10], [7, 12], [10, 8]];
    crumbs.forEach(function (c, i) {
      var x = c[0] + (f === 1 && i % 2 === 0 ? 1 : 0);
      var y = c[1] + f;
      ctx.fillStyle = i % 2 === 0 ? CRUMB_BROWN : CRUMB_DARK;
      ctx.fillRect(x * s, y * s, s, s);
    });
  }

  // Boccaccia (idle personalita' maleducato, azione b): overlay sul volto, indipendente da
  // razza/sottorazza come le palpebre sotto — copre la fascia occhi/bocca (righe 6-9, stesso
  // terzo superiore usato da drawPalpebre) con "occhi storti" (due trattini in diagonale
  // invece che orizzontali) + lingua rosa che sporge in basso. 2 frame: la lingua oscilla di
  // 1px per dare l'idea del "bleh" ripetuto.
  var LINGUA_COLOR = "#e8748c";
  function drawBoccaccia(ctx, frame) {
    if (!ctx) return;
    var s = ctx.canvas.width / SIZE;
    var f = frame === 1 ? 1 : 0;
    // occhi storti: un pixel alto da un lato, basso dall'altro (invece della fascia dritta)
    ctx.fillStyle = "rgba(20,20,24,0.85)";
    ctx.fillRect(3 * s, (6 - f) * s, 2 * s, 1 * s);
    ctx.fillRect(5 * s, 7 * s, 2 * s, 1 * s);
    ctx.fillRect(9 * s, 7 * s, 2 * s, 1 * s);
    ctx.fillRect(11 * s, (6 + f) * s, 2 * s, 1 * s);
    // lingua fuori: rettangolo rosa che sporge dal "mento" verso il basso
    ctx.fillStyle = LINGUA_COLOR;
    ctx.fillRect(6 * s, 9 * s, 3 * s, (2 + f) * s);
  }

  // Palpebre chiuse (overlay sonno, GDD "Energia e sonno"): due trattini scuri sovrapposti
  // alla fascia occhi del pet, indipendenti da razza/sottorazza (riga occhi non nota qui a
  // priori: l'overlay copre approssimativamente il terzo superiore del corpo, dove in tutti
  // gli sprite 16x16 di questo modulo si trovano gli occhi/il viso).
  var ZZZ_COLOR = "#dfe4ec";
  function drawPalpebre(ctx) {
    if (!ctx) return;
    var s = ctx.canvas.width / SIZE;
    ctx.fillStyle = "rgba(20,20,24,0.75)";
    ctx.fillRect(3 * s, 6 * s, 4 * s, 1 * s);
    ctx.fillRect(9 * s, 6 * s, 4 * s, 1 * s);
  }

  // 2-3 "Z" pixel animabili sopra la testa del pet, 2 frame (alternano posizione/dimensione).
  // "scale" opzionale: pixel-schermo per unita' logica (griglia 16x16). Se omesso si ricava da
  // ctx.canvas.width/SIZE come prima (caso tipico: si disegna sul mini-canvas del pet stesso).
  // Il chiamante puo' passarlo esplicitamente per disegnare le Z altrove (es. sul canvas
  // stanza, molto piu' ampio, per non farle clippare dal bordo del mini-canvas del pet — v.
  // ui.js disegnaZzzStanza, fix del bug noto di clipping).
  function drawZzz(ctx, frame, scale) {
    if (!ctx) return;
    var s = scale || (ctx.canvas.width / SIZE);
    var f = frame === 1 ? 1 : 0;
    ctx.fillStyle = ZZZ_COLOR;
    var zetas = f === 1
      ? [[11, -1, 3], [13, -3, 2], [14, -5, 1]]
      : [[10, 0, 3], [12, -2, 2], [13, -4, 1]];
    zetas.forEach(function (z) {
      var x = z[0], y = z[1], size = z[2];
      // "Z" minimale: barra sopra, diagonale, barra sotto (scala size in pixel logici)
      ctx.fillRect(x * s, y * s, size * s, s);
      ctx.fillRect((x + size - 1) * s, (y + 1) * s, s, s);
      if (size > 2) ctx.fillRect((x + size - 2) * s, (y + 1) * s, s, s);
      ctx.fillRect(x * s, (y + size - 1) * s, size * s, s);
    });
  }

  // overlay completo "dorme" sul canvas del pet: palpebre chiuse + Zzz
  function drawSonno(ctx, frame) {
    drawPalpebre(ctx);
    drawZzz(ctx, frame);
  }

  // ===== Cartoline esiti missione: canvas logico 112x64, rect-composition + sprite del pet =====
  var CART_W = 112, CART_H = 64;

  // Topo delle fogne (grosso, peloso): 3 espressioni. chars: # outline, f pelo, v pancia/muso, e occhi, t coda
  var RAT_PAL = { "#": "#2a2018", f: "#8a7562", v: "#c9b299", e: "#141210", t: "#d89a9a" };
  var RAT_FUGA = ["................","................","................","................",".....##....##...",".....#f#..#f#...","....##########..","...#ffffffffff#.","tt#fffffffeeff#.",".tt#ffffffffvv#.","...#ffvvvvvvff#.","....##########..","....#..#..#..#..","...##..##..##...","................","................"];
  var RAT_PAURA = ["................","................","................","................","...##......##...","...#f#....#f#...","....########....","...#ffffffff#...","..#feeffffeef#..","..#feeffffeef#..","..#ffffvvffff#..","...#ffffffff#t..","...#ffffffff#.t.","....##....##....","................","................"];
  var RAT_AMICO = ["................","................","................","................","...##......##...","...#f#....#f#...","....########....","...#ffffffff#...","..#ffeffffeff#..","..#ffffvvffff#..","..#fvvvvvvvvf#..","..#fvvvvvvvvf#..","...#ffffffff#t..","....##..##..t...","................","................"];

  // helper rect locali (stesso stile rect-composition di rooms.js)
  function CR(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function CO(g, x, y, w, h, outline, fill) { CR(g, x, y, w, h, outline); CR(g, x + 1, y + 1, w - 2, h - 2, fill); }

  // pet dentro la scena: x,y = angolo alto-sinistra, scala 1 (16px) o 2 (32px, protagonista)
  function petAt(g, petLike, x, y, scale) {
    var res = resolvePet(petLike);
    paintFrame(g, res.frame, res.palette, scale, x, y);
    if (petLike.sporco) drawDirtOverlay(g, res.frame, scale, x, y);
  }
  function ratAt(g, variant, x, y, scale) {
    paintFrame(g, variant, RAT_PAL, scale, x, y);
  }

  // sagoma di comparsa (testa+corpo), per folle e pubblico
  function figura(g, x, y, h, col) {
    CR(g, x + 1, y, 4, 4, col);
    CR(g, x, y + 4, 6, h - 4, col);
  }
  function scintilla(g, x, y, col) {
    CR(g, x, y - 1, 1, 3, col);
    CR(g, x - 1, y, 3, 1, col);
  }
  function pioggia(g, col) {
    for (var i = 0; i < 10; i++) {
      var px = (i * 23 + 7) % CART_W;
      var py = (i * 13 + 5) % 40;
      CR(g, px, py, 1, 4, col);
    }
  }
  function striscioneTraguardo(g, x, y, w) {
    CR(g, x, y, 2, 26, "#8fa3ad");
    CR(g, x + w - 2, y, 2, 26, "#8fa3ad");
    for (var i = 0; i < Math.floor(w / 4); i++) {
      CR(g, x + 2 + i * 4, y, 4, 4, i % 2 === 0 ? "#f4f4f0" : "#1e2830");
      CR(g, x + 2 + i * 4, y + 4, 4, 4, i % 2 === 0 ? "#1e2830" : "#f4f4f0");
    }
  }

  // sfondi condivisi
  function sfondoSalaGiochi(g) {
    CR(g, 0, 0, CART_W, 48, "#16121f");
    CR(g, 0, 48, CART_W, 16, "#221c2e");
    CR(g, 0, 3, CART_W, 2, "#e85ad8"); // neon a soffitto
    // cabinati sul fondo
    [8, 40, 82].forEach(function (cx, i) {
      CO(g, cx, 12, 22, 34, "#0c0a12", "#2e2840");
      CR(g, cx + 3, 15, 16, 11, ["#3fd8ea", "#e85ad8", "#5ce87f"][i]);
      CR(g, cx + 4, 28, 6, 2, "#120e1a");
      CR(g, cx + 12, 28, 6, 2, "#120e1a");
    });
  }
  function sfondoParco(g) {
    CR(g, 0, 0, CART_W, 46, "#a9d9f2");
    CR(g, 0, 46, CART_W, 18, "#5cb84a");
    CR(g, 0, 44, CART_W, 2, "#3f8c34");
    CR(g, 92, 6, 10, 10, "#f8e05a"); // sole
    // palloncini
    [[14, 10, "#e85a78"], [24, 6, "#4dd8e8"], [98, 26, "#f0b84a"]].forEach(function (b) {
      CR(g, b[0], b[1], 6, 7, b[2]);
      CR(g, b[0] + 2, b[1] + 7, 1, 8, "#3a3a3a");
    });
  }
  function sfondoDojo(g) {
    CR(g, 0, 0, CART_W, 44, "#8a5c34");
    CR(g, 0, 4, CART_W, 2, "#6e4826");
    CR(g, 0, 26, CART_W, 2, "#6e4826");
    CR(g, 0, 44, CART_W, 20, "#4a8c5c"); // tatami
    CR(g, 0, 52, CART_W, 1, "#3a6e48");
    for (var x = 14; x < CART_W; x += 14) CR(g, x, 44, 1, 20, "#3a6e48");
    CO(g, 48, 8, 16, 22, "#2b2018", "#f0ead8"); // stendardo
    CR(g, 53, 12, 6, 3, "#c22a3a");
    CR(g, 53, 18, 6, 3, "#c22a3a");
  }
  function sfondoBiblioteca(g) {
    CR(g, 0, 0, CART_W, 46, "#c9a878");
    CR(g, 0, 46, CART_W, 18, "#8a5c34");
    // scaffali con dorsi colorati
    [4, 78].forEach(function (sx) {
      CO(g, sx, 6, 30, 38, "#3a2814", "#6e4826");
      [10, 22, 34].forEach(function (sy) {
        CR(g, sx + 2, sy, 26, 2, "#3a2814");
        var libri = ["#c22a3a", "#4a7ba6", "#5cb84a", "#f0b84a", "#8a4ab0"];
        for (var i = 0; i < 5; i++) CR(g, sx + 3 + i * 5, sy - 8, 4, 8, libri[(i + sy) % 5]);
      });
    });
  }
  function sfondoVicolo(g) {
    CR(g, 0, 0, CART_W, 48, "#141a2a");
    CR(g, 0, 48, CART_W, 16, "#1c2334");
    // palazzi scuri con finestrelle
    CO(g, 2, 6, 26, 42, "#0a0e18", "#1e2637");
    CO(g, 86, 10, 24, 38, "#0a0e18", "#1e2637");
    [[6, 10], [16, 10], [6, 20], [90, 14], [100, 22]].forEach(function (f) {
      CR(g, f[0], f[1], 4, 5, "#f0b84a");
    });
    // vapore dal tombino
    CR(g, 52, 50, 10, 3, "#2a3448");
    CR(g, 54, 42, 2, 8, "#3f4a62");
    CR(g, 58, 38, 2, 12, "#3f4a62");
    pioggia(g, "#4a6a9a");
  }
  function sfondoPista(g) {
    CR(g, 0, 0, CART_W, 40, "#12101e");
    CR(g, 0, 40, CART_W, 24, "#221c34");
    CR(g, 0, 46, CART_W, 2, "#e85ad8"); // corsie neon
    CR(g, 0, 56, CART_W, 2, "#3fd8ea");
    // pubblico dietro la transenna
    for (var i = 0; i < 8; i++) figura(g, 4 + i * 14, 26, 12, i % 2 === 0 ? "#3a3450" : "#2e2a44");
    CR(g, 0, 38, CART_W, 2, "#5c5480"); // transenna
  }
  function sfondoFogna(g, calda) {
    CR(g, 0, 0, CART_W, 46, calda ? "#2e3428" : "#232a22");
    CR(g, 0, 46, CART_W, 18, "#1a1f18");
    // tubi
    CR(g, 0, 8, CART_W, 5, "#3f4a3a");
    CR(g, 0, 8, CART_W, 1, "#556450");
    CR(g, 18, 13, 4, 33, "#3f4a3a");
    CR(g, 88, 13, 4, 33, "#3f4a3a");
    // canale d'acqua
    CR(g, 0, 58, CART_W, 6, calda ? "#3a5c4a" : "#2e4a3e");
    if (calda) { // lanterna calda per la scena amicizia
      CR(g, 52, 16, 8, 8, "#f0b84a");
      CR(g, 54, 12, 4, 4, "#8a5c2e");
    }
  }

  // ===== Le 17 scene =====
  var SCENE = {
    std_videogioco: function (g, pet) {
      sfondoSalaGiochi(g);
      petAt(g, pet, 36, 28, 2); // di fronte al cabinato centrale, in primo piano
    },
    std_sociale: function (g, pet) {
      sfondoParco(g);
      figura(g, 66, 30, 18, "#6e5a8a");
      figura(g, 80, 32, 16, "#4a6a5a");
      petAt(g, pet, 24, 26, 2);
      CO(g, 46, 46, 12, 4, "#8a8a86", "#f4f4f0"); // piatto
      CR(g, 49, 42, 6, 4, "#f0a0c0"); // fetta di torta
      CR(g, 49, 41, 6, 1, "#f8f0f4");
    },
    std_combattimento: function (g, pet) {
      sfondoDojo(g);
      figura(g, 76, 30, 16, "#3a3450");
      figura(g, 88, 32, 14, "#2e2a44");
      figura(g, 100, 31, 15, "#3a3450");
      petAt(g, pet, 18, 26, 2); // in guardia in primo piano
    },
    std_studio: function (g, pet) {
      sfondoBiblioteca(g);
      petAt(g, pet, 40, 14, 2); // seduto dietro il tavolo
      CO(g, 40, 44, 34, 12, "#3a2814", "#8a5c34"); // tavolo davanti al pet
      CO(g, 46, 38, 20, 8, "#8a8a86", "#f8f4ec"); // album aperto sul piano
      CR(g, 55, 39, 1, 6, "#8a8a86");
    },
    std_consegne: function (g, pet) {
      sfondoVicolo(g);
      var sporco = { razza: pet.razza, sottorazza: pet.sottorazza, parts: pet.parts, stadio: pet.stadio, corpo: pet.corpo, sporco: true };
      petAt(g, sporco, 38, 26, 2); // di corsa, macchie addosso (brief scheda M5)
      CO(g, 66, 38, 12, 10, "#3a2814", "#a8743c"); // pacco sottobraccio
      CR(g, 71, 38, 2, 10, "#6e4826");
    },
    std_sport: function (g, pet) {
      sfondoPista(g);
      petAt(g, pet, 40, 24, 2);
      CR(g, 42, 56, 10, 3, "#f4f4f0"); // pattini
      CR(g, 60, 56, 10, 3, "#f4f4f0");
    },
    fail_generica: function (g, pet) {
      CR(g, 0, 0, CART_W, 48, "#8a929c"); // cielo grigio
      CR(g, 0, 48, CART_W, 16, "#5c646e");
      CR(g, 10, 6, 22, 8, "#6e767e"); // nuvoloni
      CR(g, 44, 4, 26, 8, "#6e767e");
      CO(g, 84, 22, 24, 26, "#2b3640", "#a8968a"); // casa in fondo alla via
      CR(g, 92, 34, 8, 14, "#4a3a2e");
      CR(g, 88, 16, 16, 6, "#6e4826");
      CR(g, 30, 56, 20, 4, "#4a6a9a"); // pozzanghera
      CR(g, 34, 57, 8, 1, "#8fb8d8");
      petAt(g, pet, 24, 26, 2); // mogio sulla via di casa
      pioggia(g, "#a8b2bc");
    },
    super_m1: function (g, pet) {
      sfondoSalaGiochi(g);
      CR(g, 30, 0, 4, 28, "#3a3450"); // fasci di luce
      CR(g, 78, 0, 4, 28, "#3a3450");
      figura(g, 4, 34, 14, "#3a3450");
      figura(g, 98, 34, 14, "#3a3450");
      petAt(g, pet, 40, 28, 2);
      // coppa dorata sopra la testa: calice + manici + stelo + base
      CO(g, 49, 12, 14, 9, "#6e4826", "#f0b84a");
      CR(g, 46, 13, 3, 4, "#f0b84a"); // manico sx
      CR(g, 63, 13, 3, 4, "#f0b84a"); // manico dx
      CR(g, 54, 21, 4, 3, "#c99a3c"); // stelo
      CR(g, 51, 24, 10, 2, "#6e4826"); // base
      CR(g, 51, 13, 2, 3, "#f8e05a"); // riflesso
      scintilla(g, 44, 10, "#f8f0a0");
      scintilla(g, 68, 16, "#f8f0a0");
    },
    super_m2: function (g, pet) {
      sfondoParco(g);
      figura(g, 12, 28, 20, "#6e5a8a");
      figura(g, 26, 31, 17, "#4a6a5a");
      figura(g, 80, 28, 20, "#8a5c5c");
      figura(g, 94, 31, 17, "#5a6a8a");
      petAt(g, pet, 44, 26, 2);
      CO(g, 62, 44, 14, 7, "#6e1a26", "#d83048"); // macchinina
      CR(g, 64, 51, 3, 3, "#1e2830");
      CR(g, 71, 51, 3, 3, "#1e2830");
      CR(g, 65, 45, 6, 2, "#8fd8f0");
      scintilla(g, 78, 42, "#f8f0a0");
      scintilla(g, 60, 40, "#f8f0a0");
    },
    super_m3: function (g, pet) {
      sfondoDojo(g);
      figura(g, 8, 32, 15, "#3a3450");
      figura(g, 20, 34, 13, "#2e2a44");
      figura(g, 92, 32, 15, "#3a3450");
      figura(g, 102, 34, 13, "#2e2a44");
      petAt(g, pet, 42, 24, 2);
      CR(g, 48, 44, 20, 3, "#c22a3a"); // cintura del completo nuovo
      CR(g, 66, 44, 4, 6, "#c22a3a");
      scintilla(g, 40, 22, "#f8f0a0");
      scintilla(g, 76, 28, "#f8f0a0");
    },
    super_m4: function (g, pet) {
      sfondoBiblioteca(g);
      petAt(g, pet, 24, 26, 2);
      // pila di libri più alta del pet
      var libri = ["#c22a3a", "#4a7ba6", "#5cb84a", "#f0b84a", "#8a4ab0", "#4dd8e8", "#c05a88"];
      for (var i = 0; i < 7; i++) CO(g, 58, 52 - i * 6, 22, 6, "#3a2814", libri[i]);
      CO(g, 60, 10, 18, 6, "#6e4826", "#f0b84a"); // il volume prezioso in cima alla pila
      scintilla(g, 82, 10, "#f8f0a0");
    },
    super_m5: function (g, pet) {
      sfondoVicolo(g);
      CR(g, 24, 58, 18, 4, "#4a6a9a"); // pozzanghere sotto il salto
      CR(g, 58, 58, 16, 4, "#4a6a9a");
      petAt(g, pet, 40, 12, 2); // a mezz'aria sopra le pozzanghere
      CR(g, 30, 26, 8, 2, "#3f4a62"); // scie del salto
      CR(g, 26, 32, 8, 2, "#3f4a62");
      // scooter giocattolo
      CO(g, 74, 40, 16, 4, "#5c1a26", "#d83048");
      CR(g, 76, 44, 4, 4, "#1e2830");
      CR(g, 84, 44, 4, 4, "#1e2830");
      CR(g, 87, 30, 2, 10, "#8fa3ad");
      CR(g, 84, 30, 8, 2, "#8fa3ad");
    },
    super_m6: function (g, pet) {
      CR(g, 0, 0, CART_W, 48, "#1a1420"); // studio buio
      CR(g, 0, 48, CART_W, 16, "#2a2230");
      // riflettori: fasci che scendono sul pet
      CR(g, 46, 0, 6, 10, "#3a3450");
      CR(g, 44, 10, 10, 12, "#4a4462");
      CR(g, 42, 22, 14, 26, "#5a5474");
      petAt(g, pet, 40, 26, 2);
      // statuetta dorata in mano
      CR(g, 70, 34, 4, 8, "#f0b84a");
      CR(g, 69, 42, 6, 3, "#c99a3c");
      CR(g, 71, 31, 2, 3, "#f8e05a");
      // regista in piedi che applaude
      figura(g, 96, 28, 20, "#3a3450");
      CR(g, 93, 30, 3, 2, "#3a3450");
      CR(g, 102, 30, 3, 2, "#3a3450");
      scintilla(g, 66, 28, "#f8f0a0");
    },
    super_m7_dominio: function (g, pet) {
      sfondoFogna(g, false);
      petAt(g, pet, 30, 24, 2);
      // tutte e 4 le armi intorno: bastone, sai, nunchaku, katane
      CR(g, 24, 26, 2, 16, "#8a5c2e"); // bastone
      CR(g, 64, 30, 2, 8, "#c9ccd4"); // sai 1
      CR(g, 62, 32, 6, 2, "#c9ccd4");
      CR(g, 68, 28, 2, 6, "#8fa3ad"); // nunchaku
      CR(g, 72, 30, 2, 6, "#8fa3ad");
      CR(g, 70, 30, 2, 1, "#5c646e");
      CR(g, 76, 24, 2, 12, "#dfe4ec"); // katana 1
      CR(g, 80, 26, 2, 12, "#dfe4ec"); // katana 2
      CR(g, 76, 36, 2, 3, "#5c3a1e");
      CR(g, 80, 38, 2, 3, "#5c3a1e");
      ratAt(g, RAT_FUGA, 92, 32, 1); // topo in fuga sullo sfondo
    },
    super_m7_intimidazione: function (g, pet) {
      sfondoFogna(g, false);
      petAt(g, pet, 28, 22, 2); // pet minaccioso, in alto
      ratAt(g, RAT_PAURA, 64, 40, 1); // topo terrorizzato ai suoi piedi
      CR(g, 63, 43, 2, 2, "#8fd8f0"); // gocce di sudore
      CR(g, 79, 44, 2, 2, "#8fd8f0");
    },
    super_m7_amicizia: function (g, pet) {
      sfondoFogna(g, true); // atmosfera calda, lanterna accesa
      petAt(g, pet, 24, 28, 2); // seduti fianco a fianco
      ratAt(g, RAT_AMICO, 60, 20, 2); // il topone, grosso, accanto
      CR(g, 55, 34, 4, 4, "#e85a78"); // cuoricino tra i due
      CR(g, 54, 33, 2, 2, "#e85a78");
      CR(g, 58, 33, 2, 2, "#e85a78");
    },
    super_m8: function (g, pet) {
      sfondoPista(g);
      striscioneTraguardo(g, 62, 14, 36);
      petAt(g, pet, 64, 24, 2); // oltre il traguardo, largo margine
      CR(g, 66, 56, 10, 3, "#f4f4f0"); // pattini scintillanti
      CR(g, 84, 56, 10, 3, "#f4f4f0");
      scintilla(g, 64, 54, "#f8f0a0");
      scintilla(g, 96, 55, "#f8f0a0");
      figura(g, 6, 42, 14, "#3a3450"); // avversari lontanissimi
      figura(g, 18, 44, 12, "#2e2a44");
    }
  };

  // scenaId: 'std_<categoria>' | 'fail_generica' | 'super_m1..m8' | 'super_m7_dominio|intimidazione|amicizia'
  function drawCartolina(canvas, scenaId, petLike) {
    if (!canvas || !petLike) return;
    var g = canvas.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var sx = canvas.width / CART_W;
    var sy = canvas.height / CART_H;
    var scena = SCENE[scenaId] || SCENE.fail_generica;
    var needsScale = sx !== 1 || sy !== 1;
    if (needsScale) { g.save(); g.scale(sx, sy); }
    scena(g, petLike);
    if (needsScale) g.restore();
  }

  // ===== Assert di sviluppo: sprite 16x16, icone 12x12 =====
  function assertSpriteDims() {
    var all = {
      A_BABY: A_BABY, A_TEEN: A_TEEN,
      INS_BABY: INS_BABY, INS_TEEN: INS_TEEN,
      REP_BABY: REP_BABY, REP_TEEN: REP_TEEN,
      R_BABY: R_BABY, R_TEEN: R_TEEN
    };
    for (var name in all) {
      if (!Object.prototype.hasOwnProperty.call(all, name)) continue;
      checkFrame(name, all[name]);
    }
    // combinazioni robot (3 antenne x 3 teste x 2 stadi)
    for (var a = 0; a < 3; a++) {
      for (var t = 0; t < 3; t++) {
        checkFrame("R_BABY[a" + a + "t" + t + "]", buildRobotBaby(a, t));
        checkFrame("R_TEEN[a" + a + "t" + t + "]", buildRobotTeen(a, t));
      }
    }
    // varianti corpo teen per ogni sottorazza + robot
    ["blob", "insettoide", "rettiliano"].forEach(function (sr) {
      ["normale", "magro", "ciccione"].forEach(function (corpo) {
        checkFrame("alieno[" + sr + "," + corpo + "]", getAlienFrame(sr, "teen", corpo));
      });
    });
    ["normale", "magro", "ciccione"].forEach(function (corpo) {
      checkFrame("robot[teen," + corpo + "]", getRobotFrame({ antenna: 0, testa: 0 }, "teen", corpo));
    });
    // topo delle fogne (16x16)
    checkFrame("RAT_FUGA", RAT_FUGA);
    checkFrame("RAT_PAURA", RAT_PAURA);
    checkFrame("RAT_AMICO", RAT_AMICO);
    // icone cibo e prop (12x12)
    var iconSets = [["cibo", FOOD_ICONS], ["cibo-fallback", FOOD_FALLBACK], ["prop", PROP_ICONS], ["idle-prop", IDLE_PROP_ICONS]];
    iconSets.forEach(function (set) {
      for (var id in set[1]) {
        if (Object.prototype.hasOwnProperty.call(set[1], id)) {
          checkFrame(set[0] + "[" + id + "]", set[1][id].px, ICON_SIZE);
        }
      }
    });
    checkFrame("valigetta", VALIGETTA_ICON.px, ICON_SIZE);
  }

  function checkFrame(name, frame, size) {
    size = size || SIZE;
    if (!frame || frame.length !== size) {
      console.error("PETQ.sprites: " + name + " ha " + (frame ? frame.length : 0) + " righe (attese " + size + ")");
      return false;
    }
    var ok = true;
    for (var i = 0; i < frame.length; i++) {
      if (typeof frame[i] !== "string" || frame[i].length !== size) {
        console.error("PETQ.sprites: " + name + " riga " + i + " lunga " + (frame[i] ? frame[i].length : "?") + " invece di " + size + ": '" + frame[i] + "'");
        ok = false;
      }
    }
    return ok;
  }

  // esegue subito il check (sviluppo): eventuali errori vanno in console, non bloccano l'app
  assertSpriteDims();

  window.PETQ.sprites = {
    draw: draw,
    drawSdraiato: drawSdraiato,
    drawFood: drawFood,
    drawProp: drawProp,
    drawFoam: drawFoam,
    drawCrumbs: drawCrumbs,
    drawZzz: drawZzz,
    drawSonno: drawSonno,
    drawIdleProp: drawIdleProp,
    drawBoccaccia: drawBoccaccia,
    drawValigetta: drawValigetta,
    drawPianeta: drawPianeta,
    drawCartolina: drawCartolina,
    _cartoline: Object.keys(SCENE),
    // topo amichevole riusabile fuori dalle cartoline (arredo "allenatore" nelle stanze)
    drawRatAmico: function (ctx, x, y, scale) { if (ctx) paintFrame(ctx, RAT_AMICO, RAT_PAL, scale || 1, x || 0, y || 0); },
    // esposti per test-sprites.html e debug
    _assertSpriteDims: assertSpriteDims,
    _getAlienFrame: getAlienFrame,
    _getRobotFrame: getRobotFrame,
    _getPalette: getPalette,
    _foodIcons: FOOD_ICONS,
    _foodFallback: FOOD_FALLBACK,
    _propIcons: PROP_ICONS
  };
})();
