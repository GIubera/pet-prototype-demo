window.PETQ = window.PETQ || {};

(function () {

  var ultimaBattuta = {}; // per personalita+situazione, evita ripetizione consecutiva

  function riempiSlot(testo, pet, state) {
    var nome = (pet && pet.nome) ? pet.nome : '...';
    var parola = 'boh';
    if (state && state.parole && state.parole.length > 0) {
      parola = PETQ.rng.pick(state.parole) || 'boh';
    }
    return testo
      .replace(/\{nome\}/g, nome)
      .replace(/\{utente\}/g, 'capo')
      .replace(/\{parola\}/g, parola);
  }

  // Situazioni "contestuali" in cui il pet puo' usare spontaneamente una parola insegnata
  // (GDD "Parola insegnata" / bilanciamento.md "Frequenza uso parola imparata", playtest —
  // il fondatore non la vedeva mai): saluto e felice sono le uniche due chiavi di pool usate
  // da situazionePrioritaria() in ui.js, ma coprono TUTTE E QUATTRO le situazioni richieste:
  // - saluto: battuta automatica generica (ui.js battutaAutomatica) quando nessun'altra
  //   situazione e' prioritaria
  // - felice: battuta automatica quando Felicita' > 75, e battuta occasionale dopo una coccola
  //   (ui.js eseguiCoccola -> battutaAutomatica) o dopo un pasto (ui.js eseguiFeed)
  // - "apertura casa": battutaAutomatica() e' chiamata da renderStanza() ad ogni cambio
  //   stanza/boot, quindi anche il primo giro all'apertura passa da qui
  // MAI negli esiti missione (missione_successo/missione_fallimento hanno pool dedicati, mai
  // instradati su 'parola') ne' nelle situazioni critiche fame/sporco/triste (escluse di
  // proposito da questa mappa: si fondono nell'aggiornaHud ma la voce del pet nei momenti
  // brutti non scherza con le parole imparate per gioco).
  var SITUAZIONI_PAROLA = { saluto: true, felice: true };
  var PROB_PAROLA = 0.3;

  function say(pet, situazione, state) {
    if (!pet) return '...';

    var data = window.PETQ.content && window.PETQ.content.data;
    var personalita = pet.personalita || 'gentile';
    var pools = data && data.personalita && data.personalita[personalita];

    // 30% delle battute contestuali pescano dal pool 'parola' se il giocatore ha insegnato
    // almeno una parola ({parola} = una a caso tra le insegnate, v. riempiSlot sopra)
    if (SITUAZIONI_PAROLA[situazione] && state && state.parole && state.parole.length > 0 &&
        pools && pools.parola && pools.parola.length > 0 && PETQ.rng.rand() < PROB_PAROLA) {
      situazione = 'parola';
    }

    var pool = pools ? pools[situazione] : null;

    if (!pool || pool.length === 0) return '...';

    var scelta;
    if (pool.length === 1) {
      scelta = pool[0];
    } else {
      var chiave = personalita + ':' + situazione;
      var precedente = ultimaBattuta[chiave];
      do {
        scelta = PETQ.rng.pick(pool);
      } while (scelta === precedente && pool.length > 1);
      ultimaBattuta[chiave] = scelta;
    }

    return riempiSlot(scelta, pet, state);
  }

  window.PETQ.dialog = {
    say: say,
    _probParola: PROB_PAROLA,
    _situazioniParola: SITUAZIONI_PAROLA
  };

})();
