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

  // situazioni "contestuali" in cui il pet puo' usare spontaneamente una parola insegnata
  // (GDD "Parola insegnata", fix playtest): saluto, felice — cioe' saluto/coccola/battuta
  // automatica. MAI negli esiti missione ne' nelle situazioni critiche (fame/sporco/triste).
  var SITUAZIONI_PAROLA = { saluto: true, felice: true };
  var PROB_PAROLA = 0.2;

  function say(pet, situazione, state) {
    if (!pet) return '...';

    var data = window.PETQ.content && window.PETQ.content.data;
    var personalita = pet.personalita || 'gentile';
    var pools = data && data.personalita && data.personalita[personalita];

    // ~20% delle battute contestuali pescano dal pool 'parola' se il giocatore
    // ha insegnato almeno una parola ({parola} = una a caso tra le insegnate)
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

  window.PETQ.dialog = { say: say };

})();
