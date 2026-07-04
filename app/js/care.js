window.PETQ = window.PETQ || {};

(function () {

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.care: bilanciamento non disponibile, uso default locali');
    return {
      decadimento: { fame: 6, igiene: 8, felicita: 2 },
      soglie: { critica: 25, magro: 30, sporco: 30, malusSalute: 40, sovralimentazione: 90 },
      economia: { login: 10, monetePartenza: 50 },
      allenamento: { sessioni: 1, effetto: 1, felicita: 5 },
      iniziali: { benessere: 70, base: 5, firma: 3 }
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function oggiStr() {
    var d = new Date();
    var mese = String(d.getMonth() + 1).padStart(2, '0');
    var giorno = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mese + '-' + giorno;
  }

  // Inventario/frigo (GDD "Economia" -> "Spesa e dispensa"): state.dispensa e' un array di
  // {nome, qty}. Decrementa di 1 la qty del cibo indicato; se arriva a 0 la voce sparisce
  // dal frigo. Ritorna true se ha trovato e consumato una porzione, false altrimenti (frigo
  // vuoto per quel cibo: il chiamante decide come reagire, v. feed sotto).
  function consumaDaDispensa(state, nomeCibo) {
    if (!state || !Array.isArray(state.dispensa)) return false;
    for (var i = 0; i < state.dispensa.length; i++) {
      if (state.dispensa[i].nome === nomeCibo) {
        state.dispensa[i].qty = (state.dispensa[i].qty || 0) - 1;
        if (state.dispensa[i].qty <= 0) state.dispensa.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  // Soglia sovralimentazione (bilanciamento.md "Soglie"): dare da mangiare quando la Fame e'
  // GIA' ALTA (>= 90) e' "mangiare troppo": contribuisce alla variante ciccione (v. pet.js
  // bodyVariant, contatore state.pet.sovralimentazioniRecenti) e infligge +10 Ferite (sistema
  // Ferite esistente, stesso meccanismo dei danni missione). ECCEZIONE: il baby non ne risente
  // (ne' ciccione ne' ferite) — decisione fondatore, il baby non ingrassa e non si ammala cosi'.
  var SOGLIA_SOVRALIMENTAZIONE_DEFAULT = 90;
  var FERITE_SOVRALIMENTAZIONE = 10;

  function sogliaSovralimentazione() {
    var bil = bilanciamento();
    var v = bil.soglie && bil.soglie.sovralimentazione;
    return (typeof v === 'number') ? v : SOGLIA_SOVRALIMENTAZIONE_DEFAULT;
  }

  // Feed: il pagamento avviene allo SHOP (GDD "Spesa e dispensa"), non qui. feed() consuma
  // 1 porzione dall'inventario (state.dispensa) e applica gli effetti; niente scalo monete.
  // cibo = {nome, categoria, fame, stat, statNome} (v. content.js parseCibi / ciboFallback in ui.js).
  function feed(state, cibo) {
    if (!state || !state.pet || !cibo) return { ok: false, msg: 'errore interno' };

    if (!consumaDaDispensa(state, cibo.nome)) {
      return { ok: false, msg: 'Non ne hai in frigo: compralo al Negozio.' };
    }

    var pet = state.pet;
    var famePrima = pet.stats.fame;
    pet.stats.fame = clamp(pet.stats.fame + (cibo.fame || 0), 0, 100);

    // Pacing stat RPG (bilanciamento.md): il bonus stat del cibo scatta solo per il PRIMO
    // pasto del giorno di quella categoria (la dieta varia premia, lo spam no). Il bonus
    // fame invece si applica sempre (comportamento invariato, vedi sopra).
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];
    var primaVoltaOggi = cibo.categoria && state.categoriePastiOggi.indexOf(cibo.categoria) === -1;
    if (primaVoltaOggi) {
      if (cibo.statNome && pet.rpg && typeof pet.rpg[cibo.statNome] === 'number') {
        pet.rpg[cibo.statNome] += (cibo.stat || 0);
      }
      state.categoriePastiOggi.push(cibo.categoria);
    }

    if (!pet.pastiOggi) pet.pastiOggi = [];
    // digestioneOre: 60-90 minuti di GIOCO dopo il pasto scatta il bisogno
    // (v. pet.js applyDecay, ritmo cura playtest v2)
    pet.pastiOggi.push({
      nome: cibo.nome, categoria: cibo.categoria, quando: Date.now(),
      digerito: false, oreDigerite: 0,
      digestioneOre: 1 + PETQ.rng.rand() * 0.5
    });

    // Sovralimentazione (bilanciamento.md "Soglie"): scatta se la Fame era GIA' >= soglia
    // PRIMA di questo pasto (mangiare quando si e' gia' pieni), mai per il baby.
    var eBaby = pet.stadio === 'baby';
    var sovralimentato = !eBaby && famePrima >= sogliaSovralimentazione();
    if (sovralimentato) {
      pet.sovralimentazioniRecenti = (pet.sovralimentazioniRecenti || 0) + 1;
      state.ferite = clamp((state.ferite || 0) + FERITE_SOVRALIMENTAZIONE, 0, 100);
    }

    PETQ.pet.recomputeSalute(pet, state);

    var msg = (pet.nome || 'Il pet') + ' ha mangiato: ' + cibo.nome + '.';
    return { ok: true, msg: msg, sovralimentato: sovralimentato };
  }

  function wash(state) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    state.pet.stats.igiene = 100;
    PETQ.pet.recomputeSalute(state.pet, state);
    return { ok: true, msg: 'Pulito e profumato.' };
  }

  function cleanPoop(state) {
    if (!state) return { ok: false, msg: 'errore interno' };
    state.poop = 0;
    if (state.pet) {
      state.pet.stats.felicita = clamp(state.pet.stats.felicita + 3, 0, 100);
      PETQ.pet.recomputeSalute(state.pet, state);
    }
    return { ok: true, msg: 'Casa pulita.' };
  }

  // Coccola: felicità+3, max 5 al giorno. Numero max/giorno non specificato altrove
  // nella config: tracciato in state.coccoleDay/state.coccoleCount (default locale, segnalato).
  var COCCOLA_EFFETTO = 3;
  var COCCOLA_MAX_DIE = 5;

  function coccola(state) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    var oggi = oggiStr();
    if (state.coccoleDay !== oggi) {
      state.coccoleDay = oggi;
      state.coccoleCount = 0;
    }
    if ((state.coccoleCount || 0) >= COCCOLA_MAX_DIE) {
      // Cap raggiunto (GDD "Coccole" / bilanciamento playtest 4 lug 2026): battuta di
      // personalita' dedicata (pool 'coccole_finite', testi del socio) invece del messaggio
      // generico. msg resta come fallback per la UI se il pool risulta vuoto (v. ui.js
      // eseguiCoccola, stesso pattern di battutaPool gia' usato da care.train per 'sonno').
      return { ok: false, msg: 'Basta coccole per oggi, torna domani.', battutaPool: 'coccole_finite' };
    }
    state.coccoleCount = (state.coccoleCount || 0) + 1;
    state.pet.stats.felicita = clamp(state.pet.stats.felicita + COCCOLA_EFFETTO, 0, 100);
    PETQ.pet.recomputeSalute(state.pet, state);
    return { ok: true, msg: 'Coccola fatta.' };
  }

  // Durata allenamento (bilanciamento.md "Allenamento", playtest 4 lug 2026): non e' piu'
  // istantaneo, "dura" 90 minuti di gioco. L'orologio di gioco avanza di 1.5h e il decadimento
  // normale (fame/igiene/felicita'/energia, spawn bisogni, malus condizioni) si applica per
  // quell'intervallo, esattamente come una piccola missione domestica — v. PETQ.pet.applyDecay
  // (che gia' include l'avanzamento orologio, v. clock.js avanzaOrologio). Se l'avanzamento fa
  // scattare un nuovo giorno o l'ora del crollo/sonno, applyDecay/controllaCrolloAutomatico lo
  // gestiscono con lo stesso meccanismo del tick normale (chiamato da ui.js dopoAzione).
  var DURATA_ALLENAMENTO_ORE = 1.5;

  function train(state, statNome) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    if (state.sonno) {
      return { ok: false, msg: (state.pet.nome || 'Il pet') + ' sta dormendo.' };
    }
    var oggi = oggiStr();
    if (state.trainDay === oggi) {
      return { ok: false, msg: 'Allenamento già fatto oggi.' };
    }
    if (!state.pet.rpg || typeof state.pet.rpg[statNome] !== 'number') {
      return { ok: false, msg: 'Statistica non valida.' };
    }
    if (PETQ.pet.energiaSottoSoglia(state.pet)) {
      return { ok: false, msg: 'Troppo stanco per allenarsi.', battutaPool: 'sonno' };
    }

    var bil = bilanciamento();
    var effetto = (bil.allenamento && typeof bil.allenamento.effetto === 'number') ? bil.allenamento.effetto : 1;
    var felicitaBonus = (bil.allenamento && typeof bil.allenamento.felicita === 'number') ? bil.allenamento.felicita : 5;
    var es = PETQ.pet.bilEnergiaSonno();

    if (PETQ.arredi && PETQ.arredi.bonusAllenamento) {
      effetto += PETQ.arredi.bonusAllenamento(state, statNome);
    }

    state.pet.rpg[statNome] += effetto;
    state.pet.stats.felicita = clamp(state.pet.stats.felicita + felicitaBonus, 0, 100);
    state.pet.stats.energia = clamp(state.pet.stats.energia - es.costoAllenamento, 0, 100);
    state.trainDay = oggi;

    // Avanza l'orologio di gioco di 90 minuti e applica il decadimento normale per
    // quell'intervallo (fame/igiene/felicita'/energia calano come per il tempo passato in
    // una missione breve). applyDecay chiama gia' recomputeSalute al suo interno.
    if (PETQ.pet.applyDecay) {
      PETQ.pet.applyDecay(state.pet, DURATA_ALLENAMENTO_ORE, state);
    } else {
      PETQ.pet.recomputeSalute(state.pet, state);
    }

    // minutiAvanzati esposto per la UI (toast "N minuti di allenamento", GDD/bilanciamento.md
    // "Durata allenamento"): cosi' il numero mostrato viene sempre da questa unica costante,
    // mai duplicato a mano in ui.js.
    return {
      ok: true,
      msg: 'Allenamento completato: +' + effetto + ' ' + statNome + '.',
      minutiAvanzati: Math.round(DURATA_ALLENAMENTO_ORE * 60)
    };
  }

  function teachWord(state, parola) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    var oggi = oggiStr();
    if (state.wordDay === oggi) {
      return { ok: false, msg: 'Parola già insegnata oggi.' };
    }
    var pulita = (parola || '').trim();
    if (pulita === '') {
      return { ok: false, msg: 'Scrivi una parola valida.' };
    }

    var bil = bilanciamento();
    var felicitaBonus = (bil.allenamento && typeof bil.allenamento.felicita === 'number') ? bil.allenamento.felicita : 5;

    if (!state.parole) state.parole = [];
    state.parole.push(pulita);
    state.pet.stats.felicita = clamp(state.pet.stats.felicita + felicitaBonus, 0, 100);
    state.wordDay = oggi;
    PETQ.pet.recomputeSalute(state.pet, state);

    return { ok: true, msg: (state.pet.nome || 'Il pet') + ' ha imparato: ' + pulita + '.' };
  }

  function dailyLogin(state) {
    if (!state) return 0;
    var oggi = oggiStr();
    if (state.lastLoginDay === oggi) return 0;

    var bil = bilanciamento();
    var bonus = (bil.economia && typeof bil.economia.login === 'number') ? bil.economia.login : 10;

    state.coins = (state.coins || 0) + bonus;
    state.lastLoginDay = oggi;

    // nuovo giorno: pasti di oggi diventano pasti di ieri, si azzera il contatore giornaliero
    if (state.pet) {
      state.pet.pastiIeri = state.pet.pastiOggi || [];
      state.pet.pastiOggi = [];
    }

    // nuovo giorno: azzera i contatori giornalieri del pacing cibo/cure, guarigione naturale ferite
    state.categoriePastiOggi = [];
    state.cureOggi = 0;
    if (PETQ.pet && typeof PETQ.pet.guarisciGiorno === 'function') {
      PETQ.pet.guarisciGiorno(state);
    }

    // nuovo giorno: scadono gli arredi temporanei (es. "il topo come allenatore per 7 giorni",
    // M7 Intimidazione) il cui scadenzaMs e' superato
    if (PETQ.arredi && typeof PETQ.arredi.scadiTemporanei === 'function') {
      PETQ.arredi.scadiTemporanei(state);
    }

    return bonus;
  }

  // Infermeria (bagno): costo 15 monete, -30 Ferite, max 2 cure/giorno. Questi 3 numeri non
  // sono ancora mappati in parseBilanciamento (content.js) percio' per ora sono hardcoded qui
  // con default espliciti; se si vuole renderli configurabili va esteso parseBilanciamento con
  // lo stesso pattern delle altre righe (es. numeroDaEtichetta('infermeria', ...)).
  var CURA_COSTO = 15;
  var CURA_FERITE_RIDOTTE = 30;
  var CURA_MAX_DIE = 2;

  function cura(state) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    if (typeof state.ferite !== 'number') state.ferite = 0;

    var oggi = oggiStr();
    if (state.cureDay !== oggi) {
      state.cureDay = oggi;
      state.cureOggi = 0;
    }

    if (state.ferite <= 0) {
      return { ok: false, msg: 'Sta benone, non serve curarlo.' };
    }
    if ((state.cureOggi || 0) >= CURA_MAX_DIE) {
      return { ok: false, msg: 'Cure di oggi esaurite, torna domani.' };
    }
    if ((state.coins || 0) < CURA_COSTO) {
      return { ok: false, msg: 'Monete insufficienti.' };
    }

    state.coins -= CURA_COSTO;
    state.ferite = clamp(state.ferite - CURA_FERITE_RIDOTTE, 0, 100);
    state.cureOggi = (state.cureOggi || 0) + 1;
    PETQ.pet.recomputeSalute(state.pet, state);

    return { ok: true, msg: 'Cura effettuata: -' + CURA_FERITE_RIDOTTE + ' ferite.' };
  }

  window.PETQ.care = {
    feed: feed,
    wash: wash,
    cleanPoop: cleanPoop,
    coccola: coccola,
    train: train,
    teachWord: teachWord,
    dailyLogin: dailyLogin,
    cura: cura,
    _consumaDaDispensa: consumaDaDispensa,
    _sogliaSovralimentazione: sogliaSovralimentazione,
    _feriteSovralimentazione: FERITE_SOVRALIMENTAZIONE,
    _durataAllenamentoOre: DURATA_ALLENAMENTO_ORE
  };

})();
