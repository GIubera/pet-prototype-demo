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
      controllaCicloSonno(state);
      PETQ.save.save(state);

      avviaTicking(state);
      renderIniziale(state);
    });
  }

  // Controlla al boot/tick il ciclo sonno (GDD "Energia e sonno"): sveglia autonoma se sono
  // passate >=8h dall'inizio del sonno, altrimenti crollo automatico se sono le 23 e il pet e'
  // ancora sveglio. Le due funzioni sono mutuamente esclusive (una richiede state.sonno, l'altra
  // richiede !state.sonno) percio' l'ordine non conta ai fini della correttezza.
  function controllaCicloSonno(state) {
    if (!state || !PETQ.pet) return null;
    var risveglio = PETQ.pet.controllaSveglia(state);
    if (risveglio) return risveglio;
    PETQ.pet.controllaCrolloAutomatico(state);
    return null;
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
  // Migrazione dispensa array-di-{nome} -> inventario array-di-{nome, qty}: stessa logica
  // duplicata in save.js (v. save.js migraDispensaAQty per il commento esteso), applicata
  // anche qui perche' main.js ha la sua migrazione indipendente eseguita al boot.
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

  function migraState(state) {
    if (!state) return;

    var haGiaCampiMissioni = typeof state.tutorialFatto === 'boolean';
    var etaPetMs = (state.pet && typeof state.pet.nascita === 'number') ? (Date.now() - state.pet.nascita) : Infinity;
    var eAppenaIniziata = etaPetMs < SOGLIA_PARTITA_APPENA_INIZIATA_MS;

    if (!state.arredi || typeof state.arredi !== 'object' || Array.isArray(state.arredi) ||
        !state.arredi.posseduti || !state.arredi.piazzati) {
      state.arredi = { posseduti: [], piazzati: { cucina: [], bagno: [], salone: [], camera: [] } };
    }
    // PROTOTIPO 2, Blocco 7: backfill 'camera' sui salvataggi vecchi (v. save.js migraState).
    if (state.arredi.piazzati && !Array.isArray(state.arredi.piazzati.camera)) {
      state.arredi.piazzati.camera = [];
    }
    if (typeof state.ferite !== 'number') state.ferite = 0;
    if (typeof state.cureOggi !== 'number') state.cureOggi = 0;
    migraDispensaAQty(state);
    if (typeof state.missione === 'undefined') state.missione = null;
    if (!state.missioniFatte || typeof state.missioniFatte !== 'object' || Array.isArray(state.missioniFatte)) {
      state.missioniFatte = {};
    }
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];

    if (!haGiaCampiMissioni) {
      state.tutorialFatto = !eAppenaIniziata;
    }
    // Negozio unico (GDD "Economia" -> "Spesa e dispensa"): stessa regola di migrazione
    // duplicata in save.js/missions.js — tutorial gia' fatto = negozio gia' sbloccato (il
    // vecchio Market separato era comunque sempre accessibile).
    if (typeof state.negozioSbloccato !== 'boolean') {
      state.negozioSbloccato = !!state.tutorialFatto;
    }

    // Migrazione modulo Energia e sonno (v. save.js migraState, stessa regola duplicata qui
    // perche' main.js ha la sua migrazione indipendente eseguita al boot): energia parte a 70
    // come le altre stat di benessere per i salvataggi che non la conoscevano ancora.
    if (state.pet && state.pet.stats && typeof state.pet.stats.energia !== 'number') {
      state.pet.stats.energia = 70;
    }
    if (typeof state.sonno === 'undefined') state.sonno = null;

    // Migrazione Valigia / partenza (PROTOTIPO 2, Blocco 2): stessa regola duplicata in save.js
    // migraState — i salvataggi senza i nuovi campi partono a null/0.
    if (!state.valigiaTrig || typeof state.valigiaTrig !== 'object') {
      state.valigiaTrig = { fel: 0, sal: 0, doppio: 0 };
    }
    if (typeof state.valigia === 'undefined') state.valigia = null;
    if (typeof state.petPartito === 'undefined') state.petPartito = null;
    if (typeof state.eventoValigia === 'undefined') state.eventoValigia = null;

    // Migrazione orologio di gioco (fix "sonno + orologio"): i salvataggi che non conoscono
    // ancora state.gameMinutes lo inizializzano dall'ora REALE corrente, per continuita'
    // (v. clock.js inizializzaOrologio/avanzaOrologio).
    if (typeof state.gameMinutes !== 'number' && PETQ.clock && PETQ.clock.inizializzaOrologio) {
      PETQ.clock.inizializzaOrologio(state);
    }

    // Migrazione Talenti (PROTOTIPO 2, Blocco 9): stessa regola duplicata in save.js
    // migraState (v. commento esteso li'). Assegna retroattivamente nascita (+teen se gia'
    // teen) ai salvataggi pre-esistenti che non hanno ancora pet.talenti.
    if (state.pet && !Array.isArray(state.pet.talenti)) {
      state.pet.talenti = [];
      if (PETQ.talenti && typeof PETQ.talenti.estrai === 'function') {
        var talentoNascita = PETQ.talenti.estrai(state.pet.personalita, 'nascita');
        if (talentoNascita) state.pet.talenti.push(talentoNascita);
        if (state.pet.stadio === 'teen') {
          var talentoTeen = PETQ.talenti.estrai(state.pet.personalita, 'teen');
          if (talentoTeen) state.pet.talenti.push(talentoTeen);
        }
      }
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
      controllaCicloSonno(state);
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

  PETQ.main = {
    avviaTicking: avviaTicking,
    migraState: migraState,
    controllaCicloSonno: controllaCicloSonno,
    _migraDispensaAQty: migraDispensaAQty
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
