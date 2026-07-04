window.PETQ = window.PETQ || {};

(function () {

  function boot() {
    PETQ.content.load(function () {
      var state = PETQ.save.load();

      if (!state) {
        avviaIntro();
        return;
      }

      migraState(state);
      applicaDecadimentoOffline(state);
      eseguiLoginGiornaliero(state);
      PETQ.save.save(state);

      avviaTicking(state);
      renderIniziale(state);
    });
  }

  // Sotto questa eta' (ms dalla creazione del pet) una partita si considera "appena iniziata
  // ora" anche se lo vediamo per la prima volta qui (es. primo refresh subito dopo l'intro):
  // non deve saltare il tutorial. Oltre questa soglia, un salvataggio senza i campi missioni
  // e' considerato pre-esistente (creato prima di questo modulo) e non deve piu' vedere il
  // tutorial. Vedi commento sotto per il perche' serve un'euristica invece di un flag diretto.
  var SOGLIA_PARTITA_APPENA_INIZIATA_MS = 10 * 60000; // 10 minuti

  // Migrazione silenziosa dei salvataggi pre-modulo-missioni (v. docs/SPEC-MODULO-MISSIONI.md
  // "Stato esteso"): i salvataggi esistenti hanno state.arredi:[] (array, formato vecchio mai
  // popolato nel prototipo) e nessuno dei campi nuovi (ferite, cureOggi, dispensa, missione,
  // categoriePastiOggi, tutorialFatto). Qui li aggiungiamo con i default della spec.
  //
  // Caso limite tutorialFatto: ui.js (fuori scope, non modificabile qui) crea le partite nuove
  // con lo stesso state.arredi:[] "vecchio formato" usato dai salvataggi pre-esistenti, quindi
  // non c'e' un campo strutturale che distingua "partita nuova mai passata da qui" da "salvataggio
  // di una partita vecchia". Si usa percio' l'eta' di state.pet.nascita rispetto ad ora: se il pet
  // e' stato creato da meno di SOGLIA_PARTITA_APPENA_INIZIATA_MS, e' quasi certamente la stessa
  // sessione appena creata da ui.js (il primo giro di boot() dopo un refresh arriva in pratica
  // subito dopo) e tutorialFatto parte false; altrimenti (pet piu' "vecchio" o assente) si tratta
  // di una partita gia' avviata prima del modulo missioni e tutorialFatto parte true.
  function migraState(state) {
    if (!state) return;

    var haGiaCampiMissioni = typeof state.tutorialFatto === 'boolean';
    var etaPetMs = (state.pet && typeof state.pet.nascita === 'number') ? (Date.now() - state.pet.nascita) : Infinity;
    var eAppenaIniziata = etaPetMs < SOGLIA_PARTITA_APPENA_INIZIATA_MS;

    if (!state.arredi || typeof state.arredi !== 'object' || Array.isArray(state.arredi) ||
        !state.arredi.posseduti || !state.arredi.piazzati) {
      state.arredi = { posseduti: [], piazzati: { cucina: [], bagno: [], salone: [] } };
    }
    if (typeof state.ferite !== 'number') state.ferite = 0;
    if (typeof state.cureOggi !== 'number') state.cureOggi = 0;
    if (!Array.isArray(state.dispensa)) state.dispensa = [];
    if (typeof state.missione === 'undefined') state.missione = null;
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];

    if (!haGiaCampiMissioni) {
      state.tutorialFatto = !eAppenaIniziata;
    }

    if (PETQ.pet && state.pet) {
      PETQ.pet.recomputeSalute(state.pet, state);
    }
  }

  function avviaIntro() {
    if (PETQ.ui && PETQ.ui.boot) {
      PETQ.ui.boot();
    } else {
      console.warn('PETQ.ui.boot non disponibile: modulo grafica/gioco non ancora caricato');
    }
  }

  function applicaDecadimentoOffline(state) {
    var ora = Date.now();
    var daMs = (typeof state.lastSeen === 'number') ? state.lastSeen : ora;
    var oreGioco = PETQ.clock.elapsedGameHours(daMs, ora);

    if (oreGioco > 0 && state.pet && PETQ.pet && PETQ.pet.applyDecay) {
      PETQ.pet.applyDecay(state.pet, oreGioco, state);
    }

    state.lastSeen = ora;
  }

  function eseguiLoginGiornaliero(state) {
    if (PETQ.care && PETQ.care.dailyLogin) {
      PETQ.care.dailyLogin(state);
    }
  }

  function avviaTicking(state) {
    PETQ.clock.startTicking(function (deltaOreGioco) {
      if (state.pet && PETQ.pet && PETQ.pet.applyDecay) {
        PETQ.pet.applyDecay(state.pet, deltaOreGioco, state);
      }
      state.lastSeen = Date.now();
      PETQ.save.save(state);

      if (PETQ.ui && PETQ.ui.render) {
        PETQ.ui.render(state);
      }
    });
  }

  function renderIniziale(state) {
    if (PETQ.ui && PETQ.ui.boot) {
      PETQ.ui.boot(state);
    } else {
      console.warn('PETQ.ui.boot non disponibile: modulo grafica/gioco non ancora caricato');
    }
  }

  PETQ.main = { avviaTicking: avviaTicking, migraState: migraState };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
