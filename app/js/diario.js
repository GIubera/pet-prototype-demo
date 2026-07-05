window.PETQ = window.PETQ || {};

// PETQ.diario — assemblatore della pagina-diario (PROTOTIPO-2.md punto 6 "Diario in camera").
// Design VINCOLANTE (docs/PROTOTIPO-2.md): lo scrive il PET, frasi generiche assemblate (NO
// API), mixate in base a personalita' + eventi VERI del giorno. Qui si legge lo stato REALE
// della giornata e si pesca 1 frammento a caso per ognuno dei 6 momenti (content/diario.md):
// Apertura, Cibo(bene|poco), Missione(bene|male|nessuna), Umore(bene|stanco|giu),
// Coccole(ricevute|ignorato), Chiusura. Slot {nome}/{utente} risolti come le battute normali
// (v. dialog.js riempiSlot, stessa convenzione ma duplicata qui per non introdurre una
// dipendenza incrociata dialog<->diario: entrambi leggono solo content.data).
(function () {

  var SOGLIA_CIBO_BENE = 2; // pastiOggi.length >= 2 -> "mangiato bene" (vedi PROTOTIPO-2 brief)
  var SOGLIA_UMORE_GIU = 30;   // felicita < 30 -> giu
  var SOGLIA_UMORE_STANCO = 30; // altrimenti energia < 30 -> stanco

  function riempiSlotDiario(testo, pet) {
    var nome = (pet && pet.nome) ? pet.nome : '...';
    return (testo || '')
      .replace(/\{nome\}/g, nome)
      .replace(/\{utente\}/g, 'capo');
  }

  // Pesca un frammento a caso dal pool[chiave] della personalita' indicata. Difensivo: se il
  // pool/sottosezione e' vuoto o assente (socio non ha ancora scritto quella riga, o file non
  // ricaricato), ritorna null cosi' il chiamante salta la riga invece di rompersi.
  function pescaFrammento(personalita, chiave, pet) {
    var data = window.PETQ.content && window.PETQ.content.data;
    var diario = data && data.diario;
    var pool = diario && diario[personalita] && diario[personalita][chiave];
    if (!pool || pool.length === 0) {
      console.warn('PETQ.diario: pool vuoto per "' + personalita + '.' + chiave + '", riga saltata');
      return null;
    }
    var scelto = (PETQ.rng && PETQ.rng.pick) ? PETQ.rng.pick(pool) : pool[Math.floor(Math.random() * pool.length)];
    return riempiSlotDiario(scelto, pet);
  }

  // ---------- calcolo dei sotto-stati dagli eventi VERI della giornata ----------

  function statoCibo(pet) {
    var pasti = (pet && pet.pastiOggi) || [];
    return pasti.length >= SOGLIA_CIBO_BENE ? 'cibo_bene' : 'cibo_poco';
  }

  // esitoMissioneGiorno: 'super'|'standard'|'fallimento'|null (v. missions.risolvi/care.dailyLogin)
  function statoMissione(state) {
    var esito = state && state.esitoMissioneGiorno;
    if (esito === 'super' || esito === 'standard') return 'missione_bene';
    if (esito === 'fallimento') return 'missione_male';
    return 'missione_nessuna';
  }

  function statoUmore(pet) {
    var felicita = (pet && pet.stats && typeof pet.stats.felicita === 'number') ? pet.stats.felicita : 100;
    var energia = (pet && pet.stats && typeof pet.stats.energia === 'number') ? pet.stats.energia : 100;
    if (felicita < SOGLIA_UMORE_GIU) return 'umore_giu';
    if (energia < SOGLIA_UMORE_STANCO) return 'umore_stanco';
    return 'umore_bene';
  }

  function statoCoccole(state) {
    return (state && state.coccoleCount > 0) ? 'coccole_ricevute' : 'coccole_ignorato';
  }

  // Costruisce la pagina del giorno: array di righe (stringhe) pronte da mostrare, una per
  // momento (Apertura, Cibo, Missione, Umore, Coccole, Chiusura), nell'ordine del brief.
  // Se un momento non ha frammenti disponibili la riga viene semplicemente omessa (mai una
  // pagina rotta o con placeholder brutti).
  // Lock 1 diario/giorno (fix fondatore 5 lug 2026): la pagina si compone UNA volta per giorno
  // DI GIOCO e resta fissa finché non cambia giorno (chiave = pet.giorniVita, che avanza a ogni
  // "nuovo giorno"). Riclickare la scrivania mostra la STESSA pagina, non una nuova estrazione
  // random. Al cambio giorno la chiave non combacia più e la pagina si ricompone (una sola volta).
  function chiaveGiorno(state) {
    return (state && state.pet && typeof state.pet.giorniVita === 'number') ? state.pet.giorniVita : 0;
  }

  function componiPagina(state) {
    if (!state) return [];
    var giorno = chiaveGiorno(state);
    if (state.diarioOggi && state.diarioOggi.giorno === giorno && Array.isArray(state.diarioOggi.righe)) {
      return state.diarioOggi.righe;
    }

    var pet = state.pet;
    var personalita = (pet && pet.personalita) || 'gentile';

    var momenti = [
      'apertura',
      statoCibo(pet),
      statoMissione(state),
      statoUmore(pet),
      statoCoccole(state),
      'chiusura'
    ];

    var righe = [];
    for (var i = 0; i < momenti.length; i++) {
      var riga = pescaFrammento(personalita, momenti[i], pet);
      if (riga) righe.push(riga);
    }

    state.diarioOggi = { giorno: giorno, righe: righe };
    return righe;
  }

  window.PETQ.diario = {
    componiPagina: componiPagina,
    _statoCibo: statoCibo,
    _statoMissione: statoMissione,
    _statoUmore: statoUmore,
    _statoCoccole: statoCoccole,
    _sogliaCiboBene: SOGLIA_CIBO_BENE,
    _sogliaUmoreGiu: SOGLIA_UMORE_GIU,
    _sogliaUmoreStanco: SOGLIA_UMORE_STANCO
  };

})();
