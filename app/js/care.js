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

    // Talenti (PROTOTIPO 2, Blocco 9, Gruppo A, "Fissato con la Dieta"): blocca_cibo=dolce
    // impedisce di somministrare quella categoria. Controllato PRIMA di consumare dalla
    // dispensa: il pasto va rifiutato, non "sprecato" (v. anche renderAzioniCucina in ui.js,
    // che disabilita gia' la card nel frigo con lo stesso motivo).
    if (PETQ.talenti && PETQ.talenti.ciboBloccato && PETQ.talenti.ciboBloccato(state, cibo.categoria)) {
      return { ok: false, msg: 'Il talento Fissato con la Dieta non tocca i dolci.' };
    }

    if (!consumaDaDispensa(state, cibo.nome)) {
      return { ok: false, msg: 'Non ne hai in frigo: compralo al Negozio.' };
    }

    var pet = state.pet;
    var famePrima = pet.stats.fame;
    pet.stats.fame = clamp(pet.stats.fame + (cibo.fame || 0), 0, 100);

    // Pacing stat RPG (bilanciamento.md): il bonus stat del cibo scatta solo per il PRIMO
    // pasto del giorno di quella categoria (la dieta varia premia, lo spam no). Il bonus
    // fame invece si applica sempre (comportamento invariato, vedi sopra).
    // Talenti (Gruppo A, "bonus_cibo=<categoria>:+1stat"/"bonus_cibo=salutare:+1stat", es.
    // Braccia di Ferro/Amante della Natura/Fissato con la Dieta): l'EXTRA si applica SOLO
    // quando scatta anche il bonus base (stessa guardia primaVoltaOggi), mai in spam — v.
    // talenti.js bonusCiboExtra per il dettaglio del design.
    if (!Array.isArray(state.categoriePastiOggi)) state.categoriePastiOggi = [];
    var primaVoltaOggi = cibo.categoria && state.categoriePastiOggi.indexOf(cibo.categoria) === -1;
    if (primaVoltaOggi) {
      if (cibo.statNome && pet.rpg && typeof pet.rpg[cibo.statNome] === 'number') {
        var extraTalento = (PETQ.talenti && PETQ.talenti.bonusCiboExtra) ?
          PETQ.talenti.bonusCiboExtra(state, cibo.categoria) : 0;
        pet.rpg[cibo.statNome] += (cibo.stat || 0) + extraTalento;
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

  // Coccola: felicità+3, max 5 al giorno (default). Numero max/giorno non specificato altrove
  // nella config: tracciato in state.coccoleDay/state.coccoleCount (default locale, segnalato).
  // Cap talenti (PROTOTIPO 2, Blocco 9, "Coccolone"): il cap 5 diventa 8 se il pet ha quel
  // talento attivo — letto ad ogni chiamata da PETQ.talenti.capCoccole (hook dedicato, stesso
  // spirito di PETQ.arredi.bonusAllenamento per il Topo).
  var COCCOLA_EFFETTO = 3;
  var COCCOLA_MAX_DIE_DEFAULT = 5;

  function capCoccoleGiorno(state) {
    if (PETQ.talenti && typeof PETQ.talenti.capCoccole === 'function') {
      return PETQ.talenti.capCoccole(state);
    }
    return COCCOLA_MAX_DIE_DEFAULT;
  }

  function coccola(state) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    var oggi = oggiStr();
    if (state.coccoleDay !== oggi) {
      state.coccoleDay = oggi;
      state.coccoleCount = 0;
    }
    var capOggi = capCoccoleGiorno(state);
    if ((state.coccoleCount || 0) >= capOggi) {
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

  // Durata allenamento (bilanciamento.md "Durata allenamento", decisione fondatore 4 lug 2026,
  // sessione "attivita' a tempo"): l'allenamento NON e' piu' istantaneo ne' un salto d'orologio
  // secco. E' un ibrido tra le MISSIONI (dura, blocca le azioni, si vede un countdown) e il
  // SONNO (la durata e' in ORE DI GIOCO che si accumulano via PETQ.pet.applyDecay, cosi' il
  // moltiplicatore debug ×60/×600 lo accelera come tutto il resto). train() qui sotto NON
  // applica piu' subito l'effetto: AVVIA l'attivita' (state.allenamento), l'effetto/felicita'/
  // costo energia si applicano al COMPLETAMENTO (v. pet.js controllaAllenamentoScaduto), per
  // coerenza con "il pet e' occupato mentre si allena" (a differenza del vecchio salto secco).
  //
  // Talenti (PROTOTIPO 2, Blocco 9, Gruppo A): state.trainDay resta la data dell'ULTIMO
  // allenamento avviato (serve a sapere quando azzerare il contatore sotto e resta letto da
  // ui.js per l'hint "gia' fatto oggi" nel caso comune di 1/giorno); state.trainCount conta
  // quanti allenamenti sono stati AVVIATI oggi, confrontato con
  // PETQ.talenti.allenamentiPerGiorno(state) (default 1, 2 con "Predestinato"). Marcati
  // all'AVVIO (non al completamento), stesso principio di prima: niente secondo avvio oltre il
  // limite anche se il primo e' ancora "in corso" a cavallo di mezzanotte.
  var DURATA_ALLENAMENTO_ORE = 1.5;

  function allenamentiFattiOggi(state) {
    if (!state) return 0;
    return (state.trainDay === oggiStr()) ? (state.trainCount || 0) : 0;
  }

  function train(state, statNome) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    if (state.sonno) {
      return { ok: false, msg: (state.pet.nome || 'Il pet') + ' sta dormendo.' };
    }
    if (state.allenamento) {
      return { ok: false, msg: (state.pet.nome || 'Il pet') + ' si sta gia\' allenando.' };
    }
    var oggi = oggiStr();
    var maxGiorno = (PETQ.talenti && PETQ.talenti.allenamentiPerGiorno) ?
      PETQ.talenti.allenamentiPerGiorno(state) : 1;
    if (allenamentiFattiOggi(state) >= maxGiorno) {
      return { ok: false, msg: 'Allenamento già fatto oggi.' };
    }
    if (!state.pet.rpg || typeof state.pet.rpg[statNome] !== 'number') {
      return { ok: false, msg: 'Statistica non valida.' };
    }
    var ignoraEnergia = PETQ.talenti && PETQ.talenti.ignoraRifiutoEnergia && PETQ.talenti.ignoraRifiutoEnergia(state);
    if (!ignoraEnergia && PETQ.pet.energiaSottoSoglia(state.pet)) {
      return { ok: false, msg: 'Troppo stanco per allenarsi.', battutaPool: 'sonno' };
    }

    // Marcato all'AVVIO (non al completamento).
    if (state.trainDay !== oggi) {
      state.trainDay = oggi;
      state.trainCount = 0;
    }
    state.trainCount = (state.trainCount || 0) + 1;

    var durataMult = (PETQ.talenti && PETQ.talenti.durataAllenamentoMult) ?
      PETQ.talenti.durataAllenamentoMult(state) : 1;
    state.allenamento = { stat: statNome, oreFatte: 0, oreTot: DURATA_ALLENAMENTO_ORE * durataMult };

    return {
      ok: true,
      msg: (state.pet.nome || 'Il pet') + ' inizia ad allenarsi.',
      avviato: true
    };
  }

  // Completa l'allenamento in corso: applica effetto stat (+ bonus arredi + bonus talenti),
  // felicita' bonus e costo/guadagno energia (v. bilanciamento.md "Allenamento"/"Energia e
  // sonno"), poi azzera state.allenamento. Va richiamata SOLO quando oreFatte >= oreTot (v.
  // pet.js controllaAllenamentoScaduto, stesso pattern di risolviRisveglio/missions.risolvi: il
  // "quando" lo decide il chiamante, questa funzione applica sempre se c'e' un'attivita' attiva).
  function completaAllenamento(state) {
    if (!state || !state.pet || !state.allenamento) return { ok: false, msg: 'Nessun allenamento in corso.' };

    var statNome = state.allenamento.stat;
    var bil = bilanciamento();
    var effetto = (bil.allenamento && typeof bil.allenamento.effetto === 'number') ? bil.allenamento.effetto : 1;
    var felicitaBonus = (bil.allenamento && typeof bil.allenamento.felicita === 'number') ? bil.allenamento.felicita : 5;
    var es = PETQ.pet.bilEnergiaSonno();

    if (PETQ.arredi && PETQ.arredi.bonusAllenamento) {
      effetto += PETQ.arredi.bonusAllenamento(state, statNome);
    }

    // Talenti (Gruppo A, "bonus_allenamento=<stat>:+N" / "bonus_allenamento=qualsiasi:<stat>+N",
    // es. Braccia di Ferro/Mente Analitica): extra per-stat, sommato DOPO l'arredo cosi' finisce
    // sempre nello stesso numero mostrato in "Allenamento finito: +N". Puo' toccare stat DIVERSE
    // da quella allenata (Mente Analitica da' +1 Int allenando qualsiasi cosa): applichiamo la
    // stat allenata con `effetto` (base+arredi+extra-stessa-stat) e le eventuali stat extra
    // diverse separatamente.
    var extraPerStat = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    if (PETQ.talenti && PETQ.talenti.bonusAllenamentoExtra) {
      extraPerStat = PETQ.talenti.bonusAllenamentoExtra(state, statNome);
    }
    effetto += extraPerStat[statNome] || 0;

    if (state.pet.rpg && typeof state.pet.rpg[statNome] === 'number') {
      state.pet.rpg[statNome] += effetto;
    }
    var extraAltreStat = [];
    for (var k in extraPerStat) {
      if (!Object.prototype.hasOwnProperty.call(extraPerStat, k)) continue;
      if (k === statNome) continue; // gia' incluso in `effetto` sopra
      if (extraPerStat[k] > 0 && state.pet.rpg && typeof state.pet.rpg[k] === 'number') {
        state.pet.rpg[k] += extraPerStat[k];
        extraAltreStat.push('+' + extraPerStat[k] + ' ' + STAT_LABEL_TRAIN[k]);
      }
    }

    state.pet.stats.felicita = clamp(state.pet.stats.felicita + felicitaBonus, 0, 100);

    // Talenti (Gruppo A, "allenamento_energia=+N", Energico): l'allenamento DA' energia invece
    // di toglierla. energiaAllenamentoOverride ritorna il delta gia' col segno giusto (es. +5),
    // il chiamante lo SOMMA invece di sottrarre il costo normale.
    var overrideEnergia = (PETQ.talenti && PETQ.talenti.energiaAllenamentoOverride) ?
      PETQ.talenti.energiaAllenamentoOverride(state) : null;
    if (overrideEnergia !== null) {
      state.pet.stats.energia = clamp(state.pet.stats.energia + overrideEnergia, 0, 100);
    } else {
      state.pet.stats.energia = clamp(state.pet.stats.energia - es.costoAllenamento, 0, 100);
    }

    state.allenamento = null;
    PETQ.pet.recomputeSalute(state.pet, state);

    var msg = 'Allenamento finito: +' + effetto + ' ' + STAT_LABEL_TRAIN[statNome] + '!';
    if (extraAltreStat.length > 0) msg += ' (' + extraAltreStat.join(', ') + ')';

    return {
      ok: true,
      msg: msg,
      stat: statNome,
      effetto: effetto
    };
  }

  var STAT_LABEL_TRAIN = { forza: 'Forza', intelligenza: 'Intelligenza', velocita: 'Velocità', carisma: 'Carisma' };

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

  // "Studio veloce" (PROTOTIPO 2, Blocco 9, Gruppo A, talento Nerd "Sete di Sapere",
  // allenamento_extra=int): +1 Intelligenza ISTANTANEO, 1/giorno, che NON consuma il turno di
  // allenamento normale (state.allenamento resta libero, trainCount non si tocca). Traccia il
  // giorno in state.studioVeloceDay, stesso pattern di wordDay/trainDay. Visibile in UI SOLO se
  // il pet ha il talento (v. ui.js renderAzioniSalone, controllo su
  // PETQ.talenti.allenamentoExtraStat).
  function studioVeloce(state) {
    if (!state || !state.pet) return { ok: false, msg: 'errore interno' };
    var statExtra = (PETQ.talenti && PETQ.talenti.allenamentoExtraStat) ? PETQ.talenti.allenamentoExtraStat(state) : null;
    if (!statExtra) {
      return { ok: false, msg: 'Nessun talento di studio veloce attivo.' };
    }
    if (state.sonno) {
      return { ok: false, msg: (state.pet.nome || 'Il pet') + ' sta dormendo.' };
    }
    if (state.missione) {
      return { ok: false, msg: (state.pet.nome || 'Il pet') + ' è in missione.' };
    }
    var oggi = oggiStr();
    if (state.studioVeloceDay === oggi) {
      return { ok: false, msg: 'Studio veloce già fatto oggi, torna domani.' };
    }
    if (!state.pet.rpg || typeof state.pet.rpg[statExtra] !== 'number') {
      return { ok: false, msg: 'Statistica non valida.' };
    }

    state.studioVeloceDay = oggi;
    state.pet.rpg[statExtra] += 1;
    PETQ.pet.recomputeSalute(state.pet, state);

    return {
      ok: true,
      msg: (state.pet.nome || 'Il pet') + ' fa uno studio veloce: +1 ' + (STAT_LABEL_TRAIN[statExtra] || statExtra) + '!',
      stat: statExtra
    };
  }

  function dailyLogin(state) {
    if (!state) return 0;
    var oggi = oggiStr();
    if (state.lastLoginDay === oggi) return 0;

    var bil = bilanciamento();
    var bonus = (bil.economia && typeof bil.economia.login === 'number') ? bil.economia.login : 10;

    // Talenti (PROTOTIPO 2, Blocco 9, Gruppo B, "login=monete+10", Cuore Magnetico): extra
    // fisso sul login giornaliero, sommato al bonus base PRIMA di scrivere state.coins cosi'
    // risulta in un unico incremento (nessun bisogno di tracciarlo separato per la UI, che
    // legge solo il totale ritornato da questa funzione).
    var extraLogin = (PETQ.talenti && PETQ.talenti.loginBonusMonete) ? PETQ.talenti.loginBonusMonete(state) : 0;
    bonus += extraLogin;

    state.coins = (state.coins || 0) + bonus;
    state.lastLoginDay = oggi;

    // nuovo giorno: pasti di oggi diventano pasti di ieri, si azzera il contatore giornaliero
    if (state.pet) {
      state.pet.pastiIeri = state.pet.pastiOggi || [];
      state.pet.pastiOggi = [];

      // Evoluzione baby->teen (PROTOTIPO-2.md punto 1): giorniVita avanza qui, ad ogni "nuovo
      // giorno" di gioco (sia il login reale che il debug "Nuovo giorno" passano da qui, v.
      // ui.js). Il cambio di stadio effettivo lo decide pet.controllaEvoluzione (chiamata dal
      // tick/boot in ui.js, stesso pattern di controllaSveglia/controllaCrolloAutomatico) cosi'
      // la UI puo' intercettarlo e mostrare la schermata dedicata invece di farlo scattare
      // silenziosamente qui dentro dailyLogin.
      if (typeof state.pet.giorniVita !== 'number') state.pet.giorniVita = 0;
      state.pet.giorniVita += 1;
    }

    // nuovo giorno: azzera i contatori giornalieri del pacing cibo/cure, guarigione naturale ferite
    state.categoriePastiOggi = [];
    state.cureOggi = 0;

    // Diario (PROTOTIPO-2.md punto 6): l'esito missione di ieri non conta piu' per la pagina
    // diario di oggi (v. missions.risolvi, che lo riscrive quando si risolve una missione oggi).
    state.esitoMissioneGiorno = null;
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
    completaAllenamento: completaAllenamento,
    allenamentiFattiOggi: allenamentiFattiOggi,
    studioVeloce: studioVeloce,
    teachWord: teachWord,
    dailyLogin: dailyLogin,
    cura: cura,
    capCoccoleGiorno: capCoccoleGiorno,
    _consumaDaDispensa: consumaDaDispensa,
    _sogliaSovralimentazione: sogliaSovralimentazione,
    _feriteSovralimentazione: FERITE_SOVRALIMENTAZIONE,
    _durataAllenamentoOre: DURATA_ALLENAMENTO_ORE,
    _coccolaMaxDieDefault: COCCOLA_MAX_DIE_DEFAULT
  };

})();
