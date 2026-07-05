window.PETQ = window.PETQ || {};

(function () {

  // ==================== Talenti (PROTOTIPO 2, Blocco 9) ====================
  // Sistema NUOVO e DISTINTO dai perk di categoria (arredi.perkAttivi, Player One/Street
  // Fighter/Tony Hawk). I talenti definiscono la BUILD del pet: 1 estratto alla nascita dalla
  // terna della sua personalita', +1 estratto alla evoluzione teen (cumulativi, v.
  // content/talenti.md). Questo modulo copre SOLO: l'estrazione pesata 45/45/10 (usata da
  // pet.js generate/controllaEvoluzione) e i DUE effetti passivi semplici richiesti per questo
  // batch (bonus stat piatto, cap coccole). Tutti gli altri token del DSL "Dati" sono PARSATI
  // (v. content.js parseTalenti -> talento.effetti) ma NON agganciati: v. registry TODO in fondo.

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

  // ==================== REGISTRY token NON ancora agganciati (TODO batch futuri) ====================
  // Elenco di TUTTI i token del DSL "Dati" (v. content/talenti.md legenda in cima) che il
  // parser gia' legge dentro talento.effetti ma che NESSUN sistema di gioco applica ancora.
  // Non e' codice eseguito: e' documentazione viva + un piccolo helper (tokenNonAgganciati) per
  // scoprire a runtime quali effetti un pet ha "silenti", utile in debug/scheda.
  //
  //   bonus_cibo=...          -> bonus stat extra da categorie di cibo specifiche (es. carne+1)
  //   bonus_allenamento=...   -> bonus extra sull'allenamento di una stat (o "qualsiasi")
  //   bonus_missione=...      -> bonus per categoria di missione (stat/durata)
  //   ogni_missione=...       -> bonus fisso ad ogni missione completata, qualsiasi categoria
  //   mancia=...              -> moltiplicatore sulle mance post-missione (es. x3)
  //   login=...               -> bonus al login giornaliero (es. monete+10)
  //   furto=...                -> oggetto gratis giornaliero dal negozio (con o senza tetto)
  //   invenzione=...          -> Pool Inventore settimanale (salta allenamento, item casuale)
  //   perk_tag=...            -> niente-fallimento + super garantito su un TAG di missione
  //                              (non su una categoria: richiede i tag missione, non ancora
  //                              esistenti — v. PROTOTIPO-2.md Blocco 3/Blocco 9)
  //   blocca_cibo=...         -> impedisce di dare al pet una categoria di cibo
  //   blocca_categoria=...    -> esclude una categoria di missione dalla rosa
  //   allenamenti_giorno=...  -> permette 2 allenamenti/giorno invece di 1 (Predestinato)
  //   allenamento_extra=...   -> azione extra istantanea di allenamento (Sete di Sapere)
  //   allenamento_durata=...  -> moltiplicatore sulla durata dell'allenamento (es. x0.5)
  //   allenamento_energia=... -> l'allenamento DA' energia invece di toglierla (Energico)
  //   energia_decay=...       -> moltiplicatore sul decadimento Energia (Energico)
  //   ignora_rifiuto_energia  -> il pet non rifiuta mai missione/allenamento per Energia bassa
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
  //
  // Quando si implementa uno di questi in un batch futuro: aggiungere l'hook nel sistema
  // pertinente (missions.js/care.js/pet.js/dialog.js) SUL MODELLO di bonusStat/capCoccole sopra
  // (leggere talentiAttivi(state) -> trovaToken(...)) e rimuovere la voce da questa lista.

  var TOKEN_NON_AGGANCIATI = [
    'bonus_cibo', 'bonus_allenamento', 'bonus_missione', 'ogni_missione', 'mancia', 'login',
    'furto', 'invenzione', 'perk_tag', 'blocca_cibo', 'blocca_categoria', 'allenamenti_giorno',
    'allenamento_extra', 'allenamento_durata', 'allenamento_energia', 'energia_decay',
    'ignora_rifiuto_energia', 'igiene_felicita', 'immune_malus_condizioni', 'notte',
    'infermeria_costo', 'infermeria_cura', 'risveglio', 'fallimento', 'bonus_missione_monete',
    'parole_giorno', 'uso_parola', 'nota', 'missione_durata'
  ];

  // Ritorna, per i talenti attivi del pet, la lista di token grezzi presenti nei loro `effetti`
  // che NON sono ne' "passivo=" ne' "cap_coccole=" (i due agganciati) — utile per il debug/scheda
  // per segnalare "questo talento ha effetti non ancora attivi in gioco".
  function tokenNonAgganciati(state) {
    var attivi = talentiAttivi(state);
    var out = [];
    for (var i = 0; i < attivi.length; i++) {
      var effetti = attivi[i].effetti || [];
      for (var j = 0; j < effetti.length; j++) {
        var t = (effetti[j] || '').trim();
        if (t === '') continue;
        if (t.indexOf('passivo=') === 0 || t.indexOf('cap_coccole=') === 0) continue;
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
    _capCoccoleDefault: CAP_COCCOLE_DEFAULT,
    _tokenNonAgganciatiRegistry: TOKEN_NON_AGGANCIATI,
    _trovaToken: trovaToken
  };

})();
