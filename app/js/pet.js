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

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.pet: bilanciamento non disponibile, uso default locali');
    return {
      decadimento: { fame: 6, igiene: 3, felicita: 2 },
      soglie: { critica: 25, magro: 30, sporco: 30, malusSalute: 40 },
      economia: { login: 10, monetePartenza: 50 },
      allenamento: { sessioni: 1, effetto: 1, felicita: 5 },
      iniziali: { benessere: 70, base: 0, firma: 1 }
    };
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

    var base = (bil.iniziali && typeof bil.iniziali.base === 'number') ? bil.iniziali.base : 0;
    var firmaBonus = (bil.iniziali && typeof bil.iniziali.firma === 'number') ? bil.iniziali.firma : 1;
    var benessere = (bil.iniziali && typeof bil.iniziali.benessere === 'number') ? bil.iniziali.benessere : 70;

    var rpg = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var statNomi = ['forza', 'intelligenza', 'velocita', 'carisma'];
    for (var i = 0; i < statNomi.length; i++) {
      rpg[statNomi[i]] = base + PETQ.rng.randInt(0, 3);
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
        felicita: benessere
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
  var MALUS_CONDIZIONI = {
    fameBassaOre: 6, fameBassaMalus: 15,
    igieneBassaOre: 6, igieneBassaMalus: 15,
    poopSoglia: 2, poopMalus: 10,
    dietaSquilibrataMalus: 10,
    capTotale: 50
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // spawn dei bisogni: probabilità proporzionale alle ore trascorse e ai pasti recenti,
  // target ~2-3 al giorno (12 ore attive tipiche => p/ora tarata per attesa ~2.5/giorno),
  // max state.poop = 3. Numero non presente in bilanciamento.md: default locale.
  var POOP_PER_ORA_BASE = 0.12; // console.warn segnalato sotto, una sola volta per chiamata se serve
  var POOP_BONUS_PER_PASTO = 0.05;

  function applyDecay(pet, gameHours, state) {
    if (!pet || !(gameHours > 0)) {
      if (pet) recomputeSalute(pet, state);
      return;
    }

    var bil = bilanciamento();
    var dec = bil.decadimento || { fame: 6, igiene: 3, felicita: 2 };
    var soglie = bil.soglie || { critica: 25, magro: 30, sporco: 30, malusSalute: 40 };

    pet.stats.fame = clamp(pet.stats.fame - dec.fame * gameHours, 0, 100);
    pet.stats.igiene = clamp(pet.stats.igiene - dec.igiene * gameHours, 0, 100);

    var calofelicita = dec.felicita * gameHours;
    if (pet.stats.fame < soglie.critica || pet.stats.igiene < soglie.critica) {
      calofelicita += 5 * gameHours;
    }
    pet.stats.felicita = clamp(pet.stats.felicita - calofelicita, 0, 100);

    // spawn bisogni (poop)
    if (state) {
      if (typeof state.poop !== 'number') state.poop = 0;
      var pastiRecenti = (state.pet && state.pet.pastiOggi) ? state.pet.pastiOggi.length : 0;
      var probOra = POOP_PER_ORA_BASE + POOP_BONUS_PER_PASTO * pastiRecenti;
      var probEvento = 1 - Math.pow(1 - probOra, gameHours);
      if (state.poop < 3 && PETQ.rng.rand() < probEvento) {
        state.poop = Math.min(3, state.poop + 1);
      }

      // tracking "sotto soglia da quando": serve al malus condizioni (fame/igiene < 25 per 6h+).
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

  window.PETQ.pet = {
    generate: generate,
    applyDecay: applyDecay,
    recomputeSalute: recomputeSalute,
    bodyVariant: bodyVariant,
    guarisciGiorno: guarisciGiorno
  };

})();
