window.PETQ = window.PETQ || {};

(function () {

  // mappa personalità -> stat "firma" (bonus alla nascita); decisione di design
  // presa da content/bilanciamento.md ("Stat iniziali alla generazione"),
  // nerd e maleducato condividono Intelligenza finché il design non li differenzia
  var STAT_FIRMA = {
    gentile: 'carisma',
    maleducato: 'intelligenza',
    nerd: 'intelligenza',
    sportivo: 'forza'
  };

  var PERSONALITA_LIST = ['gentile', 'maleducato', 'nerd', 'sportivo'];
  var SOTTORAZZE_ALIENO = ['blob', 'insettoide', 'rettiliano'];

  var DEFAULT_ENERGIA_SONNO = {
    decadimento: 4,
    costoMissionePerOra: 8,
    costoAllenamento: 10,
    sogliaRifiuto: 20,
    oraLetto: 21,
    oraCrollo: 23,
    sveglioAutonomoOre: 8,
    sonnoMinimoOre: 6,
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
      nascita: Date.now()
    };

    return pet;
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

    // Sonno (GDD "Energia e sonno"): mentre il pet dorme TUTTE le stat sono in pausa,
    // niente decadimento di sorta (stessa regola della "notte" gia' esistente in clock.js,
    // qui estesa esplicitamente al ciclo sonno del pet). Il risveglio lo gestisce
    // controllaSonno/completaSonno, chiamato separatamente dal tick (v. main.js/ui.js).
    if (state && state.sonno) {
      return;
    }

    var bil = bilanciamento();
    var dec = bil.decadimento || { fame: 6, igiene: 8, felicita: 2 };
    var soglie = bil.soglie || { critica: 25, magro: 30, sporco: 30, malusSalute: 40 };
    var es = bilEnergiaSonno();

    pet.stats.fame = clamp(pet.stats.fame - dec.fame * gameHours, 0, 100);
    pet.stats.igiene = clamp(pet.stats.igiene - dec.igiene * gameHours, 0, 100);

    if (typeof pet.stats.energia !== 'number') pet.stats.energia = 70;
    pet.stats.energia = clamp(pet.stats.energia - es.decadimento * gameHours, 0, 100);

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

  // regole soglie da config: media fame bassa -> magro; >5 pasti/giorno o >3 dolci -> ciccione
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

    if (pastiOggi.length > 5 || dolciOggi > 3) return 'ciccione';

    var mediaFame = pet.stats ? pet.stats.fame : 100;
    if (mediaFame < soglieMagro && (pastiOggi.length + pastiIeri.length) < 2) return 'magro';
    if (mediaFame < soglieMagro) return 'magro';

    return 'normale';
  }

  // ==================== Energia e sonno (GDD "Energia e sonno") ====================
  // state.sonno = null | { inizio: msEpoch, aLetto: bool }. Mentre dorme, applyDecay()
  // sopra salta ogni decadimento (tutte le stat in pausa, come da GDD). Le funzioni qui
  // sotto gestiscono l'intero ciclo: avvio (letto o crollo), controllo scadenza (sveglia
  // autonoma a 8h / crollo automatico alle 23), risveglio manuale o automatico.

  function oraLocale(d) {
    return (d || new Date()).getHours();
  }

  // true se il pet puo' rifiutare missione/allenamento per energia bassa (GDD: soglia 20)
  function energiaSottoSoglia(pet) {
    if (!pet || !pet.stats || typeof pet.stats.energia !== 'number') return false;
    var es = bilEnergiaSonno();
    return pet.stats.energia < es.sogliaRifiuto;
  }

  // Avvia il sonno: aLetto=true se portato a letto dal giocatore (drag, dalle 21),
  // aLetto=false se crollo automatico (alle 23, sul posto). Non sovrascrive un sonno gia' in corso.
  function avviaSonno(state, aLetto) {
    if (!state || state.sonno) return false;
    state.sonno = { inizio: Date.now(), aLetto: !!aLetto };
    return true;
  }

  // Crollo automatico (GDD): alle 23 (ora locale), se il pet e' sveglio e non in missione,
  // si addormenta sul posto (aLetto:false) senza intervento del giocatore. Va richiamata dal
  // tick di gioco (pattern controllaMissioneScaduta in ui.js: chiamata periodica, idempotente
  // perche' avviaSonno non fa nulla se state.sonno e' gia' impostato).
  function controllaCrolloAutomatico(state) {
    if (!state || state.sonno || state.missione) return false;
    var es = bilEnergiaSonno();
    if (oraLocale() >= es.oraCrollo) {
      return avviaSonno(state, false);
    }
    return false;
  }

  // Applica gli effetti del risveglio (energia + pulizia stato sonno) e ritorna info per la UI
  // (battuta da mostrare: 'sveglia' se dormito bene, 'dormito_male' altrimenti).
  function risolviRisveglio(state, oreDormite, manuale) {
    var es = bilEnergiaSonno();
    var sonno = state.sonno || { aLetto: false };
    var energiaFinale;
    var battuta;

    if (sonno.aLetto && oreDormite >= es.sonnoMinimoOre) {
      energiaFinale = es.risveglioBuono;
      battuta = 'sveglia';
    } else if (!sonno.aLetto) {
      energiaFinale = es.risveglioCattivo;
      battuta = 'dormito_male';
    } else {
      // a letto ma svegliato manualmente prima della soglia minima: proporzionale, min 30
      // (GDD: "svegliato prima delle 6h -> proporzionale 100*ore/6, min 30")
      var proporzionale = Math.round(100 * (oreDormite / es.sonnoMinimoOre));
      energiaFinale = Math.max(30, Math.min(100, proporzionale));
      battuta = 'dormito_male';
    }

    if (state.pet) {
      state.pet.stats.energia = clamp(energiaFinale, 0, 100);
    }
    state.sonno = null;
    recomputeSalute(state.pet, state);

    return { ok: true, energia: energiaFinale, oreDormite: oreDormite, battuta: battuta, manuale: !!manuale };
  }

  // Sveglia autonoma: controlla se sono passate >=8h dall'inizio del sonno e in tal caso
  // completa il risveglio automaticamente. Va richiamata dal tick/boot (pattern
  // controllaMissioneScaduta). Ritorna il risultato di risolviRisveglio oppure null se non e'
  // ancora ora.
  function controllaSveglia(state) {
    if (!state || !state.sonno) return null;
    var es = bilEnergiaSonno();
    var oreDormite = (Date.now() - state.sonno.inizio) / 3600000;
    if (oreDormite >= es.sveglioAutonomoOre) {
      return risolviRisveglio(state, oreDormite, false);
    }
    return null;
  }

  // Sveglia manuale (tap del giocatore mentre dorme): sempre permessa, l'energia dipende
  // da quante ore ha dormito (v. risolviRisveglio). Ritorna null se non stava dormendo.
  function svegliaManuale(state) {
    if (!state || !state.sonno) return null;
    var oreDormite = (Date.now() - state.sonno.inizio) / 3600000;
    return risolviRisveglio(state, oreDormite, true);
  }

  // Debug: "Salta al mattino" completa il sonno come se avesse dormito 8 ore piene
  // (sveglia autonoma), qualunque sia l'ora reale di inizio.
  function debugSaltaAlMattino(state) {
    if (!state || !state.sonno) return null;
    var es = bilEnergiaSonno();
    return risolviRisveglio(state, es.sveglioAutonomoOre, false);
  }

  window.PETQ.pet = {
    generate: generate,
    applyDecay: applyDecay,
    recomputeSalute: recomputeSalute,
    bodyVariant: bodyVariant,
    guarisciGiorno: guarisciGiorno,
    bilEnergiaSonno: bilEnergiaSonno,
    energiaSottoSoglia: energiaSottoSoglia,
    avviaSonno: avviaSonno,
    controllaCrolloAutomatico: controllaCrolloAutomatico,
    controllaSveglia: controllaSveglia,
    svegliaManuale: svegliaManuale,
    debugSaltaAlMattino: debugSaltaAlMattino,
    _risolviRisveglio: risolviRisveglio
  };

})();
