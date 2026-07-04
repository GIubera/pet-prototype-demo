window.PETQ = window.PETQ || {};

(function () {

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.care: bilanciamento non disponibile, uso default locali');
    return {
      decadimento: { fame: 6, igiene: 3, felicita: 2 },
      soglie: { critica: 25, magro: 30, sporco: 30, malusSalute: 40 },
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

  function feed(state, cibo) {
    if (!state || !state.pet || !cibo) return { ok: false, msg: 'errore interno' };

    if (state.coins < cibo.costo) {
      return { ok: false, msg: 'Monete insufficienti.' };
    }

    state.coins -= cibo.costo;
    var pet = state.pet;
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
    pet.pastiOggi.push({ nome: cibo.nome, categoria: cibo.categoria, quando: Date.now() });

    PETQ.pet.recomputeSalute(pet, state);

    return { ok: true, msg: (pet.nome || 'Il pet') + ' ha mangiato: ' + cibo.nome + '.' };
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
      return { ok: false, msg: 'Basta coccole per oggi, torna domani.' };
    }
    state.coccoleCount = (state.coccoleCount || 0) + 1;
    state.pet.stats.felicita = clamp(state.pet.stats.felicita + COCCOLA_EFFETTO, 0, 100);
    PETQ.pet.recomputeSalute(state.pet, state);
    return { ok: true, msg: 'Coccola fatta.' };
  }

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
    PETQ.pet.recomputeSalute(state.pet, state);

    return { ok: true, msg: 'Allenamento completato: +' + effetto + ' ' + statNome + '.' };
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
    cura: cura
  };

})();
