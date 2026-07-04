window.PETQ = window.PETQ || {};

(function () {
  var CAP_ORE = 12;
  var TICK_MS = 30000;

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

  window.PETQ.clock = {
    isNight: isNight,
    elapsedGameHours: elapsedGameHours,
    startTicking: startTicking
  };
})();
