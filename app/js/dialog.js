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

  function say(pet, situazione, state) {
    if (!pet) return '...';

    var data = window.PETQ.content && window.PETQ.content.data;
    var personalita = pet.personalita || 'gentile';
    var pool = data && data.personalita && data.personalita[personalita]
      ? data.personalita[personalita][situazione]
      : null;

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
