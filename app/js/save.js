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
    if (!Array.isArray(state.dispensa)) state.dispensa = [];
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];
    state.tutorialFatto = !!state.tutorialFatto;
    if (typeof state.missione === 'undefined') state.missione = null;

    // Migrazione modulo Energia e sonno: salvataggi pre-esistenti non hanno pet.stats.energia
    // ne' state.sonno. Default da bilanciamento.md ("Stat iniziali alla generazione"): energia
    // parte a 70 come le altre stat di benessere (richiesta esplicita del fondatore).
    if (state.pet && state.pet.stats && typeof state.pet.stats.energia !== 'number') {
      state.pet.stats.energia = 70;
    }
    if (typeof state.sonno === 'undefined') state.sonno = null;
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
    reset: reset
  };
})();
