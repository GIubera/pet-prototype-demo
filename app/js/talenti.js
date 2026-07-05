window.PETQ = window.PETQ || {};

(function () {

  // ==================== Talenti (PROTOTIPO 2, Blocco 9) ====================
  // Sistema NUOVO e DISTINTO dai perk di categoria (arredi.perkAttivi, Player One/Street
  // Fighter/Tony Hawk). I talenti definiscono la BUILD del pet: 1 estratto alla nascita dalla
  // terna della sua personalita', +1 estratto alla evoluzione teen (cumulativi, v.
  // content/talenti.md). Questo modulo copre: l'estrazione pesata 45/45/10 (usata da pet.js
  // generate/controllaEvoluzione), i due effetti passivi semplici del batch core (bonus stat
  // piatto, cap coccole) e il GRUPPO A (Cibo/Allenamento/Energia, v. sezione dedicata sotto).
  // Tutti gli altri token del DSL "Dati" sono PARSATI (v. content.js parseTalenti ->
  // talento.effetti) ma NON ancora agganciati: v. registry TODO in fondo al file.

  // ---------- estrazione pesata 45/45/10 ----------
  // Terna = [normale, normale, raro] (ordine come scritto in talenti.md, v. content.js
  // parseSezionePersonalitaTalenti: la riga con 🟡 e' sempre la terza in tabella ma qui NON
  // assumiamo l'ordine — selezioniamo per il flag `raro` cosi' il codice resta corretto anche
  // se in futuro il socio riordina le righe nel file). Pesi: 45% / 45% / 10% (il raro).
  function estraiDaTerna(terna) {
    if (!terna || terna.length === 0) return null;
    var rari = [];
    var normali = [];
    for (var i = 0; i < terna.length; i++) {
      if (terna[i].raro) rari.push(terna[i]);
      else normali.push(terna[i]);
    }
    // caso atteso: 2 normali + 1 raro. Fallback tollerante se la terna non rispetta lo schema
    // (es. file mal formattato): pesca uniforme su tutta la terna invece di rompere il gioco.
    if (normali.length !== 2 || rari.length !== 1) {
      console.warn('PETQ.talenti: terna non nello schema 2 normali + 1 raro, estrazione uniforme di fallback', terna);
      return PETQ.rng.pick(terna);
    }
    var r = PETQ.rng.rand(); // [0,1)
    if (r < 0.45) return normali[0];
    if (r < 0.90) return normali[1];
    return rari[0];
  }

  // Estrae 1 talento dalla terna <stadio> della <personalita>, dai dati caricati in
  // PETQ.content.data.talenti. Ritorna una COPIA superficiale del talento con in piu' il campo
  // `stadio` (serve alla scheda personaggio per mostrare "da quale stadio" viene), oppure null
  // se i dati non sono disponibili (content non ancora caricato, personalita sconosciuta, ecc).
  function estrai(personalita, stadio) {
    var data = window.PETQ.content && window.PETQ.content.data && window.PETQ.content.data.talenti;
    var bloccoPers = data && data[personalita];
    var terna = bloccoPers && bloccoPers[stadio];
    if (!terna || terna.length === 0) {
      console.warn('PETQ.talenti: nessuna terna "' + stadio + '" per personalita "' + personalita + '"');
      return null;
    }
    var scelto = estraiDaTerna(terna);
    if (!scelto) return null;
    var copia = {
      nome: scelto.nome,
      raro: !!scelto.raro,
      effettoTesto: scelto.effettoTesto,
      dati: scelto.dati,
      effetti: (scelto.effetti || []).slice(),
      stadio: stadio
    };
    return copia;
  }

  // ---------- lettura talenti attivi dal pet ----------

  function talentiAttivi(state) {
    if (!state || !state.pet || !Array.isArray(state.pet.talenti)) return [];
    return state.pet.talenti;
  }

  // Cerca dentro talento.effetti un token che inizia con "<chiave>=" (es. "passivo=forza+2",
  // "cap_coccole=8"). Ritorna la stringa dopo il '=' (trim), o null se non presente. Un talento
  // puo' avere piu' token con la stessa chiave (es. "passivo=forza+2" e non ce ne sono altri in
  // questo batch, ma la firma resta pronta per i futuri).
  function trovaToken(effetti, chiave) {
    if (!effetti) return null;
    var prefisso = chiave + '=';
    for (var i = 0; i < effetti.length; i++) {
      var t = (effetti[i] || '').trim();
      if (t.indexOf(prefisso) === 0) return t.substring(prefisso.length).trim();
    }
    return null;
  }

  // ---------- effetto 1: passivo=stat+N ----------
  // Somma i bonus "passivo=<stat>+N" dei talenti attivi, PARI PARI al pattern di
  // arredi.bonusPassivi (stessa forma di ritorno {forza,intelligenza,velocita,carisma}). A
  // differenza degli arredi qui NON c'e' un cap dedicato nel design (talenti.md non lo cita):
  // nessun clamp applicato, i talenti passivi sono pochi e cumulativi per design (nascita+teen).
  var STAT_NOMI = ['forza', 'intelligenza', 'velocita', 'carisma'];

  // "forza+2" / "velocita+2" / "int+3" (talenti.md usa anche l'abbreviazione "int" nella legenda,
  // v. Cervellone "passivo=int+3"): normalizziamo l'alias qui, stesso spirito di STAT_ALIAS in
  // content.js parseCibi/estraiStatRpg.
  var STAT_ALIAS_TALENTI = { int: 'intelligenza', forza: 'forza', velocita: 'velocita', carisma: 'carisma' };

  function parsePassivo(valore) {
    // valore atteso: "<stat><+/-><numero>", es. "forza+2", "int+3"
    var m = (valore || '').match(/^([a-z]+)\s*([+-]\d+)$/i);
    if (!m) return null;
    var statAlias = m[1].toLowerCase();
    var stat = STAT_ALIAS_TALENTI[statAlias] || (STAT_NOMI.indexOf(statAlias) !== -1 ? statAlias : null);
    if (!stat) return null;
    return { stat: stat, valore: parseInt(m[2], 10) };
  }

  function bonusStatTutte(state) {
    var somma = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valGrezzo = trovaToken(attivi[i].effetti, 'passivo');
      if (!valGrezzo) continue;
      var parsed = parsePassivo(valGrezzo);
      if (parsed && typeof somma[parsed.stat] === 'number') {
        somma[parsed.stat] += parsed.valore;
      }
    }
    return somma;
  }

  // Bonus talenti per UNA stat sola (comodo per i chiamanti che gia' iterano per stat, es.
  // ui.js statConBonus): ritorna un numero, 0 se nessun talento tocca quella stat.
  function bonusStat(state, statNome) {
    if (!statNome) return 0;
    var somma = bonusStatTutte(state);
    return (typeof somma[statNome] === 'number') ? somma[statNome] : 0;
  }

  // ---------- effetto 2: cap_coccole=N (Coccolone) ----------
  // Default 5 (v. care.js COCCOLA_MAX_DIE / GDD "Coccole"), 8 se il pet ha il talento Coccolone
  // attivo. care.coccola deve chiamare questa funzione invece di usare la costante fissa.
  var CAP_COCCOLE_DEFAULT = 5;

  function capCoccole(state) {
    var attivi = talentiAttivi(state);
    var cap = CAP_COCCOLE_DEFAULT;
    for (var i = 0; i < attivi.length; i++) {
      var valGrezzo = trovaToken(attivi[i].effetti, 'cap_coccole');
      if (valGrezzo === null) continue;
      var n = parseInt(valGrezzo, 10);
      if (!isNaN(n) && n > cap) cap = n; // se mai ci fossero piu' talenti col token, vince il piu' alto
    }
    return cap;
  }

  // ==================== GRUPPO A: Cibo, Allenamento, Energia (PROTOTIPO 2, Blocco 9) ====================
  // Questo batch aggancia SOLO i token elencati qui sotto. Stesso pattern degli effetti sopra:
  // talentiAttivi(state) -> trovaToken(effetti, chiave) -> parse del valore grezzo. Nessun
  // effetto viene "bakeato" sul pet: tutto si legge a runtime da state.pet.talenti, cosi'
  // "Ri-tira talenti" (debug) cambia immediatamente il comportamento in gioco.

  // Alias categorie cibo -> nomi usati nel DSL (content/talenti.md usa "salutare" come
  // categoria ombrello per carne/verdura/pesce, v. Fissato con la Dieta).
  var CATEGORIE_SALUTARI = ['carne', 'verdura', 'pesce'];

  // ---------- CIBO ----------

  // bonus_cibo=<categoria>:+1stat  (es. "carne:forza+1", "verdura:+1stat")
  // bonus_cibo=salutare:+1stat     (Fissato con la Dieta: qualsiasi cibo salutare)
  //
  // Formati osservati in talenti.md (v. legenda + tabelle):
  //   "carne:forza+1"   -> categoria "carne", stat esplicita "forza", +1
  //   "verdura:+1stat"  -> categoria "verdura", "+1 alla stat DEL CIBO" (nessuna stat fissa qui)
  //   "salutare:+1stat" -> categoria ombrello (carne/verdura/pesce), stessa regola "+1 alla stat del cibo"
  //
  // Ritorna il bonus INTERO da sommare alla stat associata al cibo mangiato, o 0 se nessun
  // talento tocca questa categoria. NOTA DI DESIGN (documentata come richiesto dal brief):
  // l'extra scatta SOLO quando scatta anche il bonus stat BASE del cibo, cioe' al primo pasto
  // della categoria nella giornata (v. care.feed, stessa guardia `primaVoltaOggi`) — l'idea e'
  // "premia la dieta varia", non "spamma il cibo giusto per doppio bonus".
  function bonusCiboExtra(state, categoria) {
    if (!categoria) return 0;
    var attivi = talentiAttivi(state);
    var extra = 0;
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t.indexOf('bonus_cibo=') !== 0) continue;
        var valore = t.substring('bonus_cibo='.length).trim();
        var due = valore.indexOf(':');
        if (due === -1) continue;
        var catToken = valore.substring(0, due).trim().toLowerCase();
        var resto = valore.substring(due + 1).trim(); // "forza+1" oppure "+1stat"

        var matchCategoria = (catToken === categoria) ||
          (catToken === 'salutare' && CATEGORIE_SALUTARI.indexOf(categoria) !== -1);
        if (!matchCategoria) continue;

        // "+1stat" (o "+1 stat"): +1 generico alla stat DEL CIBO, il chiamante la assegna.
        // "forza+1" (stat esplicita nel token): qui contiamo comunque solo il NUMERO, perche'
        // bonusCiboExtra ritorna un bonus per "la stat di questo cibo" (care.feed applica
        // sempre alla stessa pet.rpg[cibo.statNome] del bonus base, mai a una stat diversa
        // nei talenti di questo batch: Braccia di Ferro e' "carne:forza+1" e la carne DA'
        // gia' stat forza, quindi il caso "stat esplicita diversa dal cibo" non si presenta).
        var mNum = resto.match(/([+-]\d+)/);
        if (mNum) extra += parseInt(mNum[1], 10);
      }
    }
    return extra;
  }

  // blocca_cibo=<categoria>  (es. "dolce" per Fissato con la Dieta)
  // Ritorna true se un talento attivo blocca questa categoria di cibo.
  function ciboBloccato(state, categoria) {
    if (!categoria) return false;
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'blocca_cibo');
      if (valore && valore.trim().toLowerCase() === categoria) return true;
    }
    return false;
  }

  // ---------- ALLENAMENTO ----------

  // bonus_allenamento=<stat>:+N       (es. "forza:+1", Braccia di Ferro)
  // bonus_allenamento=qualsiasi:<stat>+N (es. "qualsiasi:int+1", Mente Analitica)
  //
  // Ritorna { extra: {forza,intelligenza,velocita,carisma} } cioe' TUTTI i bonus extra da
  // sommare al completamento di un allenamento della stat `statAllenata`: sia quelli mirati
  // alla stessa stat allenata, sia i "qualsiasi" (che vanno SEMPRE, su qualunque stat ci si
  // alleni, e possono dare bonus a UNA STAT DIVERSA, es. Mente Analitica da' +1 Int anche
  // allenando Velocita').
  function bonusAllenamentoExtra(state, statAllenata) {
    var somma = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t.indexOf('bonus_allenamento=') !== 0) continue;
        var valore = t.substring('bonus_allenamento='.length).trim();
        var due = valore.indexOf(':');
        if (due === -1) continue;
        var chiave = valore.substring(0, due).trim().toLowerCase();
        var resto = valore.substring(due + 1).trim();

        if (chiave === 'qualsiasi') {
          // "int+1": stat esplicita + valore, si applica ad OGNI allenamento qualunque sia
          // statAllenata (Mente Analitica: "impara da tutto")
          var parsedQ = parsePassivo(resto.replace(/\s+/g, ''));
          if (parsedQ) somma[parsedQ.stat] += parsedQ.valore;
          continue;
        }

        // chiave e' il nome della stat allenata richiesta (es. "forza"): si applica solo se
        // coincide con la stat che si sta allenando ORA.
        var statAlias = STAT_ALIAS_TALENTI[chiave] || (STAT_NOMI.indexOf(chiave) !== -1 ? chiave : null);
        if (!statAlias || statAlias !== statAllenata) continue;
        var mNum = resto.match(/([+-]\d+)/);
        if (mNum) somma[statAlias] += parseInt(mNum[1], 10);
      }
    }
    return somma;
  }

  // allenamento_durata=x0.5  (Fisico Bestiale: allenamento a meta' tempo)
  // Ritorna il moltiplicatore da applicare a DURATA_ALLENAMENTO_ORE (1 se nessun talento).
  function durataAllenamentoMult(state) {
    var attivi = talentiAttivi(state);
    var mult = 1;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'allenamento_durata');
      if (!valore) continue;
      var m = valore.match(/x\s*([\d.,]+)/i);
      if (m) mult *= parseFloat(m[1].replace(',', '.'));
    }
    return mult;
  }

  // allenamento_energia=+5  (Energico: l'allenamento DA' energia invece di toglierne)
  // Ritorna il delta energia da applicare al completamento allenamento AL POSTO del costo
  // normale (costoAllenamento), o null se nessun talento lo tocca (il chiamante allora usa
  // il comportamento di default, cioe' sottrarre il costo).
  function energiaAllenamentoOverride(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'allenamento_energia');
      if (!valore) continue;
      var m = valore.match(/([+-]\d+)/);
      if (m) return parseInt(m[1], 10); // es. +5: da restituire cosi' com'e' (il chiamante SOMMA)
    }
    return null;
  }

  // allenamenti_giorno=2  (Predestinato: 2 allenamenti/giorno invece di 1)
  // Ritorna il numero massimo di allenamenti "a tempo" concessi in un giorno (default 1).
  var ALLENAMENTI_GIORNO_DEFAULT = 1;

  function allenamentiPerGiorno(state) {
    var attivi = talentiAttivi(state);
    var max = ALLENAMENTI_GIORNO_DEFAULT;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'allenamenti_giorno');
      if (valore === null) continue;
      var n = parseInt(valore, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max;
  }

  // allenamento_extra=int (istantaneo, 1/giorno)  (Sete di Sapere: "Studio veloce")
  // Il token grezzo ha una parte descrittiva tra parentesi (v. talenti.md), qui ci serve solo
  // il nome della stat prima della parentesi. Ritorna il nome stat (es. "intelligenza") se il
  // pet ha questo talento, o null altrimenti.
  function allenamentoExtraStat(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'allenamento_extra');
      if (!valore) continue;
      var primaParola = valore.split(/[\s(]/)[0].trim().toLowerCase();
      var stat = STAT_ALIAS_TALENTI[primaParola] || (STAT_NOMI.indexOf(primaParola) !== -1 ? primaParola : null);
      if (stat) return stat;
    }
    return null;
  }

  // ---------- ENERGIA ----------

  // energia_decay=x0.5  (Energico: decadimento Energia dimezzato)
  // Ritorna il moltiplicatore da applicare al decadimento Energia in pet.applyDecay (1 se
  // nessun talento attivo lo tocca).
  function energiaDecayMult(state) {
    var attivi = talentiAttivi(state);
    var mult = 1;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'energia_decay');
      if (!valore) continue;
      var m = valore.match(/x\s*([\d.,]+)/i);
      if (m) mult *= parseFloat(m[1].replace(',', '.'));
    }
    return mult;
  }

  // ignora_rifiuto_energia  (Fisico Bestiale: mai rifiuto allenamento/missione per energia bassa)
  // Token booleano (nessun "="): presente/assente. Ritorna true se un talento attivo lo ha.
  function ignoraRifiutoEnergia(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        if ((effetti[j] || '').trim() === 'ignora_rifiuto_energia') return true;
      }
    }
    return false;
  }

  // ==================== REGISTRY token NON ancora agganciati (TODO batch futuri) ====================
  // Elenco di TUTTI i token del DSL "Dati" (v. content/talenti.md legenda in cima) che il
  // parser gia' legge dentro talento.effetti ma che NESSUN sistema di gioco applica ancora.
  // Non e' codice eseguito: e' documentazione viva + un piccolo helper (tokenNonAgganciati) per
  // scoprire a runtime quali effetti un pet ha "silenti", utile in debug/scheda.
  //
  // AGGIORNATO in questo batch (Gruppo A — Cibo/Allenamento/Energia): rimossi dalla lista
  // bonus_cibo, blocca_cibo, bonus_allenamento, allenamenti_giorno, allenamento_extra,
  // allenamento_durata, allenamento_energia, energia_decay, ignora_rifiuto_energia — ora
  // agganciati (v. sezione "GRUPPO A" sopra). Restano da fare:
  //
  //   bonus_missione=...      -> bonus per categoria di missione (stat/durata)
  //   ogni_missione=...       -> bonus fisso ad ogni missione completata, qualsiasi categoria
  //   mancia=...              -> moltiplicatore sulle mance post-missione (es. x3)
  //   login=...               -> bonus al login giornaliero (es. monete+10)
  //   furto=...                -> oggetto gratis giornaliero dal negozio (con o senza tetto)
  //   invenzione=...          -> Pool Inventore settimanale (salta allenamento, item casuale)
  //   perk_tag=...            -> niente-fallimento + super garantito su un TAG di missione
  //                              (non su una categoria: richiede i tag missione, non ancora
  //                              esistenti — v. PROTOTIPO-2.md Blocco 3/Blocco 9)
  //   blocca_categoria=...    -> esclude una categoria di missione dalla rosa
  //   igiene_felicita=inverti -> relazione Igiene<->Felicita' invertita (Idrofobico)
  //   immune_malus_condizioni -> mai malus Salute dai malus condizioni (Anima Candida)
  //   notte=ferite=0          -> azzera le Ferite ogni notte (Anima Candida)
  //   infermeria_costo=...    -> sconto sul costo dell'infermeria
  //   infermeria_cura=...     -> cura extra dall'infermeria
  //   risveglio=...           -> effetto automatico ad ogni risveglio (es. ferite-10)
  //   fallimento=...          -> annulla/modifica il malus di un fallimento missione
  //   se <cond>: ...          -> condizioni testuali libere (es. "se fallimento_carattere: ...",
  //                              "se igiene<50: ...") da interpretare caso per caso
  //   parole_giorno=...       -> aumenta il tetto di parole insegnabili al giorno
  //   uso_parola=...          -> probabilita' che il pet usi la parola imparata nelle battute
  //   nota=...                -> annotazioni testuali non meccaniche (es. "malus_salute_sporco_resta")
  //   bonus_missione_monete=... -> moltiplicatore monete da missioni (Cleptomane/Boss di Quartiere)
  //   missione_durata=...     -> moltiplicatore/offset sulla durata missione (Fulmine di Quartiere)
  //
  // Quando si implementa uno di questi in un batch futuro: aggiungere l'hook nel sistema
  // pertinente (missions.js/care.js/pet.js/dialog.js) SUL MODELLO di bonusStat/capCoccole sopra
  // (leggere talentiAttivi(state) -> trovaToken(...)) e rimuovere la voce da questa lista.

  var TOKEN_NON_AGGANCIATI = [
    'bonus_missione', 'ogni_missione', 'mancia', 'login',
    'furto', 'invenzione', 'perk_tag', 'blocca_categoria',
    'igiene_felicita', 'immune_malus_condizioni', 'notte',
    'infermeria_costo', 'infermeria_cura', 'risveglio', 'fallimento', 'bonus_missione_monete',
    'parole_giorno', 'uso_parola', 'nota', 'missione_durata'
  ];

  // Prefissi/token esatti ormai AGGANCIATI (passivo/cap_coccole dal batch precedente + il
  // Gruppo A di questo batch): usati da tokenNonAgganciati sotto per non segnalarli come
  // "silenti" nel debug/scheda, pur essendo ancora presenti come token grezzi in effetti[].
  var PREFISSI_AGGANCIATI = [
    'passivo=', 'cap_coccole=', 'bonus_cibo=', 'blocca_cibo=', 'bonus_allenamento=',
    'allenamenti_giorno=', 'allenamento_extra=', 'allenamento_durata=', 'allenamento_energia=',
    'energia_decay='
  ];
  var TOKEN_ESATTI_AGGANCIATI = ['ignora_rifiuto_energia'];

  // Ritorna, per i talenti attivi del pet, la lista di token grezzi presenti nei loro `effetti`
  // che NON sono tra quelli agganciati sopra — utile per il debug/scheda per segnalare "questo
  // talento ha effetti non ancora attivi in gioco".
  function tokenNonAgganciati(state) {
    var attivi = talentiAttivi(state);
    var out = [];
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t === '') continue;
        if (TOKEN_ESATTI_AGGANCIATI.indexOf(t) !== -1) continue;
        var aggancio = false;
        for (var k = 0; k < PREFISSI_AGGANCIATI.length; k++) {
          if (t.indexOf(PREFISSI_AGGANCIATI[k]) === 0) { aggancio = true; break; }
        }
        if (aggancio) continue;
        out.push({ talento: attivi[i].nome, token: t });
      }
    }
    return out;
  }

  window.PETQ.talenti = {
    estrai: estrai,
    _estraiDaTerna: estraiDaTerna,
    talentiAttivi: talentiAttivi,
    bonusStat: bonusStat,
    bonusStatTutte: bonusStatTutte,
    capCoccole: capCoccole,
    tokenNonAgganciati: tokenNonAgganciati,
    // Gruppo A (Cibo/Allenamento/Energia)
    bonusCiboExtra: bonusCiboExtra,
    ciboBloccato: ciboBloccato,
    bonusAllenamentoExtra: bonusAllenamentoExtra,
    durataAllenamentoMult: durataAllenamentoMult,
    energiaAllenamentoOverride: energiaAllenamentoOverride,
    allenamentiPerGiorno: allenamentiPerGiorno,
    allenamentoExtraStat: allenamentoExtraStat,
    energiaDecayMult: energiaDecayMult,
    ignoraRifiutoEnergia: ignoraRifiutoEnergia,
    _capCoccoleDefault: CAP_COCCOLE_DEFAULT,
    _allenamentiGiornoDefault: ALLENAMENTI_GIORNO_DEFAULT,
    _tokenNonAgganciatiRegistry: TOKEN_NON_AGGANCIATI,
    _trovaToken: trovaToken
  };

})();
