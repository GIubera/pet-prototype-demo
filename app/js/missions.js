window.PETQ = window.PETQ || {};

(function () {

  var STAT_NOMI = ['forza', 'intelligenza', 'velocita', 'carisma'];

  // Mappa categoria missione -> perk che la rende "garantita super" se piazzato in casa.
  // Da bilanciamento.md "Perk per categoria": i perk esistono SOLO nelle missioni che li
  // assegnano (decisione fondatore), quindi non tutte le categorie sono presenti qui.
  var PERK_PER_CATEGORIA = {
    videogioco: 'videogioco',
    combattimento: 'combattimento',
    sport: 'sport'
  };

  // Le 4 armi di M7 (fallback hardcoded se il parsing dinamico da content.data.arredi
  // con fonte "M7 standard" non le trova, vedi armiM7()).
  var ARMI_M7_FALLBACK = ['Bastone da combattimento', 'Sai gemelli', 'Nunchaku arrugginiti', 'Katane a farfalla'];

  var NOME_ALLENATORE = 'Il Topo (allenatore)';

  // Cooldown missioni (GDD "Missioni" / bilanciamento.md "Cooldown missioni", playtest 4 lug
  // 2026): una missione completata esce dalla rosa per COOLDOWN_GIORNI giorni di gioco. Il
  // tutorial m0 e' escluso dal meccanismo (fuoriRosa, non passa mai da qui).
  var COOLDOWN_GIORNI = 3;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function oggiStr(d) {
    d = d || new Date();
    var mese = String(d.getMonth() + 1).padStart(2, '0');
    var giorno = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mese + '-' + giorno;
  }

  // differenza in giorni di calendario tra due stringhe 'YYYY-MM-DD' (b - a). Usa mezzogiorno
  // UTC per evitare sfasamenti da cambio ora legale sulle differenze di data locale.
  function diffGiorniStr(a, b) {
    var da = new Date(a + 'T12:00:00Z').getTime();
    var db = new Date(b + 'T12:00:00Z').getTime();
    return Math.round((db - da) / 86400000);
  }

  // Guardia difensiva: garantisce i campi di stato usati da questo modulo, utile se chiamato
  // prima che lo stato sia passato da PETQ.save.load (stesso concetto di arredi.assicuraArrediStruct).
  function assicuraStatoMissioni(state) {
    if (!state) return;
    if (PETQ.arredi && typeof PETQ.arredi._assicuraArrediStruct === 'function') {
      PETQ.arredi._assicuraArrediStruct(state);
    }
    if (typeof state.ferite !== 'number') state.ferite = 0;
    if (!Array.isArray(state.dispensa)) state.dispensa = [];
    if (typeof state.missione === 'undefined') state.missione = null;
    if (typeof state.coins !== 'number') state.coins = 0;
    state.tutorialFatto = !!state.tutorialFatto;
    // Cooldown missioni: mappa {id: 'YYYY-MM-DD' ultima esecuzione}, settata alla RISOLUZIONE
    // (v. risolvi). Migrazione: i salvataggi vecchi non ce l'hanno, si parte da mappa vuota
    // (nessuna missione in cooldown finche' non se ne completa una nuova).
    if (!state.missioniFatte || typeof state.missioniFatte !== 'object' || Array.isArray(state.missioniFatte)) {
      state.missioniFatte = {};
    }
  }

  function dataMissioni() {
    var data = window.PETQ.content && window.PETQ.content.data;
    return (data && data.missioni) || [];
  }

  function trovaScheda(id) {
    var elenco = dataMissioni();
    for (var i = 0; i < elenco.length; i++) {
      if (elenco[i].id === id) return elenco[i];
    }
    return null;
  }

  // ---------- rosa del giorno ----------

  // Hash semplice e stabile di una stringa in un intero a 32bit (somma pesata dei codici
  // carattere), usato come seed per il generatore mulberry32 dedicato alla rosa del giorno.
  function hashStringa(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }

  // stesso algoritmo mulberry32 di rng.js, duplicato qui in un generatore LOCALE e indipendente
  // per non toccare lo stato del rng globale (usato per altri scopi: poop, drop armi, ecc.):
  // la rosa del giorno deve essere deterministica per data ma non deve alterare la sequenza
  // pseudocasuale globale ne' dipendere da quando viene chiamata nella sessione di gioco.
  function mulberry32Locale(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DIM_ROSA = 4;

  // Applica il cooldown missioni (bilanciamento.md "Cooldown missioni", playtest 4 lug 2026):
  // esclude dal pool le schede completate da MENO di COOLDOWN_GIORNI giorni di gioco. Se il
  // pool disponibile scende sotto DIM_ROSA, riammette le completate PIU' VECCHIE (ultima
  // esecuzione piu' lontana nel tempo) fino a riempirlo di nuovo: la rosa non e' mai vuota,
  // ne' sotto la sua dimensione naturale se ci sono abbastanza schede totali.
  function applicaCooldown(candidate, state) {
    var oggi = oggiStr();
    var fatte = (state && state.missioniFatte && typeof state.missioniFatte === 'object') ? state.missioniFatte : {};

    var disponibili = [];
    var inCooldown = []; // {scheda, dataUltima}
    for (var i = 0; i < candidate.length; i++) {
      var m = candidate[i];
      var dataUltima = fatte[m.id];
      if (!dataUltima) {
        disponibili.push(m);
        continue;
      }
      var giorniPassati = diffGiorniStr(dataUltima, oggi);
      if (giorniPassati >= COOLDOWN_GIORNI) {
        disponibili.push(m);
      } else {
        inCooldown.push({ scheda: m, dataUltima: dataUltima });
      }
    }

    if (disponibili.length >= DIM_ROSA || inCooldown.length === 0) {
      return disponibili;
    }

    // riammette le piu' vecchie (dataUltima piu' indietro nel tempo = numero di giorni
    // passati piu' alto) finche' non si raggiunge DIM_ROSA o si esauriscono i candidati
    inCooldown.sort(function (a, b) {
      return diffGiorniStr(a.dataUltima, oggi) < diffGiorniStr(b.dataUltima, oggi) ? 1 : -1;
    });
    var mancano = DIM_ROSA - disponibili.length;
    for (var j = 0; j < inCooldown.length && j < mancano; j++) {
      disponibili.push(inCooldown[j].scheda);
    }

    return disponibili;
  }

  // Estrae 4 schede su 8 (M1-M8, mai M0) con seed = hash della data odierna, garantendo
  // copertura di almeno 3 stat diverse tra le 4 (forza/intelligenza/velocita/carisma).
  // Deterministico: stessa data -> stesso set, sempre (usato anche per verificare la stabilita'
  // nei test). Se la copertura minima non e' raggiungibile per mancanza di schede valide,
  // restituisce comunque le 4 estratte con un console.warn (non blocca il boot).
  // Prima di estrarre, applica il cooldown missioni (v. applicaCooldown): le completate da
  // meno di 3 giorni di gioco sono escluse, salvo riammissione delle piu' vecchie se il pool
  // scende sotto la dimensione della rosa.
  function rosaDelGiorno(state) {
    var tutte = dataMissioni().filter(function (m) { return !m.fuoriRosa && m.id !== 'm0'; });
    var candidate = applicaCooldown(tutte, state);
    if (candidate.length === 0) {
      console.warn('PETQ.missions: nessuna scheda disponibile per la rosa del giorno');
      return [];
    }

    var seed = hashStringa(oggiStr());
    var rand = mulberry32Locale(seed);

    // Fisher-Yates deterministico con il generatore locale, poi si prova a soddisfare la
    // copertura stat scambiando schede finche' possibile (numero di tentativi limitato per
    // restare deterministico e non degenerare in loop).
    function estraiOrdine() {
      var idx = candidate.map(function (_, i) { return i; });
      for (var i = idx.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
      }
      return idx;
    }

    function copertura(schede) {
      var stat = {};
      for (var i = 0; i < schede.length; i++) {
        var st = schede[i].stat || [];
        for (var j = 0; j < st.length; j++) stat[st[j]] = true;
      }
      return Object.keys(stat).length;
    }

    var ordine = estraiOrdine();
    var scelta = ordine.slice(0, DIM_ROSA).map(function (i) { return candidate[i]; });

    // se la copertura e' gia' >=3 o non ci sono abbastanza schede per migliorare, va bene cosi'
    if (copertura(scelta) < 3 && candidate.length > DIM_ROSA) {
      // riprova con permutazioni successive dello stesso stream deterministico finche' non
      // trova una combinazione valida o esaurisce i tentativi (cap 20, resta deterministico
      // perche' il generatore e' seedato sempre allo stesso modo per la stessa data)
      for (var tentativo = 0; tentativo < 20; tentativo++) {
        var ord2 = estraiOrdine();
        var tent = ord2.slice(0, DIM_ROSA).map(function (i) { return candidate[i]; });
        if (copertura(tent) >= 3) { scelta = tent; break; }
      }
      if (copertura(scelta) < 3) {
        console.warn('PETQ.missions: copertura stat della rosa del giorno sotto 3 dopo vari tentativi');
      }
    }

    return scelta;
  }

  function tutorialDaProporre(state) {
    assicuraStatoMissioni(state);
    if (state.tutorialFatto) return null;
    var m0 = trovaScheda('m0');
    if (!m0) {
      console.warn('PETQ.missions: scheda tutorial m0 non trovata in content.data.missioni');
      return null;
    }
    return m0;
  }

  // Risolve il tutorial M0: nessuna durata/avvio (e' un regalo di benvenuto istantaneo),
  // esito unico deciso dalla personalita' del pet (mai fallimento, come da scheda), stesso
  // formato di ritorno di risolvi() cosi' la UI puo' riusare la stessa schermata "esito".
  // Marca state.tutorialFatto = true cosi' non viene riproposto dal giorno 2 (v. tutorialDaProporre).
  function risolviTutorial(state) {
    assicuraStatoMissioni(state);
    var scheda = trovaScheda('m0');
    if (!scheda) {
      return { ok: false, msg: 'Scheda tutorial non trovata.' };
    }
    if (state.tutorialFatto) {
      return { ok: false, msg: 'Tutorial gia\' completato.' };
    }

    var personalita = state.pet ? state.pet.personalita : null;
    var esito = null;
    for (var i = 0; i < (scheda.esiti || []).length; i++) {
      if (scheda.esiti[i].personalita === personalita) { esito = scheda.esiti[i]; break; }
    }
    if (!esito) {
      console.warn('PETQ.missions: nessun esito tutorial per personalita "' + personalita + '", uso il primo disponibile');
      esito = scheda.esiti[0] || null;
    }
    if (!esito) {
      return { ok: false, msg: 'Scheda tutorial senza esiti.' };
    }

    var rewards = [];
    for (var j = 0; j < (esito.reward || []).length; j++) {
      try {
        applicaRewardToken(state, esito.reward[j], rewards);
      } catch (e) {
        console.warn('PETQ.missions: errore applicando reward tutorial "' + esito.reward[j] + '"', e);
      }
    }

    state.tutorialFatto = true;

    return {
      ok: true,
      tipo: 'tutorial',
      missioneId: scheda.id,
      chiaveEsito: esito.chiave,
      testo: esito.testo || '',
      scenaId: scenaIdPer(scheda, esito),
      rewards: rewards
    };
  }

  // ---------- avvio / stato missione in corso ----------

  function avvia(state, id) {
    assicuraStatoMissioni(state);
    var scheda = trovaScheda(id);
    if (!scheda || scheda.tutorial) {
      return { ok: false, msg: 'Missione non valida.' };
    }
    if (state.missione) {
      return { ok: false, msg: 'Una missione e\' gia\' in corso.' };
    }
    // limite 1 missione al giorno (fix playtest): missioneGiorno viene marcato alla
    // RISOLUZIONE (v. risolvi); il tutorial M0 non passa da qui e non conta
    if (state.missioneGiorno === oggiStr()) {
      return { ok: false, msg: 'Una missione al giorno: torna domani.' };
    }
    if (state.sonno) {
      return { ok: false, msg: (state.pet && state.pet.nome ? state.pet.nome : 'Il pet') + ' sta dormendo.' };
    }
    if (PETQ.pet && PETQ.pet.energiaSottoSoglia && PETQ.pet.energiaSottoSoglia(state.pet)) {
      return { ok: false, msg: 'Troppo stanco per partire in missione.', battutaPool: 'sonno' };
    }
    var costo = scheda.costo || 0;
    if ((state.coins || 0) < costo) {
      return { ok: false, msg: 'Monete insufficienti.' };
    }

    state.coins -= costo;
    state.missione = {
      id: id,
      fine: Date.now() + (scheda.durataMs || 3600000),
      costo: costo // salvato qui cosi' risolvi() puo' applicare rimborsoCosto senza ripescare la scheda
    };

    return { ok: true, msg: (scheda.titolo || id) + ' avviata.' };
  }

  function inCorso(state) {
    assicuraStatoMissioni(state);
    if (!state.missione) return null;
    return trovaScheda(state.missione.id);
  }

  function tempoRimasto(state) {
    assicuraStatoMissioni(state);
    if (!state.missione) return 0;
    var restante = state.missione.fine - Date.now();
    return restante > 0 ? restante : 0;
  }

  // ---------- valutazione condizioni (stat effettiva = base + bonus passivi piazzati, cap 2) ----------

  function statEffettiva(pet, bonusStat, nomeStat) {
    var base = (pet && pet.rpg && typeof pet.rpg[nomeStat] === 'number') ? pet.rpg[nomeStat] : 0;
    var bonus = (bonusStat && typeof bonusStat[nomeStat] === 'number') ? bonusStat[nomeStat] : 0;
    return base + bonus;
  }

  // Valutatore condizioni esposto per i test (prefisso _ = interno ma accessibile).
  // cond e' l'albero gia' pre-parsato da PETQ.content.parseCondizione (fatto una volta in
  // content.js al parsing della scheda); qui costruiamo solo il ctx e deleghiamo la
  // valutazione ricorsiva a PETQ.content.valutaCondizione (stessa grammatica, stessa fonte
  // di verita', evita di duplicare il valutatore ad albero in due file).
  function _valutaCond(cond, pet, bonusStat) {
    if (!cond) return true; // standard: nessuna condizione, sempre vera
    var ctx = {
      personalita: pet ? pet.personalita : null,
      stat: {
        forza: statEffettiva(pet, bonusStat, 'forza'),
        intelligenza: statEffettiva(pet, bonusStat, 'intelligenza'),
        velocita: statEffettiva(pet, bonusStat, 'velocita'),
        carisma: statEffettiva(pet, bonusStat, 'carisma')
      }
    };
    return PETQ.content.valutaCondizione(cond, ctx);
  }

  // ---------- scelta esito (regole di precedenza) ----------

  // Ritorna l'oggetto esito scelto secondo le regole:
  // 1) super (per priorita crescente: 1=Amicizia, 2=Dominio, 3=Intimidazione), poi fallimenti
  //    (ordine di apparizione nella scheda), altrimenti standard. Super batte sempre fallimento.
  // 2) perk di categoria attivo -> super garantito: per missioni con un solo super, scatta
  //    sempre (bypassa la sua cond); per M7 (tre super) forza Dominio (priorita 2) SOLO se
  //    Amicizia/Intimidazione non sono gia' soddisfatte autonomamente.
  function scegliEsito(scheda, pet, bonusStat, perksAttivi) {
    var esiti = scheda.esiti || [];
    var superList = esiti.filter(function (e) { return e.tipo === 'super'; });
    var fallList = esiti.filter(function (e) { return e.tipo === 'fallimento'; });
    var standardList = esiti.filter(function (e) { return e.tipo === 'standard'; });

    // ordina i super per priorita crescente (1 prima); chi non ha priorita va in fondo
    superList = superList.slice().sort(function (a, b) {
      var pa = (typeof a.priorita === 'number') ? a.priorita : 99;
      var pb = (typeof b.priorita === 'number') ? b.priorita : 99;
      return pa - pb;
    });

    var perkCategoria = scheda.categoria ? PERK_PER_CATEGORIA[scheda.categoria] : null;
    var perkAttivoQui = perkCategoria && perksAttivi.indexOf(perkCategoria) !== -1;

    // 1) super la cui condizione e' soddisfatta autonomamente, in ordine di priorita
    for (var i = 0; i < superList.length; i++) {
      if (_valutaCond(superList[i].cond, pet, bonusStat)) {
        return superList[i];
      }
    }

    // 2) perk attivo -> super garantito. Per schede con un solo super, e' quello (bypassa cond).
    // Per M7 (tre super), il perk Combattimento forza il super "generico" cioe' quello con
    // priorita piu' alta tra quelli SENZA condizione di personalita specifica gia' esclusa
    // sopra: dato che nessuna cond e' stata soddisfatta al punto 1, il generico e' Dominio
    // (priorita=2, per costruzione delle schede attuali; non e' hardcoded sul nome "dominio"
    // ma sul fatto che e' l'unico rimasto candidato "di forza pura" nella scheda M7 reale).
    if (perkAttivoQui && superList.length > 0) {
      var forzato = superList.length === 1
        ? superList[0]
        : trovaSuperGenerico(superList);
      if (forzato) return forzato;
    }

    // 3) fallimenti, in ordine di apparizione nella scheda
    for (var j = 0; j < fallList.length; j++) {
      if (_valutaCond(fallList[j].cond, pet, bonusStat)) {
        return fallList[j];
      }
    }

    // 4) standard (default)
    if (standardList.length > 0) return standardList[0];

    console.warn('PETQ.missions: nessun esito standard trovato per ' + scheda.id + ', scheda malformata');
    return null;
  }

  // Il super "generico" di una scheda multi-super e' quello con chiave 'dominio' se presente
  // (M7); altrimenti, per generalita' futura, quello con priorita mediana/piu' alta tra quelli
  // rimasti (fallback che non blocca se un giorno si aggiungono altre schede multi-super).
  function trovaSuperGenerico(superList) {
    for (var i = 0; i < superList.length; i++) {
      if (superList[i].chiave === 'dominio') return superList[i];
    }
    console.warn('PETQ.missions: super "generico" non identificato per chiave, uso il primo per priorita');
    return superList[0] || null;
  }

  // ---------- risoluzione + applicazione reward ----------

  function scenaIdPer(scheda, esito) {
    if (esito.scenaId) return esito.scenaId; // gia' calcolato da content.js con la stessa convenzione
    if (esito.tipo === 'fallimento') return 'fail_generica';
    if (esito.tipo === 'standard' || esito.tipo === 'tutorial') return 'std_' + (scheda.categoria || 'generica');
    if (scheda.numero === 7) return 'super_m7_' + (esito.chiave || 'dominio');
    return 'super_m' + scheda.numero;
  }

  function armiM7() {
    var data = window.PETQ.content && window.PETQ.content.data;
    var elenco = (data && data.arredi) || [];
    var trovate = elenco.filter(function (a) { return /m7 standard/i.test(a.fonte || ''); }).map(function (a) { return a.nome; });
    if (trovate.length === 4) return trovate;
    if (trovate.length > 0) {
      console.warn('PETQ.missions: trovate solo ' + trovate.length + ' armi M7 da content.arredi, uso lista hardcoded');
    }
    return ARMI_M7_FALLBACK;
  }

  function applicaRewardToken(state, token, rewardsOut) {
    var t = (token || '').trim();
    if (t === '') return;

    var mStat = t.match(/^(forza|intelligenza|velocita|carisma)\s*([+-]\d+)$/i);
    if (mStat) {
      var stat = mStat[1].toLowerCase();
      var delta = parseInt(mStat[2], 10);
      if (state.pet && state.pet.rpg && typeof state.pet.rpg[stat] === 'number') {
        state.pet.rpg[stat] += delta;
      }
      rewardsOut.push({ tipo: 'stat', stat: stat, valore: delta });
      return;
    }

    var mFel = t.match(/^fel\s*([+-]\d+)$/i);
    if (mFel) {
      var dFel = parseInt(mFel[1], 10);
      if (state.pet) state.pet.stats.felicita = clamp(state.pet.stats.felicita + dFel, 0, 100);
      rewardsOut.push({ tipo: 'felicita', valore: dFel });
      return;
    }

    var mMonete = t.match(/^monete\s*([+-]\d+)$/i);
    if (mMonete) {
      var dMonete = parseInt(mMonete[1], 10);
      state.coins = (state.coins || 0) + dMonete;
      rewardsOut.push({ tipo: 'monete', valore: dMonete });
      return;
    }

    var mIgiene = t.match(/^igiene\s*([+-]\d+)$/i);
    if (mIgiene) {
      var dIgiene = parseInt(mIgiene[1], 10);
      // Ombrello meccanico piazzato: dimezza il calo Igiene nelle missioni a rischio
      // pioggia/sporco (bilanciamento.md/arredi.md: "-10 -> -5"). Nel prototipo l'unico
      // reward negativo di Igiene e' M5 (rischio pioggia): applichiamo il dimezzamento a
      // qualunque calo Igiene di missione quando l'effetto e' attivo, essendo l'unico caso.
      if (dIgiene < 0 && PETQ.arredi && PETQ.arredi.haEffettoSpeciale &&
          PETQ.arredi.haEffettoSpeciale(state, 'igiene_dimezza_pioggia')) {
        dIgiene = Math.ceil(dIgiene / 2); // -10 -> -5, -15 -> -8 (arrotonda verso 0, mai peggio)
      }
      if (state.pet) state.pet.stats.igiene = clamp(state.pet.stats.igiene + dIgiene, 0, 100);
      rewardsOut.push({ tipo: 'igiene', valore: dIgiene });
      return;
    }

    var mFerite = t.match(/^ferite\s*([+-]\d+)$/i);
    if (mFerite) {
      var dFerite = parseInt(mFerite[1], 10);
      state.ferite = clamp((state.ferite || 0) + dFerite, 0, 100);
      if (state.pet) PETQ.pet.recomputeSalute(state.pet, state);
      rewardsOut.push({ tipo: 'ferite', valore: dFerite });
      return;
    }

    var mArredo = t.match(/^arredo:(.+)$/i);
    if (mArredo) {
      var nomeArredo = mArredo[1].trim();
      PETQ.arredi.aggiungi(state, nomeArredo);
      rewardsOut.push({ tipo: 'arredo', nome: nomeArredo });
      return;
    }

    // Inventario/frigo (GDD "Economia" -> "Spesa e dispensa"): dispensa e' un array di
    // {nome, qty}. Il cibo gratis dalle missioni incrementa la qty della riga esistente,
    // o ne crea una nuova con qty 1 se il pet non ne possiede ancora.
    var mCibo = t.match(/^cibo:(.+)$/i);
    if (mCibo) {
      var nomeCibo = mCibo[1].trim();
      if (!Array.isArray(state.dispensa)) state.dispensa = [];
      var vociEsistenti = state.dispensa.filter(function (v) { return v.nome === nomeCibo; });
      if (vociEsistenti.length > 0) {
        vociEsistenti[0].qty = (vociEsistenti[0].qty || 0) + 1;
      } else {
        state.dispensa.push({ nome: nomeCibo, qty: 1 });
      }
      rewardsOut.push({ tipo: 'cibo', nome: nomeCibo });
      return;
    }

    if (/^armaCasuale$/i.test(t)) {
      var armi = armiM7();
      var scelta = PETQ.rng.pick(armi);
      PETQ.arredi.aggiungi(state, scelta);
      rewardsOut.push({ tipo: 'arma', nome: scelta });
      return;
    }

    if (/^tutteArmi$/i.test(t)) {
      var tutte = armiM7();
      for (var i = 0; i < tutte.length; i++) PETQ.arredi.aggiungi(state, tutte[i]);
      rewardsOut.push({ tipo: 'tutteArmi', nomi: tutte });
      return;
    }

    var mAllenatore = t.match(/^allenatore:(7g|perm)$/i);
    if (mAllenatore) {
      if (mAllenatore[1].toLowerCase() === '7g') {
        PETQ.arredi.aggiungi(state, NOME_ALLENATORE, { scadenzaMs: Date.now() + 7 * 24 * 3600000 });
        rewardsOut.push({ tipo: 'allenatore', durata: '7g' });
      } else {
        // permanente: nessuna scadenzaMs, arredi.aggiungi si occupa di sostituire il temporaneo
        PETQ.arredi.aggiungi(state, NOME_ALLENATORE);
        rewardsOut.push({ tipo: 'allenatore', durata: 'perm' });
      }
      // NOTA: il bonus "+1 Forza extra ad ogni allenamento Forza a casa" di questo arredo
      // speciale NON e' collegato a PETQ.care.train in questo giro (fuori scope esplicito
      // nella richiesta): l'arredo e' posseduto/piazzabile con effettoSpeciale
      // 'bonus_allenamento_forza' ma l'hook dentro care.train resta un TODO.
      return;
    }

    var mPerk = t.match(/^perk:(videogioco|combattimento|sport)$/i);
    if (mPerk) {
      // il perk deriva dal fatto che l'arredo che lo porta viene piazzato (nessuno stato
      // aggiuntivo da scrivere qui): incluso solo a scopo informativo per la UI.
      rewardsOut.push({ tipo: 'perk', categoria: mPerk[1].toLowerCase() });
      return;
    }

    if (/^rimborsoCosto$/i.test(t)) {
      var costoOriginale = (state.missione && typeof state.missione.costo === 'number') ? state.missione.costo : 0;
      state.coins = (state.coins || 0) + costoOriginale;
      rewardsOut.push({ tipo: 'rimborso', valore: costoOriginale });
      return;
    }

    console.warn('PETQ.missions: token reward non riconosciuto: "' + t + '"');
  }

  function risolvi(state) {
    assicuraStatoMissioni(state);
    if (!state.missione) {
      return { ok: false, msg: 'Nessuna missione in corso.' };
    }
    if (tempoRimasto(state) > 0) {
      return { ok: false, msg: 'La missione non e\' ancora finita.' };
    }

    var scheda = trovaScheda(state.missione.id);
    if (!scheda) {
      state.missione = null;
      return { ok: false, msg: 'Scheda missione non trovata.' };
    }

    var bonusStat = PETQ.arredi.bonusPassivi(state);
    var perks = PETQ.arredi.perkAttivi(state);
    var esito = scegliEsito(scheda, state.pet, bonusStat, perks);

    if (!esito) {
      state.missione = null;
      return { ok: false, msg: 'Impossibile calcolare l\'esito della missione.' };
    }

    // Costo energia missione (GDD/bilanciamento.md "Energia e sonno"): 8 x ore di durata,
    // clampato a 0 (mai sotto zero, mai reso "negativo" oltre il minimo della stat).
    if (state.pet && state.pet.stats && PETQ.pet && PETQ.pet.bilEnergiaSonno) {
      var es = PETQ.pet.bilEnergiaSonno();
      var oreDurata = (scheda.durataMs || 0) / 3600000;
      var costoEnergia = es.costoMissionePerOra * oreDurata;
      state.pet.stats.energia = clamp((typeof state.pet.stats.energia === 'number' ? state.pet.stats.energia : 70) - costoEnergia, 0, 100);
    }

    var rewards = [];
    for (var i = 0; i < (esito.reward || []).length; i++) {
      try {
        applicaRewardToken(state, esito.reward[i], rewards);
      } catch (e) {
        console.warn('PETQ.missions: errore applicando reward "' + esito.reward[i] + '"', e);
      }
    }

    var risultato = {
      ok: true,
      tipo: esito.tipo,
      missioneId: scheda.id,
      chiaveEsito: esito.chiave,
      testo: esito.testo || '',
      scenaId: scenaIdPer(scheda, esito),
      rewards: rewards
    };

    state.missione = null;
    // limite 1 missione al giorno (fix playtest): marca il giorno alla risoluzione;
    // avvia() rifiuta finche' non cambia data (il debug "Nuovo giorno" azzera questo campo)
    state.missioneGiorno = oggiStr();
    // Cooldown missioni (bilanciamento.md "Cooldown missioni"): marca l'ultima esecuzione
    // ALLA RISOLUZIONE (non all'avvio), cosi' una missione abbandonata a meta' (mai possibile
    // nel prototipo, ma per coerenza futura) non entrerebbe in cooldown senza essere completata.
    // Il tutorial m0 non passa mai da qui (risolviTutorial e' una funzione separata).
    if (!scheda.tutorial) {
      state.missioniFatte[scheda.id] = oggiStr();
    }

    return risultato;
  }

  window.PETQ.missions = {
    rosaDelGiorno: rosaDelGiorno,
    avvia: avvia,
    inCorso: inCorso,
    tempoRimasto: tempoRimasto,
    risolvi: risolvi,
    tutorialDaProporre: tutorialDaProporre,
    risolviTutorial: risolviTutorial,
    _valutaCond: _valutaCond,
    _scegliEsito: scegliEsito,
    _applicaCooldown: applicaCooldown,
    _diffGiorniStr: diffGiorniStr,
    _dimRosa: DIM_ROSA,
    _cooldownGiorni: COOLDOWN_GIORNI
  };

})();
