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
      if (valGrezzo) {
        var parsed = parsePassivo(valGrezzo);
        if (parsed && typeof somma[parsed.stat] === 'number') {
          somma[parsed.stat] += parsed.valore;
        }
      }

      // Talenti (PROTOTIPO 2, Blocco 9, Gruppo C, "se igiene<50: passivo=int+2", Idrofobico):
      // passivo CONDIZIONALE, non un "passivo=" secco come sopra (il token e' un'unica stringa
      // libera "se igiene<50: passivo=int+2", stesso stile di "se fallimento_carattere: ..." in
      // badLoserEffetto). NB: va controllato SEMPRE per ogni talento (niente early-continue sopra
      // se manca il "passivo=" semplice: Idrofobico ha SOLO il condizionale, nessun "passivo="
      // piatto, quindi un continue anticipato lo salterebbe del tutto). Sommato qui dentro
      // bonusStatTutte (non in un helper separato) cosi' TUTTI i chiamanti esistenti (ui.js
      // statConBonus/scheda, missions.bonusStatCombinato) lo vedono gratis, dinamicamente.
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        var mCond = t.match(/^se\s+igiene\s*<\s*(\d+)\s*:\s*passivo\s*=\s*([a-z]+)\s*([+-]\d+)$/i);
        if (!mCond) continue;
        var soglia = parseInt(mCond[1], 10);
        var igieneAttuale = (state && state.pet && state.pet.stats && typeof state.pet.stats.igiene === 'number') ?
          state.pet.stats.igiene : 100; // fallback ottimistico: senza dato niente bonus condizionale
        if (igieneAttuale >= soglia) continue;
        var statAlias = STAT_ALIAS_TALENTI[mCond[2].toLowerCase()] || (STAT_NOMI.indexOf(mCond[2].toLowerCase()) !== -1 ? mCond[2].toLowerCase() : null);
        if (statAlias && typeof somma[statAlias] === 'number') somma[statAlias] += parseInt(mCond[3], 10);
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

  // ==================== GRUPPO B: Missioni & Economia (PROTOTIPO 2, Blocco 9) ====================
  // Stesso pattern del Gruppo A: talentiAttivi(state) -> trovaToken/scan di effetti[] -> parse
  // del valore grezzo, letto SEMPRE a runtime (mai bakeato). Gli hook lato missions.js/care.js
  // sono documentati nei commenti li' dove vengono chiamati.

  // Alias per i nomi di stat/risorsa usati nei token missione (in piu' rispetto a
  // STAT_ALIAS_TALENTI c'e' "monete", che non e' una stat RPG ma una risorsa: usata da
  // ogni_missione=monete+5 di Cuore Magnetico).
  var CHIAVE_ALIAS_MISSIONI = { int: 'intelligenza', forza: 'forza', velocita: 'velocita', carisma: 'carisma', monete: 'monete' };

  function chiaveMissioneValida(chiave) {
    return CHIAVE_ALIAS_MISSIONI[chiave] || (STAT_NOMI.indexOf(chiave) !== -1 ? chiave : null);
  }

  // ---------- ogni_missione=<stat|monete>+N (Spirito Agonistico, Mani Lestre, Cuore Magnetico) ----------
  // Ritorna { forza, intelligenza, velocita, carisma, monete } da sommare ad OGNI missione
  // completata (qualsiasi esito non-null: super/standard/fallimento), a prescindere dalla
  // categoria. Il chiamante (missions.risolvi) applica dopo aver scelto l'esito, sempre.
  function bonusOgniMissione(state) {
    var somma = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0, monete: 0 };
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t.indexOf('ogni_missione=') !== 0) continue;
        var valore = t.substring('ogni_missione='.length).trim();
        var m = valore.match(/^([a-z]+)\s*([+-]\d+)$/i);
        if (!m) continue;
        var chiave = chiaveMissioneValida(m[1].toLowerCase());
        if (!chiave) continue;
        somma[chiave] += parseInt(m[2], 10);
      }
    }
    return somma;
  }

  // ---------- bonus_missione=<categoria>:<stat>+N[,durata-1h] (Topo di Biblioteca, Pacifista) ----------
  // Formato osservato in talenti.md:
  //   "sociale:carisma+1"          -> categoria "sociale", +1 Carisma extra all'esito
  //   "studio:int+1,durata-1h"     -> categoria "studio", +1 Int extra all'esito E -1h di durata
  //                                    all'avvio della missione
  // Ritorna { statExtra: {forza,intelligenza,velocita,carisma}, durataDeltaH } per la CATEGORIA
  // passata (0/{} se nessun talento tocca quella categoria). durataDeltaH e' un numero di ORE
  // (negativo = accorcia), da sommare a quello globale di missioneDurataDeltaH.
  function bonusMissioneCategoria(state, categoria) {
    var statExtra = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var durataDeltaH = 0;
    if (!categoria) return { statExtra: statExtra, durataDeltaH: durataDeltaH };
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t.indexOf('bonus_missione=') !== 0) continue;
        var valore = t.substring('bonus_missione='.length).trim();
        var due = valore.indexOf(':');
        if (due === -1) continue;
        var catToken = valore.substring(0, due).trim().toLowerCase();
        if (catToken !== categoria) continue;
        var resto = valore.substring(due + 1).trim(); // "int+1,durata-1h" oppure "carisma+1"

        var parti = resto.split(',');
        for (var k = 0; k < parti.length; k++) {
          var p = parti[k].trim();
          var mStat = p.match(/^([a-z]+)\s*([+-]\d+)$/i);
          if (mStat) {
            var statAlias = STAT_ALIAS_TALENTI[mStat[1].toLowerCase()] || (STAT_NOMI.indexOf(mStat[1].toLowerCase()) !== -1 ? mStat[1].toLowerCase() : null);
            if (statAlias) statExtra[statAlias] += parseInt(mStat[2], 10);
            continue;
          }
          var mDurata = p.match(/^durata\s*([+-]?\d+(?:[.,]\d+)?)\s*h$/i);
          if (mDurata) {
            durataDeltaH += parseFloat(mDurata[1].replace(',', '.'));
          }
        }
      }
    }
    return { statExtra: statExtra, durataDeltaH: durataDeltaH };
  }

  // ---------- bonus_missione_monete=x1.5 (Cleptomane, Boss di Quartiere) ----------
  // Ritorna il moltiplicatore da applicare alle monete di reward di UNA missione (1 se nessun
  // talento attivo). Talenti.md non distingue "solo missioni a monete" da "tutte le missioni"
  // nel token (e' lo stesso token per entrambi, il testo cambia solo la descrizione): applicarlo
  // al token monete di reward quando c'e' basta, perche' se la missione non da' monete non c'e'
  // nessun token su cui moltiplicare.
  function bonusMissioneMoneteMult(state) {
    var attivi = talentiAttivi(state);
    var mult = 1;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'bonus_missione_monete');
      if (!valore) continue;
      var m = valore.match(/x\s*([\d.,]+)/i);
      if (m) mult *= parseFloat(m[1].replace(',', '.'));
    }
    return mult;
  }

  // ---------- mancia=x3 (Cuore Magnetico) ----------
  // Ritorna il moltiplicatore da applicare alla mancia post-missione (v. missions.calcolaMancia,
  // GDD "Economia": "mance post-missione che scalano col carisma", bilanciamento.md "Mancia
  // post-missione: 1 moneta ogni 5 punti di Carisma"). 1 se nessun talento la tocca.
  function manciaMult(state) {
    var attivi = talentiAttivi(state);
    var mult = 1;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'mancia');
      if (!valore) continue;
      var m = valore.match(/x\s*([\d.,]+)/i);
      if (m) mult *= parseFloat(m[1].replace(',', '.'));
    }
    return mult;
  }

  // ---------- login=monete+10 (Cuore Magnetico) ----------
  // Ritorna il bonus monete EXTRA da sommare al login giornaliero (0 se nessun talento attivo).
  function loginBonusMonete(state) {
    var attivi = talentiAttivi(state);
    var extra = 0;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'login');
      if (!valore) continue;
      var m = valore.match(/^monete\s*([+-]\d+)$/i);
      if (m) extra += parseInt(m[1], 10);
    }
    return extra;
  }

  // ---------- missione_durata=-1h (Fulmine di Quartiere) ----------
  // Ritorna il delta ORE globale (negativo = accorcia) da applicare a TUTTE le missioni, prima
  // del clamp al minimo di 1h fatto dal chiamante (missions.avvia). Combinabile col delta di
  // categoria di bonusMissioneCategoria (es. Fulmine + un ipotetico bonus_missione di categoria
  // si sommerebbero entrambi, anche se nessun talento attuale li unisce sullo stesso pet).
  function missioneDurataDeltaH(state) {
    var attivi = talentiAttivi(state);
    var delta = 0;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'missione_durata');
      if (!valore) continue;
      var m = valore.match(/^([+-]?\d+(?:[.,]\d+)?)\s*h$/i);
      if (m) delta += parseFloat(m[1].replace(',', '.'));
    }
    return delta;
  }

  // ---------- fallimento=fel-0 (Faccia di Bronzo) ----------
  // Booleano: true se un talento attivo annulla la perdita di Felicita' dei fallimenti missione.
  // NB combo voluta col -10 Felicita' extra di Bad Loser: quando entrambi sono attivi, questo
  // annulla ANCHE quell'extra (v. missions.risolvi, applicato per ultimo su tutto il delta fel
  // accumulato dal fallimento).
  function fallimentoFelBloccato(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'fallimento');
      if (valore && /^fel\s*-?0$/i.test(valore.trim())) return true;
    }
    return false;
  }

  // ---------- se fallimento_carattere: reward=x2, fel-10 (Bad Loser) ----------
  // Il token e' un'unica stringa libera (nessun "chiave=valore" pulito, v. talenti.md): la
  // riconosciamo per il prefisso fisso "se fallimento_carattere:" e ne ricaviamo i due numeri
  // (moltiplicatore reward, malus Felicita' estra) invece di hardcodarli, cosi' se il fondatore
  // ritocca i valori in talenti.md basta cambiare il testo, non il codice.
  // Ritorna { moltReward, felExtra } o null se il pet non ha questo talento.
  function badLoserEffetto(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t.toLowerCase().indexOf('se fallimento_carattere:') !== 0) continue;
        var resto = t.substring(t.indexOf(':') + 1).trim(); // "reward=x2, fel-10"
        var moltReward = 1;
        var felExtra = 0;
        var mMol = resto.match(/reward\s*=\s*x\s*([\d.,]+)/i);
        if (mMol) moltReward = parseFloat(mMol[1].replace(',', '.'));
        var mFel = resto.match(/fel\s*([+-]\d+)/i);
        if (mFel) felExtra = parseInt(mFel[1], 10);
        return { moltReward: moltReward, felExtra: felExtra };
      }
    }
    return null;
  }

  // ---------- blocca_categoria=combattimento (Pacifista) ----------
  // Ritorna true se un talento attivo esclude questa categoria dalla rosa del giorno.
  function categoriaBloccata(state, categoria) {
    if (!categoria) return false;
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'blocca_categoria');
      if (valore && valore.trim().toLowerCase() === categoria) return true;
    }
    return false;
  }

  // ---------- perk_tag=<tag> (Amante della Natura, Inventore) — STUB, attende tag missione P2 ----------
  // Il DSL missioni non ha ancora un campo "tag" (v. content/talenti.md "Dipendenze / da fare
  // in P2" e PROTOTIPO-2.md Blocco 3/Blocco 9): finche' non esiste, questo helper resta uno
  // stub che legge comunque il token (per non far sparire l'informazione dal debug/scheda) ma
  // NON applica nessun effetto di gioco. Quando il batch missioni aggiungera' il campo tag alle
  // schede, sostituire il corpo con la stessa logica di categoriaBloccata/scegliEsito (super
  // garantito + niente fallimento sulle missioni con quel tag, v. missions.scegliEsito).
  function perkTagAttivo(state, tag) {
    return false; // stub: nessun tag missione esiste ancora, sempre false per costruzione
  }

  // ==================== GRUPPO C: Salute, Sonno, Igiene, Parole (PROTOTIPO 2, Blocco 9) ====================
  // Stesso pattern dei gruppi precedenti: talentiAttivi(state) -> trovaToken/scan di effetti[]
  // -> parse del valore grezzo, letto SEMPRE a runtime (mai bakeato). Gli hook lato
  // pet.js/care.js/dialog.js sono documentati nei commenti li' dove vengono chiamati.

  // ---------- immune_malus_condizioni (Anima Candida) ----------
  // Booleano: true se un talento attivo azzera il malus Salute da malus condizioni (fame/igiene/
  // energia basse prolungate, cacca accumulata, dieta squilibrata). Usato da pet.malusCondizioni
  // per ritornare 0 SENZA nemmeno calcolare i singoli malus (il pet resta comunque "sporco" o
  // "affamato" nelle stat dirette, solo il malus SALUTE aggiuntivo sparisce).
  function immuneMalusCondizioni(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        if ((effetti[j] || '').trim() === 'immune_malus_condizioni') return true;
      }
    }
    return false;
  }

  // ---------- notte=ferite=0 (Anima Candida) ----------
  // Booleano: true se un talento attivo azzera le Ferite ad ogni nuovo giorno (invece della
  // guarigione naturale -5, v. pet.guarisciGiorno). Il chiamante (care.dailyLogin) decide se
  // azzerare del tutto o sommare alla guarigione normale: qui ritorniamo solo "il pet ha questo
  // talento", la MECCANICA (azzerare vs sottrarre) resta nel chiamante per restare vicino al
  // pattern esistente (stesso principio di ignoraRifiutoEnergia/energiaAllenamentoOverride: il
  // modulo talenti dice COSA, il modulo di gioco decide COME applicarlo allo stato).
  function azzeraFeriteNotte(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (/^notte\s*=\s*ferite\s*=\s*0$/i.test(t)) return true;
      }
    }
    return false;
  }

  // ---------- infermeria_costo=-5 / infermeria_cura=+10 (Infermiere Provetto) ----------
  // infermeriaModCosto: delta da SOMMARE al costo base dell'infermeria (care.CURA_COSTO), es.
  // -5 -> 15-5=10. infermeriaModCura: delta da SOMMARE alle Ferite ridotte dalla cura
  // (care.CURA_FERITE_RIDOTTE), es. +10 -> 30+10=40. Entrambi 0 se nessun talento li tocca.
  function infermeriaModCosto(state) {
    var attivi = talentiAttivi(state);
    var delta = 0;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'infermeria_costo');
      if (!valore) continue;
      var m = valore.match(/^([+-]?\d+)$/);
      if (m) delta += parseInt(m[1], 10);
    }
    return delta;
  }

  function infermeriaModCura(state) {
    var attivi = talentiAttivi(state);
    var delta = 0;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'infermeria_cura');
      if (!valore) continue;
      var m = valore.match(/^([+-]?\d+)$/);
      if (m) delta += parseInt(m[1], 10);
    }
    return delta;
  }

  // ---------- risveglio=ferite-10 (Infermiere Provetto) ----------
  // Ritorna il delta Ferite (gia' col segno, es. -10) da applicare ad OGNI risveglio dal sonno,
  // o 0 se nessun talento attivo lo tocca. Il chiamante (pet.risolviRisveglio) somma questo
  // delta a state.ferite (clampato) dopo aver applicato l'energia del risveglio.
  function risveglioFeriteDelta(state) {
    var attivi = talentiAttivi(state);
    var delta = 0;
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        var m = t.match(/^risveglio\s*=\s*ferite\s*([+-]\d+)$/i);
        if (m) delta += parseInt(m[1], 10);
      }
    }
    return delta;
  }

  // ---------- igiene_felicita=inverti (Idrofobico) ----------
  // Booleano: true se un talento attivo inverte la relazione Igiene<->Felicita'. Usato SOLO da
  // pet.applyDecay per la parte Felicita' del decadimento: il malus Salute da sporco (v.
  // malusCondizioni "igieneBassaMalus") NON e' toccato da questo helper (resta invariato, e' il
  // contrappeso voluto dal design, v. talenti.md "nota=malus_salute_sporco_resta").
  function igieneFelicitaInvertita(state) {
    var attivi = talentiAttivi(state);
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'igiene_felicita');
      if (valore && valore.trim().toLowerCase() === 'inverti') return true;
    }
    return false;
  }

  // ---------- parole_giorno=4 (Cervellone) ----------
  // Ritorna il numero massimo di parole insegnabili al giorno (default 1, 4 con Cervellone).
  var PAROLE_GIORNO_DEFAULT = 1;

  function parolePerGiorno(state) {
    var attivi = talentiAttivi(state);
    var max = PAROLE_GIORNO_DEFAULT;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'parole_giorno');
      if (valore === null) continue;
      var n = parseInt(valore, 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return max;
  }

  // ---------- uso_parola=50% (Cervellone) ----------
  // Ritorna la probabilita' [0,1] che il pet usi una parola imparata nelle battute contestuali
  // (default = valore base di bilanciamento.md "Frequenza uso parola imparata", 30%; 50% con
  // Cervellone). dialog.js legge questo helper invece di usare la costante PROB_PAROLA fissa.
  var USO_PAROLA_BASE = 0.30;

  function usoParolaProb(state) {
    var attivi = talentiAttivi(state);
    var prob = USO_PAROLA_BASE;
    for (var i = 0; i < attivi.length; i++) {
      var valore = trovaToken(attivi[i].effetti, 'uso_parola');
      if (!valore) continue;
      var m = valore.match(/^(\d+(?:[.,]\d+)?)\s*%$/);
      if (m) {
        var p = parseFloat(m[1].replace(',', '.')) / 100;
        if (p > prob) prob = p; // vince il piu' alto, stesso principio di allenamentiPerGiorno
      }
    }
    return prob;
  }

  // ==================== REGISTRY token NON ancora agganciati (TODO batch futuri) ====================
  // Elenco di TUTTI i token del DSL "Dati" (v. content/talenti.md legenda in cima) che il
  // parser gia' legge dentro talento.effetti ma che NESSUN sistema di gioco applica ancora.
  // Non e' codice eseguito: e' documentazione viva + un piccolo helper (tokenNonAgganciati) per
  // scoprire a runtime quali effetti un pet ha "silenti", utile in debug/scheda.
  //
  // AGGIORNATO in questo batch (Gruppo B — Missioni/Economia): rimossi dalla lista bonus_missione,
  // ogni_missione, mancia, login, blocca_categoria, fallimento, bonus_missione_monete e il token
  // libero "se fallimento_carattere: ..." (Bad Loser) — ora agganciati (v. sezione "GRUPPO B"
  // sopra). perk_tag resta in lista ma con un HELPER STUB gia' pronto (perkTagAttivo, sempre
  // false): aspetta i tag missione del batch missioni P2, v. nota dedicata sotto. Restano da fare:
  //
  //   furto=...                -> oggetto gratis giornaliero dal negozio (con o senza tetto)
  //   invenzione=...          -> Pool Inventore settimanale (salta allenamento, item casuale)
  //   perk_tag=...            -> [STUB pronto, v. perkTagAttivo] niente-fallimento + super
  //                              garantito su un TAG di missione (non su una categoria: richiede
  //                              i tag missione, non ancora esistenti — v. PROTOTIPO-2.md Blocco
  //                              3/Blocco 9. Talenti coinvolti: Amante della Natura, Inventore.
  //                              NON aggiungere il campo tag al DSL missioni qui: lo fa il batch
  //                              missioni; questo modulo si limita allo stub finche' non esiste)
  //   nota=...                -> annotazioni testuali non meccaniche (es. "malus_salute_sporco_resta")
  //
  // AGGIORNATO in questo batch (Gruppo C — Salute/Sonno/Igiene/Parole): rimossi dalla lista
  // igiene_felicita, immune_malus_condizioni, notte, infermeria_costo, infermeria_cura,
  // risveglio, parole_giorno, uso_parola — ora agganciati (v. sezione "GRUPPO C" sopra). Restano
  // SOLO furto/invenzione (da fare), perk_tag (stub pronto) e nota (solo descrittivo, mai
  // meccanico per design: v. talenti.md "malus_salute_sporco_resta", che documenta che il malus
  // Salute da sporco di Idrofobico resta invariato apposta, non e' un token da agganciare).
  //
  // Quando si implementa uno di questi in un batch futuro: aggiungere l'hook nel sistema
  // pertinente (missions.js/care.js/pet.js/dialog.js) SUL MODELLO di bonusStat/capCoccole sopra
  // (leggere talentiAttivi(state) -> trovaToken(...)) e rimuovere la voce da questa lista.

  var TOKEN_NON_AGGANCIATI = [
    'furto', 'invenzione', 'perk_tag (stub pronto, attende tag missione P2)',
    'nota (solo descrittivo, mai meccanico per design)'
  ];

  // Prefissi/token esatti ormai AGGANCIATI (passivo/cap_coccole dal batch core + Gruppo A +
  // Gruppo B + Gruppo C di questo batch): usati da tokenNonAgganciati sotto per non segnalarli
  // come "silenti" nel debug/scheda, pur essendo ancora presenti come token grezzi in effetti[].
  // perk_tag= resta escluso (e' un prefisso agganciato "a meta'": letto ma senza effetto finche'
  // non esistono i tag missione), quindi NON e' nella lista qui sotto apposta, cosi'
  // tokenNonAgganciati continua a segnalarlo come "silente" finche' non fa davvero qualcosa.
  var PREFISSI_AGGANCIATI = [
    'passivo=', 'cap_coccole=', 'bonus_cibo=', 'blocca_cibo=', 'bonus_allenamento=',
    'allenamenti_giorno=', 'allenamento_extra=', 'allenamento_durata=', 'allenamento_energia=',
    'energia_decay=', 'bonus_missione=', 'ogni_missione=', 'mancia=', 'login=',
    'blocca_categoria=', 'fallimento=', 'bonus_missione_monete=', 'missione_durata=',
    'igiene_felicita=', 'infermeria_costo=', 'infermeria_cura=', 'parole_giorno=', 'uso_parola='
  ];
  var TOKEN_ESATTI_AGGANCIATI = ['ignora_rifiuto_energia', 'immune_malus_condizioni'];

  // Prefisso libero agganciato (non "chiave=valore" pulito, v. badLoserEffetto): riconosciuto a
  // parte perche' PREFISSI_AGGANCIATI/TOKEN_ESATTI_AGGANCIATI sopra coprono solo i due formati
  // regolari. Gruppo C aggiunge "notte=ferite=0" (chiave=valore=valore, non nel formato "chiave=
  // valore" semplice di trovaToken) e "risveglio=ferite-10" (chiave=stat-N, non chiave=+/-numero
  // come infermeria_costo/cura) e il token libero "se igiene<...: passivo=..." (Idrofobico).
  var PREFISSI_LIBERI_AGGANCIATI = ['se fallimento_carattere:', 'notte=ferite=0', 'risveglio=ferite', 'se igiene<'];

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
        var liberoAgganciato = false;
        for (var p = 0; p < PREFISSI_LIBERI_AGGANCIATI.length; p++) {
          if (t.toLowerCase().indexOf(PREFISSI_LIBERI_AGGANCIATI[p]) === 0) { liberoAgganciato = true; break; }
        }
        if (liberoAgganciato) continue;
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
    // Gruppo B (Missioni & Economia)
    bonusOgniMissione: bonusOgniMissione,
    bonusMissioneCategoria: bonusMissioneCategoria,
    bonusMissioneMoneteMult: bonusMissioneMoneteMult,
    manciaMult: manciaMult,
    loginBonusMonete: loginBonusMonete,
    missioneDurataDeltaH: missioneDurataDeltaH,
    fallimentoFelBloccato: fallimentoFelBloccato,
    badLoserEffetto: badLoserEffetto,
    categoriaBloccata: categoriaBloccata,
    perkTagAttivo: perkTagAttivo,
    // Gruppo C (Salute/Sonno/Igiene/Parole)
    immuneMalusCondizioni: immuneMalusCondizioni,
    azzeraFeriteNotte: azzeraFeriteNotte,
    infermeriaModCosto: infermeriaModCosto,
    infermeriaModCura: infermeriaModCura,
    risveglioFeriteDelta: risveglioFeriteDelta,
    igieneFelicitaInvertita: igieneFelicitaInvertita,
    parolePerGiorno: parolePerGiorno,
    usoParolaProb: usoParolaProb,
    _capCoccoleDefault: CAP_COCCOLE_DEFAULT,
    _allenamentiGiornoDefault: ALLENAMENTI_GIORNO_DEFAULT,
    _paroleGiornoDefault: PAROLE_GIORNO_DEFAULT,
    _usoParolaBase: USO_PAROLA_BASE,
    _tokenNonAgganciatiRegistry: TOKEN_NON_AGGANCIATI,
    _trovaToken: trovaToken
  };

})();
