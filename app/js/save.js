window.PETQ = window.PETQ || {};

(function () {
  var KEY = 'petq_save_v1';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var state = JSON.parse(raw);
      migraState(state);
      return state;
    } catch (e) {
      console.warn('PETQ.save.load fallito', e);
      return null;
    }
  }

  // Migrazione dispensa array-di-{nome} (vecchio formato, un cibo = una riga senza quantita')
  // -> inventario array-di-{nome, qty} (GDD "Economia" -> "Spesa e dispensa"): somma le
  // occorrenze duplicate dello stesso nome in un'unica riga con qty. Tollerante anche a righe
  // gia' nel nuovo formato (qty numerica presente: sommata cosi' com'e') e a stringhe nude
  // (formati ancora piu' vecchi, mai emessi in produzione ma innocuo da coprire).
  function migraDispensaAQty(state) {
    if (!state || !Array.isArray(state.dispensa)) { if (state) state.dispensa = []; return; }
    var perNome = {};
    var ordine = [];
    for (var i = 0; i < state.dispensa.length; i++) {
      var voce = state.dispensa[i];
      var nome = typeof voce === 'string' ? voce : (voce && voce.nome);
      if (!nome) continue;
      var qty = (voce && typeof voce.qty === 'number' && voce.qty > 0) ? voce.qty : 1;
      if (!Object.prototype.hasOwnProperty.call(perNome, nome)) {
        perNome[nome] = 0;
        ordine.push(nome);
      }
      perNome[nome] += qty;
    }
    state.dispensa = ordine.map(function (nome) { return { nome: nome, qty: perNome[nome] }; });
  }

  // Migrazione silenziosa dei salvataggi vecchi (pre-modulo missioni/arredi/salute):
  // state.arredi era un array vuoto, mancavano ferite/dispensa/cureOggi/categoriePastiOggi/
  // tutorialFatto/missione. Applicata sia qui (save.load) sia difensivamente dentro
  // arredi.js/missions.js (assicuraArrediStruct e guardie equivalenti), cosi' funziona
  // anche su uno stato appena creato da ui.js.avviaPartita nello stesso avvio (senza reload).
  function migraState(state) {
    if (!state || typeof state !== 'object') return;

    if (!state.arredi || typeof state.arredi !== 'object' || Array.isArray(state.arredi) ||
        !state.arredi.posseduti || !state.arredi.piazzati) {
      state.arredi = { posseduti: [], piazzati: { cucina: [], bagno: [], salone: [] } };
    }
    if (typeof state.ferite !== 'number') state.ferite = 0;
    if (typeof state.cureOggi !== 'number') state.cureOggi = 0;
    migraDispensaAQty(state);
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];
    state.tutorialFatto = !!state.tutorialFatto;
    // Negozio unico (GDD "Economia" -> "Spesa e dispensa"): migrazione — i salvataggi con
    // tutorial gia' fatto avevano gia' accesso al vecchio Market separato, quindi il negozio
    // si considera sbloccato senza dover rifare il tutorial. Stessa regola duplicata in
    // missions.js assicuraStatoMissioni e main.js migraState (pattern gia' usato per gli altri
    // campi di questa migrazione).
    if (typeof state.negozioSbloccato !== 'boolean') {
      state.negozioSbloccato = !!state.tutorialFatto;
    }
    if (typeof state.missione === 'undefined') state.missione = null;
    if (!state.missioniFatte || typeof state.missioniFatte !== 'object' || Array.isArray(state.missioniFatte)) {
      state.missioniFatte = {};
    }

    // Migrazione modulo Energia e sonno: salvataggi pre-esistenti non hanno pet.stats.energia
    // ne' state.sonno. Default da bilanciamento.md ("Stat iniziali alla generazione"): energia
    // parte a 70 come le altre stat di benessere (richiesta esplicita del fondatore).
    if (state.pet && state.pet.stats && typeof state.pet.stats.energia !== 'number') {
      state.pet.stats.energia = 70;
    }
    if (typeof state.sonno === 'undefined') state.sonno = null;

    // Migrazione orologio di gioco (fix "sonno + orologio", stessa regola duplicata in
    // main.js migraState): se manca gameMinutes, si inizializza dall'ora REALE corrente.
    if (typeof state.gameMinutes !== 'number' && window.PETQ.clock && window.PETQ.clock.inizializzaOrologio) {
      window.PETQ.clock.inizializzaOrologio(state);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('PETQ.save.save fallito', e);
    }
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      console.warn('PETQ.save.reset fallito', e);
    }
  }

  window.PETQ.save = {
    load: load,
    save: save,
    reset: reset,
    _migraDispensaAQty: migraDispensaAQty
  };
})();
