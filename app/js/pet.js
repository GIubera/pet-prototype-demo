window.PETQ = window.PETQ || {};

(function () {

  // mappa personalità -> stat "firma" (bonus alla nascita); decisione di design
  // presa da content/bilanciamento.md ("Stat iniziali alla generazione").
  // maleducato -> Velocità (decisione fondatore 5 lug 2026, emersa progettando talenti/quest:
  // era Intelligenza, ora differenziato dal nerd che resta Intelligenza).
  var STAT_FIRMA = {
    gentile: 'carisma',
    maleducato: 'velocita',
    nerd: 'intelligenza',
    sportivo: 'forza'
  };

  var PERSONALITA_LIST = ['gentile', 'maleducato', 'nerd', 'sportivo'];
  var SOTTORAZZE_ALIENO = ['blob', 'insettoide', 'rettiliano'];

  // Numeri da content/bilanciamento.md sezione "Energia e sonno" (v1 confermato dal
  // fondatore, 4 lug 2026): riposino (prima delle 21) e sonno notturno (dalle 21) sono due
  // modalita' della stessa azione "dormire", vedi avviaSonno/risolviRisveglio sotto.
  var DEFAULT_ENERGIA_SONNO = {
    decadimento: 2,
    costoMissionePerOra: 8,
    costoAllenamento: 10,
    sogliaRifiuto: 20,
    oraLetto: 21,
    oraCrollo: 23,
    riposinoDurataMax: 2,
    riposinoDurataMin: 1,
    riposinoRecuperoOra: 15,
    sveglioAutonomoOre: 8,     // durata max sonno notturno / sveglia autonoma
    sonnoMinimoOre: 5,         // sonno notturno: minimo di gioco prima di poter svegliare
    risveglioBuono: 100,
    risveglioCattivo: 70
  };

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.pet: bilanciamento non disponibile, uso default locali');
    return {
      decadimento: { fame: 6, igiene: 8, felicita: 2 },
      soglie: { critica: 25, magro: 30, sporco: 30, malusSalute: 40 },
      economia: { login: 10, monetePartenza: 50 },
      allenamento: { sessioni: 1, effetto: 1, felicita: 5 },
      iniziali: { benessere: 70, budget: 3, firma: 1 },
      energia_sonno: DEFAULT_ENERGIA_SONNO
    };
  }

  // bilanciamento.energia_sonno con fallback difensivo campo-per-campo (il bilanciamento
  // caricato potrebbe avere solo alcuni campi risolti dal parser, es. se una riga manca
  // nel file .md): stesso stile difensivo delle altre sezioni di questo modulo.
  function bilEnergiaSonno() {
    var bil = bilanciamento();
    var es = (bil && bil.energia_sonno) || {};
    var out = {};
    for (var k in DEFAULT_ENERGIA_SONNO) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULT_ENERGIA_SONNO, k)) continue;
      out[k] = (typeof es[k] === 'number') ? es[k] : DEFAULT_ENERGIA_SONNO[k];
    }
    return out;
  }

  function generate(razza) {
    var bil = bilanciamento();
    var r = (razza === 'robot') ? 'robot' : 'alieno';
    var sottorazza = (r === 'alieno') ? PETQ.rng.pick(SOTTORAZZE_ALIENO) : null;

    var parts = {
      antenna: PETQ.rng.randInt(0, 2),
      testa: PETQ.rng.randInt(0, 2),
      colore: PETQ.rng.randInt(0, 2)
    };

    var personalita = PETQ.rng.pick(PERSONALITA_LIST);
    var statFirma = STAT_FIRMA[personalita] || 'carisma';

    // Stat iniziali (GDD "Alla nascita", playtest v2): budget FISSO di punti assegnati
    // uno alla volta a stat casuali (possono impilarsi), poi bonus alla stat firma.
    // Totale sempre budget+firma (default 3+1=4): niente tuttofare, identita' = firma + al piu' un picco.
    var budget = (bil.iniziali && typeof bil.iniziali.budget === 'number') ? bil.iniziali.budget : 3;
    var firmaBonus = (bil.iniziali && typeof bil.iniziali.firma === 'number') ? bil.iniziali.firma : 1;
    var benessere = (bil.iniziali && typeof bil.iniziali.benessere === 'number') ? bil.iniziali.benessere : 70;

    var rpg = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var statNomi = ['forza', 'intelligenza', 'velocita', 'carisma'];
    for (var i = 0; i < budget; i++) {
      rpg[PETQ.rng.pick(statNomi)] += 1;
    }
    rpg[statFirma] += firmaBonus;

    var pet = {
      razza: r,
      sottorazza: sottorazza,
      parts: parts,
      personalita: personalita,
      nome: null,
      stadio: 'baby',
      stats: {
        fame: benessere,
        igiene: benessere,
        salute: benessere,
        felicita: benessere,
        energia: benessere
      },
      rpg: rpg,
      pastiOggi: [],
      pastiIeri: [],
      nascita: Date.now(),
      // Evoluzione baby->teen (PROTOTIPO 2, GDD "Ciclo di vita"/PROTOTIPO-2.md punto 1):
      // giorniVita conta i giorni DI GIOCO vissuti (incrementato ad ogni "nuovo giorno", v.
      // care.dailyLogin), non i giorni di calendario reale — cosi' il debug "Nuovo giorno" lo
      // fa avanzare ed e' testabile senza aspettare la mezzanotte vera.
      giorniVita: 0,
      // Talenti (PROTOTIPO 2, Blocco 9, content/talenti.md): array cumulativo, 1 elemento alla
      // nascita + 1 alla evoluzione teen (v. controllaEvoluzione sotto). generate() non riceve
      // `state` (e non ne ha bisogno: PETQ.talenti.estrai legge PETQ.content.data + PETQ.rng,
      // nessuno stato di partita necessario per l'estrazione), percio' l'assegnazione avviene
      // qui direttamente sul pet appena creato.
      talenti: []
    };

    assegnaTalentoNascita(pet);

    return pet;
  }

  // Estrae 1 talento dalla terna 'nascita' della personalita' del pet (pesi 45/45/10, v.
  // talenti.js estrai/_estraiDaTerna) e lo aggiunge a pet.talenti. Guardia difensiva se il
  // modulo PETQ.talenti non e' ancora caricato (ordine script in index.html) o il content non
  // e' pronto: non blocca la creazione del pet, semplicemente il pet nasce senza talenti (si
  // puo' rimediare con "Ri-tira talenti" in debug una volta caricato tutto).
  function assegnaTalentoNascita(pet) {
    if (!pet || !window.PETQ.talenti || typeof PETQ.talenti.estrai !== 'function') {
      console.warn('PETQ.pet: PETQ.talenti non disponibile, il pet nasce senza talento (nascita)');
      return;
    }
    var talento = PETQ.talenti.estrai(pet.personalita, 'nascita');
    if (talento) pet.talenti.push(talento);
  }

  // soglie/valori malus condizioni Salute: da bilanciamento.md sezione "Sistema Salute" ->
  // "Malus condizioni". Il parser di content.js non mappa ancora questi numeri (righe non
  // etichettate in modo univoco per numeroDaEtichetta), quindi qui usiamo i default scritti
  // nel file come fallback fisso, con nota esplicita: se si vuole renderli configurabili va
  // esteso parseBilanciamento in content.js con lo stesso pattern delle altre righe.
  // energiaBassaOre/Malus: punto 8 (aggiunta fondatore) — stesso pattern di fame/igiene basse:
  // lo sfinimento prolungato (Energia < soglia critica per 6h+ di gioco) ammala il pet, una
  // bella dormita lo risana (il risveglio riporta Energia alta -> il malus sparisce da solo).
  var MALUS_CONDIZIONI = {
    fameBassaOre: 6, fameBassaMalus: 15,
    igieneBassaOre: 6, igieneBassaMalus: 15,
    energiaBassaOre: 6, energiaBassaMalus: 15,
    poopSoglia: 2, poopMalus: 10,
    dietaSquilibrataMalus: 10,
    capTotale: 50
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // spawn dei bisogni (ritmo cura, playtest v2 — v. bilanciamento.md "decadimento/note"):
  // legati alla DIGESTIONE: 60-90 minuti di gioco dopo OGNI pasto, spawn quasi garantito
  // (p=0.9, flag digerito sul pasto), piu' un baseline casuale ridotto. Target: con 2 pasti
  // + snack ~3+ bisogni/giorno, "poco dopo mangiato". Max state.poop = 3.
  var POOP_BASE_ORA = 0.05;
  var POOP_PROB_DIGESTIONE = 0.9;
  var DIGESTIONE_ORE_MIN = 1;      // 60 minuti di gioco...
  var DIGESTIONE_ORE_EXTRA = 0.5;  // ...piu' 0-30 casuali (60-90)

  function applyDecay(pet, gameHours, state) {
    if (!pet || !(gameHours > 0)) {
      if (pet) recomputeSalute(pet, state);
      return;
    }

    // Orologio di gioco (fix "sonno + orologio"): avanza SEMPRE con lo stesso delta usato
    // per il decadimento, sonno o non sonno, cosi' il debug ×60/×600 accelera anche l'ora
    // di gioco e si puo' effettivamente arrivare alle 21/23 per testare il ciclo sonno.
    // V. clock.js avanzaOrologio per i dettagli su wrap/migrazione.
    if (state && PETQ.clock && PETQ.clock.avanzaOrologio) {
      PETQ.clock.avanzaOrologio(state, gameHours);
    }

    // Sonno (GDD "Energia e sonno"): mentre il pet dorme TUTTE le stat sono in pausa,
    // niente decadimento di sorta (stessa regola della "notte" gia' esistente in clock.js,
    // qui estesa esplicitamente al ciclo sonno del pet). Il risveglio lo gestisce
    // controllaSonno/completaSonno, chiamato separatamente dal tick (v. main.js/ui.js).
    // Le "ore dormite" si accumulano qui in ore di GIOCO (stesso delta dell'orologio sopra),
    // non ore reali: cosi' anche il sonno risente del moltiplicatore debug.
    if (state && state.sonno) {
      state.sonno.oreDormite = (state.sonno.oreDormite || 0) + gameHours;
      return;
    }

    // Allenamento (bilanciamento.md "Durata allenamento", decisione fondatore: attivita' a
    // tempo, non piu' salto istantaneo): a differenza del sonno, il pet e' SVEGLIO mentre si
    // allena, quindi il decadimento normale delle stat CONTINUA sotto (niente return qui) —
    // accumuliamo solo oreFatte in ore di GIOCO, stesso pattern di state.sonno.oreDormite,
    // cosi' anche l'allenamento e' accelerato dal debug ×60/×600. Il completamento (oreFatte
    // >= oreTot) e' controllato da controllaAllenamentoScaduto, chiamato dal tick/boot come
    // controllaSveglia/controllaMissioneScaduta.
    if (state && state.allenamento) {
      state.allenamento.oreFatte = (state.allenamento.oreFatte || 0) + gameHours;
    }

    var bil = bilanciamento();
    var dec = bil.decadimento || { fame: 6, igiene: 8, felicita: 2 };
    var soglie = bil.soglie || { critica: 25, magro: 30, sporco: 30, malusSalute: 40 };
    var es = bilEnergiaSonno();

    pet.stats.fame = clamp(pet.stats.fame - dec.fame * gameHours, 0, 100);
    pet.stats.igiene = clamp(pet.stats.igiene - dec.igiene * gameHours, 0, 100);

    if (typeof pet.stats.energia !== 'number') pet.stats.energia = 70;
    // Talenti (PROTOTIPO 2, Blocco 9, Gruppo A, "energia_decay=x0.5", Energico): moltiplicatore
    // sul decadimento Energia, letto a runtime dai talenti del pet (1 se nessuno lo tocca).
    // applyDecay riceve `state` solo come parametro opzionale (v. firma sopra: alcuni chiamanti
    // storici passano solo `pet`), quindi la guardia su state e' necessaria.
    var decayMult = (state && PETQ.talenti && PETQ.talenti.energiaDecayMult) ?
      PETQ.talenti.energiaDecayMult(state) : 1;
    pet.stats.energia = clamp(pet.stats.energia - es.decadimento * gameHours * decayMult, 0, 100);

    var calofelicita = dec.felicita * gameHours;
    if (pet.stats.fame < soglie.critica || pet.stats.igiene < soglie.critica) {
      calofelicita += 5 * gameHours;
    }
    if (pet.stats.energia < es.sogliaRifiuto) {
      calofelicita += 1 * gameHours; // GDD: sotto soglia energia, felicita' -1/h extra
    }
    pet.stats.felicita = clamp(pet.stats.felicita - calofelicita, 0, 100);

    // spawn bisogni (poop): digestione dei pasti + baseline
    if (state) {
      if (typeof state.poop !== 'number') state.poop = 0;
      var pasti = (state.pet && state.pet.pastiOggi) || [];
      for (var pi = 0; pi < pasti.length; pi++) {
        var pasto = pasti[pi];
        if (!pasto || pasto.digerito) continue;
        // difese per pasti registrati prima di questa versione (salvataggi vecchi)
        if (typeof pasto.digestioneOre !== 'number') pasto.digestioneOre = DIGESTIONE_ORE_MIN + PETQ.rng.rand() * DIGESTIONE_ORE_EXTRA;
        if (typeof pasto.oreDigerite !== 'number') pasto.oreDigerite = 0;
        pasto.oreDigerite += gameHours;
        if (pasto.oreDigerite >= pasto.digestioneOre) {
          pasto.digerito = true;
          if (state.poop < 3 && PETQ.rng.rand() < POOP_PROB_DIGESTIONE) {
            state.poop = Math.min(3, state.poop + 1);
          }
        }
      }
      var probEvento = 1 - Math.pow(1 - POOP_BASE_ORA, gameHours);
      if (state.poop < 3 && PETQ.rng.rand() < probEvento) {
        state.poop = Math.min(3, state.poop + 1);
      }

      // tracking "sotto soglia da quando": serve al malus condizioni (fame/igiene/energia < 25 per 6h+).
      // Soglia critica riusata da bilanciamento.soglie.critica (stesso valore usato altrove nel prototipo).
      var sogliaMalus = (typeof soglie.critica === 'number') ? soglie.critica : 25;
      if (pet.stats.fame < sogliaMalus) {
        if (typeof state.fameBassaDaMs !== 'number') state.fameBassaDaMs = Date.now();
      } else {
        state.fameBassaDaMs = null;
      }
      if (pet.stats.igiene < sogliaMalus) {
        if (typeof state.igieneBassaDaMs !== 'number') state.igieneBassaDaMs = Date.now();
      } else {
        state.igieneBassaDaMs = null;
      }
      // punto 8 (aggiunta fondatore): energia bassa prolungata ammala il pet, stesso pattern.
      // Una dormita riporta l'Energia sopra soglia -> il tracking si azzera e il malus sparisce.
      if (pet.stats.energia < sogliaMalus) {
        if (typeof state.energiaBassaDaMs !== 'number') state.energiaBassaDaMs = Date.now();
      } else {
        state.energiaBassaDaMs = null;
      }
    }

    recomputeSalute(pet, state);
  }

  // Sistema Salute v1 (bilanciamento.md): Salute = clamp(100 - Ferite - MalusCondizioni, 0, 100).
  // Le Ferite salgono SOLO da eventi espliciti (reward missione "ferite+N", vedi missions.js) e
  // scendono con la guarigione naturale (guarisciGiorno) o l'infermeria (care.cura). Rimossa la
  // vecchia media pesata dieta/pulizia/eventi: non piu' usata.
  function recomputeSalute(pet, state) {
    if (!pet) return;
    var ferite = (state && typeof state.ferite === 'number') ? state.ferite : 0;
    var malus = malusCondizioni(pet, state);
    pet.stats.salute = clamp(100 - ferite - malus, 0, 100);
  }

  function malusCondizioni(pet, state) {
    if (!state) return 0;
    var m = 0;
    var oraMs = Date.now();

    if (typeof state.fameBassaDaMs === 'number' &&
        (oraMs - state.fameBassaDaMs) >= MALUS_CONDIZIONI.fameBassaOre * 3600000) {
      m += MALUS_CONDIZIONI.fameBassaMalus;
    }
    if (typeof state.igieneBassaDaMs === 'number' &&
        (oraMs - state.igieneBassaDaMs) >= MALUS_CONDIZIONI.igieneBassaOre * 3600000) {
      m += MALUS_CONDIZIONI.igieneBassaMalus;
    }
    if (typeof state.energiaBassaDaMs === 'number' &&
        (oraMs - state.energiaBassaDaMs) >= MALUS_CONDIZIONI.energiaBassaOre * 3600000) {
      m += MALUS_CONDIZIONI.energiaBassaMalus;
    }
    if (typeof state.poop === 'number' && state.poop >= MALUS_CONDIZIONI.poopSoglia) {
      m += MALUS_CONDIZIONI.poopMalus;
    }
    if (dietaSquilibrata(pet)) {
      m += MALUS_CONDIZIONI.dietaSquilibrataMalus;
    }

    return Math.min(m, MALUS_CONDIZIONI.capTotale);
  }

  // dieta squilibrata: negli ultimi 2 giorni (pastiOggi + pastiIeri) tutte le categorie mangiate
  // sono uguali, oppure sono tutte 'dolce'. Se non ci sono pasti sufficienti per giudicare, niente malus.
  function dietaSquilibrata(pet) {
    if (!pet) return false;
    var pasti = [].concat(pet.pastiOggi || [], pet.pastiIeri || []);
    if (pasti.length < 2) return false;

    var categorie = {};
    for (var i = 0; i < pasti.length; i++) {
      if (pasti[i] && pasti[i].categoria) categorie[pasti[i].categoria] = true;
    }
    var elenco = Object.keys(categorie);
    if (elenco.length === 0) return false;
    if (elenco.length === 1) return true; // monocategoria (dolce o no)

    return false;
  }

  // Guarigione naturale: -5 Ferite al primo accesso del giorno. Chiamata da PETQ.care.dailyLogin
  // (e' li' che si gestisce gia' il concetto di "nuovo giorno" nel prototipo).
  function guarisciGiorno(state) {
    if (!state) return;
    if (typeof state.ferite !== 'number') state.ferite = 0;
    state.ferite = clamp(state.ferite - 5, 0, 100);
  }

  // Soglie ciccione PER STADIO (bilanciamento.md "Soglie" -> "Variante ciccione", PROTOTIPO 2
  // punto 1: il ciccione esisteva gia' negli sprite ma non appariva mai perche' in P1 il pet
  // era sempre baby, e la regola era "mai baby"). Ora che il teen esiste diventa raggiungibile,
  // ma DEVE essere difficile da teen (decisione fondatore) e piu' facile da adulto (P3, non
  // implementato qui: struttura pronta, manca solo la voce 'adulto' quando arrivera' lo stadio).
  // baby: 'mai' (nessuna soglia rende ciccione un baby, coerente col GDD "aspetto dinamico").
  var SOGLIE_CICCIONE_PER_STADIO = {
    teen: {
      pastiGiornoSoglia: 8,           // >8 pasti/giorno (era >5 nel vecchio valore unico)
      dolciGiornoSoglia: 6,           // >6 dolci/giorno (era >3)
      sovralimentazioniSoglia: 4      // >=4 sovralimentazioni recenti cumulative (era >=2)
    }
    // adulto: P3 — soglie piu' basse (piu' facile), da tarare quando arriva lo stadio adulto.
  };

  // regole soglie da config: media fame bassa -> magro; ciccione per-stadio (mai da baby,
  // difficile da teen, v. SOGLIE_CICCIONE_PER_STADIO sopra).
  function bodyVariant(pet) {
    if (!pet) return 'normale';
    var bil = bilanciamento();
    var soglieMagro = (bil.soglie && typeof bil.soglie.magro === 'number') ? bil.soglie.magro : 30;

    var pastiOggi = pet.pastiOggi || [];
    var pastiIeri = pet.pastiIeri || [];

    var dolciOggi = 0;
    for (var i = 0; i < pastiOggi.length; i++) {
      if (pastiOggi[i] && pastiOggi[i].categoria === 'dolce') dolciOggi++;
    }

    // Mai ciccione da baby (GDD "Aspetto dinamico": "NON da baby, il cucciolo non ingrassa
    // così"): la variante ciccione esiste solo dallo stadio teen in su.
    var soglieCiccione = pet.stadio && SOGLIE_CICCIONE_PER_STADIO[pet.stadio];
    if (soglieCiccione &&
        (pastiOggi.length > soglieCiccione.pastiGiornoSoglia ||
         dolciOggi > soglieCiccione.dolciGiornoSoglia ||
         (pet.sovralimentazioniRecenti || 0) >= soglieCiccione.sovralimentazioniSoglia)) {
      return 'ciccione';
    }

    var mediaFame = pet.stats ? pet.stats.fame : 100;
    if (mediaFame < soglieMagro && (pastiOggi.length + pastiIeri.length) < 2) return 'magro';
    if (mediaFame < soglieMagro) return 'magro';

    return 'normale';
  }

  // ==================== Evoluzione baby->teen (PROTOTIPO 2, punto 1) ====================
  // Trigger (docs/PROTOTIPO-2.md "SCOPE P2 CORRETTO" punto 1, design vincolante): baby dura 5
  // giorni DI GIOCO -> diventa teen. I "giorni di gioco" sono pet.giorniVita, incrementato in
  // care.dailyLogin ad ogni "nuovo giorno" (login giornaliero reale O debug "Nuovo giorno":
  // stesso aggancio, cosi' il fondatore puo' testare senza aspettare 5 giorni di calendario).
  // [teen->adulto (10 giorni) = P3, NON qui.]
  var GIORNI_EVOLUZIONE_TEEN = 5;

  // Controlla se il pet deve evolvere (baby -> teen). Ritorna true e MUTA pet.stadio se la
  // condizione e' soddisfatta, altrimenti false e non tocca nulla. Va richiamata dopo ogni
  // avanzamento di giorniVita (v. care.dailyLogin) e dal tick/boot (stesso pattern idempotente
  // di controllaSveglia/controllaCrolloAutomatico sopra), cosi' la UI puo' intercettarla e
  // mostrare la schermata dedicata (v. ui.js controllaEvoluzioneScaduta).
  //
  // TODO (da decidere col fondatore): l'evoluzione oggi NON modifica le statistiche (benessere
  // né RPG) — solo stadio + aspetto (bodyVariant ora vede 'teen') + battuta. Se in futuro si
  // vuole un bonus/malus all'evoluzione (es. +1 RPG, reset piccolo benessere, ecc.) va applicato
  // QUI, subito dopo il cambio stadio, con una sezione dedicata in bilanciamento.md.
  function controllaEvoluzione(pet) {
    if (!pet || pet.stadio !== 'baby') return false;
    var giorni = (typeof pet.giorniVita === 'number') ? pet.giorniVita : 0;
    if (giorni < GIORNI_EVOLUZIONE_TEEN) return false;

    pet.stadio = 'teen';
    // TODO stat evoluzione: nessuna modifica a pet.stats/pet.rpg per ora (solo stadio+aspetto
    // +battuta, v. commento sopra). Lasciato volutamente senza codice fino a decisione fondatore.

    // Talenti (PROTOTIPO 2, Blocco 9): all'evoluzione teen si estrae 1 talento dalla terna
    // 'teen' della personalita' e si AGGIUNGE (cumulativo) a pet.talenti, che gia' contiene il
    // talento-nascita: un teen ha sempre 2 talenti attivi insieme (v. talenti.md "Cumulativi").
    if (!Array.isArray(pet.talenti)) pet.talenti = [];
    if (window.PETQ.talenti && typeof PETQ.talenti.estrai === 'function') {
      var talentoTeen = PETQ.talenti.estrai(pet.personalita, 'teen');
      if (talentoTeen) pet.talenti.push(talentoTeen);
    } else {
      console.warn('PETQ.pet: PETQ.talenti non disponibile, evoluzione senza talento teen');
    }

    return true;
  }

  // Debug "Ri-tira talenti" (v. ui.js pannello ?debug): ri-estrae DA CAPO i talenti del pet
  // rispettando lo stadio attuale — 1 (nascita) se baby, 2 (nascita+teen) se teen — cosi' si
  // possono provare combinazioni diverse senza dover far rinascere/evolvere il pet daccapo.
  // Sostituisce interamente pet.talenti (non aggiunge alle estrazioni precedenti).
  function ritiraTalenti(pet) {
    if (!pet || !window.PETQ.talenti || typeof PETQ.talenti.estrai !== 'function') return false;
    var nuovi = [];
    var nascita = PETQ.talenti.estrai(pet.personalita, 'nascita');
    if (nascita) nuovi.push(nascita);
    if (pet.stadio === 'teen') {
      var teen = PETQ.talenti.estrai(pet.personalita, 'teen');
      if (teen) nuovi.push(teen);
    }
    pet.talenti = nuovi;
    return true;
  }

  // ==================== Energia e sonno (GDD "Energia e sonno") ====================
  // state.sonno = null | { modalita: 'riposino'|'notturno', aLetto: bool, oreDormite: number }.
  // "Dormire" e' un unico gesto (drag sul letto) con due modalita' a seconda dell'OROLOGIO DI
  // GIOCO (state.gameMinutes, v. clock.js) al momento del drag: prima delle 21 -> riposino
  // (max 2h, +15 Energia/ora); dalle 21 -> sonno notturno (max 8h, Energia 100 al risveglio
  // pieno). Il crollo automatico (chi non va a letto entro le 23) e' sempre notturno.
  // Mentre dorme, applyDecay() sopra salta il decadimento delle stat MA accumula
  // state.sonno.oreDormite in ore di GIOCO (stesso delta del debug ×60/×600, cosi' anche il
  // sonno e' accelerabile). Le funzioni qui sotto gestiscono l'intero ciclo: avvio
  // (letto o crollo), controllo scadenza (sveglia autonoma / crollo automatico), risveglio
  // manuale o automatico.

  // true se il pet puo' rifiutare missione/allenamento per energia bassa (GDD: soglia 20)
  function energiaSottoSoglia(pet) {
    if (!pet || !pet.stats || typeof pet.stats.energia !== 'number') return false;
    var es = bilEnergiaSonno();
    return pet.stats.energia < es.sogliaRifiuto;
  }

  // Modalita' di sonno in base all'orologio DI GIOCO al momento del drag (GDD: prima delle
  // 21 -> riposino, dalle 21 -> notturno). Esposta per la UI (per decidere quale hint/testo
  // mostrare prima ancora di avviare il sonno).
  function modalitaSonnoOra(state) {
    var es = bilEnergiaSonno();
    var og = PETQ.clock ? PETQ.clock.oraGioco(state) : { ore: 0 };
    return (og.ore >= es.oraLetto) ? 'notturno' : 'riposino';
  }

  // Avvia il sonno: aLetto=true se portato a letto dal giocatore (drag), aLetto=false se
  // crollo automatico (alle 23, sul posto). La modalita' (riposino/notturno) si decide qui
  // in base all'orologio di gioco corrente: il crollo e' sempre notturno (e' un crollo
  // serale, non un pisolino). Non sovrascrive un sonno gia' in corso.
  function avviaSonno(state, aLetto) {
    if (!state || state.sonno) return false;
    var modalita = aLetto ? modalitaSonnoOra(state) : 'notturno';
    state.sonno = { modalita: modalita, aLetto: !!aLetto, oreDormite: 0 };
    return true;
  }

  // Crollo automatico (GDD): quando l'orologio DI GIOCO raggiunge le 23, se il pet e' sveglio
  // e non in missione, si addormenta sul posto (aLetto:false) senza intervento del giocatore.
  // Va richiamata dal tick di gioco (pattern controllaMissioneScaduta in ui.js: chiamata
  // periodica, idempotente perche' avviaSonno non fa nulla se state.sonno e' gia' impostato).
  function controllaCrolloAutomatico(state) {
    if (!state || state.sonno || state.missione || state.allenamento) return false;
    var es = bilEnergiaSonno();
    var og = PETQ.clock ? PETQ.clock.oraGioco(state) : { ore: 0 };
    if (og.ore >= es.oraCrollo) {
      return avviaSonno(state, false);
    }
    return false;
  }

  // Applica gli effetti del risveglio (energia + pulizia stato sonno) e ritorna info per la UI
  // (battuta da mostrare: 'sveglia' se dormito bene, 'dormito_male' altrimenti).
  function risolviRisveglio(state, oreDormite, manuale) {
    var es = bilEnergiaSonno();
    var sonno = state.sonno || { modalita: 'notturno', aLetto: false };
    var energiaPre = (state.pet && typeof state.pet.stats.energia === 'number') ? state.pet.stats.energia : 0;
    var energiaFinale;
    var battuta;

    if (!sonno.aLetto) {
      // crollato sul posto (mai andato a letto entro le 23): dormita scomoda, sempre lo
      // stesso esito indipendentemente da quanto e' durata (GDD: Energia 70).
      energiaFinale = es.risveglioCattivo;
      battuta = 'dormito_male';
    } else if (sonno.modalita === 'riposino') {
      // riposino: +15 Energia/ora dormita fino al cap di durata (2h piene = +30), qualunque
      // sia il momento della sveglia (non c'e' "soglia minima" per l'esito, solo per il
      // TASTO sveglia - v. eseguiSveglia in ui.js che blocca il tap prima di riposinoDurataMin).
      var oreEff = Math.min(oreDormite, es.riposinoDurataMax);
      energiaFinale = energiaPre + es.riposinoRecuperoOra * oreEff;
      battuta = (oreDormite >= es.riposinoDurataMax) ? 'sveglia' : 'dormito_male';
    } else if (oreDormite >= es.sonnoMinimoOre) {
      // sonno notturno, dormito almeno il minimo: energia piena (o proporzionale se
      // svegliato dopo il minimo ma prima del pieno di 8h)
      var frazioneNotte = Math.min(1, oreDormite / es.sveglioAutonomoOre);
      energiaFinale = Math.max(energiaPre, Math.round(es.risveglioBuono * frazioneNotte));
      battuta = 'sveglia';
    } else {
      // notturno svegliato prima del minimo (non dovrebbe accadere: il tasto Sveglia lo
      // blocca in ui.js, ma il debug "salta sonno" e altri automatismi possono comunque
      // arrivare qui): proporzionale alle ore dormite, mai sotto l'energia pre-sonno.
      var proporzionale = Math.round(es.risveglioBuono * (oreDormite / es.sonnoMinimoOre));
      energiaFinale = Math.max(energiaPre, proporzionale);
      battuta = 'dormito_male';
    }

    if (state.pet) {
      state.pet.stats.energia = clamp(energiaFinale, 0, 100);
    }
    state.sonno = null;
    recomputeSalute(state.pet, state);

    return { ok: true, energia: energiaFinale, oreDormite: oreDormite, battuta: battuta, manuale: !!manuale };
  }

  // Sveglia autonoma: controlla se il sonno ha raggiunto la sua durata massima (riposino:
  // riposinoDurataMax; notturno: sveglioAutonomoOre) e in tal caso completa il risveglio
  // automaticamente. Va richiamata dal tick/boot (pattern controllaMissioneScaduta).
  // Ritorna il risultato di risolviRisveglio oppure null se non e' ancora ora.
  function controllaSveglia(state) {
    if (!state || !state.sonno) return null;
    var es = bilEnergiaSonno();
    var oreDormite = state.sonno.oreDormite || 0;
    var durataMax = (state.sonno.modalita === 'riposino') ? es.riposinoDurataMax : es.sveglioAutonomoOre;
    if (oreDormite >= durataMax) {
      return risolviRisveglio(state, oreDormite, false);
    }
    return null;
  }

  // Sveglia manuale (tap/bottone del giocatore mentre dorme): l'energia dipende da quante
  // ore ha dormito (v. risolviRisveglio). Il rispetto dei minimi (riposino 1h, notturno 5h)
  // e' responsabilita' del chiamante (ui.js puoSvegliare/eseguiSveglia): questa funzione
  // esegue sempre la sveglia se richiamata. Ritorna null se non stava dormendo.
  function svegliaManuale(state) {
    if (!state || !state.sonno) return null;
    var oreDormite = state.sonno.oreDormite || 0;
    return risolviRisveglio(state, oreDormite, true);
  }

  // Puo' il giocatore svegliare ORA il pet col tasto Sveglia? (GDD: riposino non svegliabile
  // prima di 1h di gioco dormita, notturno prima di 5h). Ritorna {puo:bool, minutiMancanti}.
  function puoSvegliare(state) {
    if (!state || !state.sonno) return { puo: false, minutiMancanti: 0 };
    var es = bilEnergiaSonno();
    var oreDormite = state.sonno.oreDormite || 0;
    var minimo = (state.sonno.modalita === 'riposino') ? es.riposinoDurataMin : es.sonnoMinimoOre;
    if (oreDormite >= minimo) return { puo: true, minutiMancanti: 0 };
    var mancanti = Math.max(0, Math.ceil((minimo - oreDormite) * 60));
    return { puo: false, minutiMancanti: mancanti };
  }

  // Debug: "Salta sonno" completa il sonno corrente come se avesse dormito la sua durata
  // massima (riposino: 2h piene; notturno: 8h piene / sveglia autonoma), qualunque sia
  // l'orologio di gioco al momento dell'avvio. Se non sta dormendo non fa nulla.
  function debugSaltaAlMattino(state) {
    if (!state || !state.sonno) return null;
    var es = bilEnergiaSonno();
    var durataMax = (state.sonno.modalita === 'riposino') ? es.riposinoDurataMax : es.sveglioAutonomoOre;
    return risolviRisveglio(state, durataMax, false);
  }

  // ==================== Allenamento a tempo (bilanciamento.md "Allenamento") ====================
  // state.allenamento = null | { stat, oreFatte, oreTot }. Avviato da PETQ.care.train (che
  // NON applica piu' subito l'effetto), avanzato in ore di GIOCO da applyDecay sopra (stesso
  // pattern di state.sonno.oreDormite). Quando oreFatte >= oreTot il completamento applica
  // effetto/felicita'/energia UNA SOLA VOLTA tramite PETQ.care.completaAllenamento e azzera lo
  // stato — v. controllaAllenamentoScaduto, richiamata dal tick/boot esattamente come
  // controllaSveglia/controllaMissioneScaduta (v. ui.js).
  //
  // Nota di design (documentata qui come richiesto): il crollo automatico delle 23 NON
  // interrompe un allenamento in corso. Il pet si sta allenando da SVEGLIO (non e' a dormire),
  // quindi a differenza della missione (che e' fuori casa) lasciamo che l'allenamento finisca
  // per conto suo; controllaCrolloAutomatico sopra gia' si astiene se c'e' una missione, e qui
  // estendiamo la stessa astensione al caso allenamento cosi' il pet non "salta" a dormire a
  // meta' sessione — finita l'attivita' (anche oltre le 23, il gioco di gioco prosegue) il
  // primo tick libero lo mettera' comunque a nanna al prossimo controllo se e' ancora tardi.
  function controllaAllenamentoScaduto(state) {
    if (!state || !state.allenamento) return null;
    var a = state.allenamento;
    if ((a.oreFatte || 0) < a.oreTot) return null;
    if (!PETQ.care || typeof PETQ.care.completaAllenamento !== 'function') return null;
    return PETQ.care.completaAllenamento(state);
  }

  window.PETQ.pet = {
    generate: generate,
    applyDecay: applyDecay,
    recomputeSalute: recomputeSalute,
    bodyVariant: bodyVariant,
    guarisciGiorno: guarisciGiorno,
    bilEnergiaSonno: bilEnergiaSonno,
    energiaSottoSoglia: energiaSottoSoglia,
    modalitaSonnoOra: modalitaSonnoOra,
    avviaSonno: avviaSonno,
    controllaCrolloAutomatico: controllaCrolloAutomatico,
    controllaSveglia: controllaSveglia,
    svegliaManuale: svegliaManuale,
    puoSvegliare: puoSvegliare,
    debugSaltaAlMattino: debugSaltaAlMattino,
    controllaAllenamentoScaduto: controllaAllenamentoScaduto,
    controllaEvoluzione: controllaEvoluzione,
    ritiraTalenti: ritiraTalenti,
    _risolviRisveglio: risolviRisveglio,
    _giorniEvoluzioneTeen: GIORNI_EVOLUZIONE_TEEN,
    _soglieCiccionePerStadio: SOGLIE_CICCIONE_PER_STADIO
  };

})();
