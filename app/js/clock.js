window.PETQ = window.PETQ || {};

(function () {
  var CAP_ORE = 12;
  var TICK_MS = 30000;
  var MINUTI_GIORNO = 1440;

  function isNight(date) {
    var h = date.getHours();
    return h >= 23 || h < 8;
  }

  // Somma le ore reali tra fromMs e toMs escludendo le ore notturne (23:00-07:59),
  // avanzando a passi orari e pesando l'ultima frazione parziale.
  function elapsedGameHours(fromMs, toMs) {
    if (!(toMs > fromMs)) return 0;

    var totale = 0;
    var cursore = fromMs;
    var UNORA = 3600000;

    while (cursore < toMs) {
      var fineBlocco = Math.min(cursore + UNORA, toMs);
      var frazioneOre = (fineBlocco - cursore) / UNORA;
      if (!isNight(new Date(cursore))) {
        totale += frazioneOre;
      }
      cursore = fineBlocco;
      if (totale >= CAP_ORE) break;
    }

    return Math.min(totale, CAP_ORE);
  }

  function startTicking(cb) {
    return setInterval(function () {
      var moltiplicatore = window.PETQ.debugTime || 1;
      if (moltiplicatore === 1 && isNight(new Date())) {
        cb(0);
        return;
      }
      var oreBase = TICK_MS / 3600000;
      cb(oreBase * moltiplicatore);
    }, TICK_MS);
  }

  // ==================== Orologio di gioco (fix "sonno + orologio") ====================
  // Problema che questo modulo risolve: "notte"/"ora del letto"/"crollo" usavano finora
  // new Date().getHours() = ora REALE del PC. Il moltiplicatore debug (PETQ.debugTime)
  // accelera solo il decadimento delle stat (gameHours), MAI l'ora reale: a ×600 le stat
  // calano ma l'orologio reale non si sposta, quindi non si arriva mai alle 21/23 e il
  // sonno resta intestabile. state.gameMinutes (0-1439, 00:00-23:59) e' l'orologio DI GIOCO:
  // avanza con lo STESSO delta di gameHours gia' passato a applyDecay ad ogni tick/decay
  // offline, cosi' il debug ×60/×600 accelera anche l'orologio. Wrap a 1440 = nuovo giorno.
  //
  // Migrazione salvataggi: se manca, si inizializza dall'ora reale corrente (continuita'
  // per le partite gia' in corso, che altrimenti si risveglierebbero a mezzanotte in game).

  // Avanza l'orologio di gioco di deltaOreGioco (stesso numero usato per il decadimento
  // stat) e fa scattare eventuali "nuovo giorno" per ogni wrap a 1440 attraversato.
  // Ritorna il numero di giorni-di-gioco avanzati in questa chiamata (di solito 0 o 1,
  // ma con salti grossi di tempo offline o debug ×600 potrebbe essere >1).
  function avanzaOrologio(state, deltaOreGioco) {
    if (!state || !(deltaOreGioco > 0)) return 0;
    if (typeof state.gameMinutes !== 'number' || isNaN(state.gameMinutes)) {
      inizializzaOrologio(state);
    }
    var minutiTotali = state.gameMinutes + deltaOreGioco * 60;
    var giorniAvanzati = Math.floor(minutiTotali / MINUTI_GIORNO);
    state.gameMinutes = ((minutiTotali % MINUTI_GIORNO) + MINUTI_GIORNO) % MINUTI_GIORNO;
    return giorniAvanzati;
  }

  // Migrazione: inizializza gameMinutes dall'ora REALE corrente, per continuita' dei
  // salvataggi pre-esistenti (cosi' chi gioca oggi pomeriggio non si ritrova a mezzanotte).
  function inizializzaOrologio(state) {
    if (!state) return;
    var ora = new Date();
    state.gameMinutes = ora.getHours() * 60 + ora.getMinutes();
  }

  // {ore, minuti, hhmm:'HH:MM'} dall'orologio di gioco corrente
  function oraGioco(state) {
    var gm = (state && typeof state.gameMinutes === 'number') ? state.gameMinutes : 0;
    gm = ((gm % MINUTI_GIORNO) + MINUTI_GIORNO) % MINUTI_GIORNO;
    var ore = Math.floor(gm / 60);
    var minuti = Math.floor(gm % 60);
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    return { ore: ore, minuti: minuti, hhmm: pad2(ore) + ':' + pad2(minuti) };
  }

  // notte sull'orologio DI GIOCO (GDD/bilanciamento: 21:00-07:59, non 23:00 come la notte
  // "reale" di isNight sopra - qui la soglia e' quella di "ora del letto")
  function eNotteGioco(state, oraLettoH, oraFineNotteH) {
    var oraLetto = (typeof oraLettoH === 'number') ? oraLettoH : 21;
    var oraFine = (typeof oraFineNotteH === 'number') ? oraFineNotteH : 8;
    var og = oraGioco(state);
    return og.ore >= oraLetto || og.ore < oraFine;
  }

  window.PETQ.clock = {
    isNight: isNight,
    elapsedGameHours: elapsedGameHours,
    startTicking: startTicking,
    avanzaOrologio: avanzaOrologio,
    inizializzaOrologio: inizializzaOrologio,
    oraGioco: oraGioco,
    eNotteGioco: eNotteGioco,
    _MINUTI_GIORNO: MINUTI_GIORNO
  };
})();
