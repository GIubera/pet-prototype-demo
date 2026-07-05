window.PETQ = window.PETQ || {};

(function () {

  var PERSONALITA_FILES = ['gentile', 'maleducato', 'nerd', 'sportivo'];

  var SEZIONE_MAP = [
    { match: 'notifica valigia', chiave: 'notifica_valigia' },
    { match: 'valigia', chiave: 'valigia' },
    { match: 'rientro', chiave: 'rientro' },
    { match: 'addio', chiave: 'addio' },
    { match: 'evoluzione', chiave: 'evoluzione' },
    { match: 'saluto', chiave: 'saluto' },
    { match: 'ha fame', chiave: 'fame' },
    { match: 'sporco', chiave: 'sporco' },
    { match: 'felice', chiave: 'felice' },
    { match: 'coccole finite', chiave: 'coccole_finite' },
    { match: 'trascurato', chiave: 'triste' },
    { match: 'parte per la missione', chiave: 'missione_partenza' },
    { match: 'ritorno: successo', chiave: 'missione_successo' },
    { match: 'ritorno: fallimento', chiave: 'missione_fallimento' },
    { match: 'notifica', chiave: 'notifica' },
    { match: 'parola imparata', chiave: 'parola' },
    { match: 'ha sonno', chiave: 'sonno' },
    { match: 'va a dormire', chiave: 'dormire' },
    { match: 'sveglia', chiave: 'sveglia' },
    { match: 'dormito male', chiave: 'dormito_male' }
  ];

  var SEZIONE_CHIAVI = ['saluto', 'fame', 'sporco', 'felice', 'coccole_finite', 'triste',
    'missione_partenza', 'missione_successo', 'missione_fallimento', 'notifica', 'parola',
    'valigia', 'notifica_valigia', 'rientro', 'addio', 'evoluzione',
    'sonno', 'dormire', 'sveglia', 'dormito_male'];

  var DEFAULT_BILANCIAMENTO = {
    decadimento: { fame: 6, igiene: 8, felicita: 2 },
    soglie: { critica: 25, magro: 30, sporco: 30, malusSalute: 40, sovralimentazione: 90 },
    economia: { login: 10, monetePartenza: 50 },
    allenamento: { sessioni: 1, effetto: 1, felicita: 5 },
    iniziali: { benessere: 70, budget: 3, firma: 1 },
    energia_sonno: {
      decadimento: 2,
      costoMissionePerOra: 8,
      costoAllenamento: 10,
      sogliaRifiuto: 20,
      oraLetto: 21,
      oraCrollo: 23,
      riposinoDurataMax: 2,
      riposinoDurataMin: 1,
      riposinoRecuperoOra: 15,
      sveglioAutonomoOre: 8,
      sonnoMinimoOre: 5,
      risveglioBuono: 100,
      risveglioCattivo: 70
    }
  };

  function vuotaPersonalita() {
    var p = {};
    for (var i = 0; i < SEZIONE_CHIAVI.length; i++) p[SEZIONE_CHIAVI[i]] = [];
    return p;
  }

  window.PETQ.content = {
    data: {
      personalita: {},
      cibi: [],
      arredi: [],
      bilanciamento: null,
      missioni: []
    },
    load: load,
    _parseBilanciamento: parseBilanciamento // esposto per test di parsing (pattern _get*/_assert* del codebase)
  };

  function load(callback) {
    var percorsi = [];
    for (var i = 0; i < PERSONALITA_FILES.length; i++) {
      percorsi.push('personalita/' + PERSONALITA_FILES[i]);
    }
    percorsi.push('cibi');
    percorsi.push('arredi');
    percorsi.push('bilanciamento');
    percorsi.push('missioni');

    caricaTutti(percorsi, function (raw) {
      var data = window.PETQ.content.data;

      data.personalita = {};
      for (var i = 0; i < PERSONALITA_FILES.length; i++) {
        var nomeFile = PERSONALITA_FILES[i];
        var testo = raw['personalita/' + nomeFile] || '';
        data.personalita[nomeFile] = parsePersonalita(testo);
      }

      data.cibi = parseCibi(raw['cibi'] || '');
      data.arredi = parseArredi(raw['arredi'] || '');
      data.missioni = parseMissioni(raw['missioni'] || '');

      var bilOk = null;
      try {
        bilOk = parseBilanciamento(raw['bilanciamento'] || '');
      } catch (e) {
        bilOk = null;
      }
      if (bilOk) {
        data.bilanciamento = bilOk;
      } else {
        console.warn('PETQ.content: parse bilanciamento fallito, uso i default');
        data.bilanciamento = clona(DEFAULT_BILANCIAMENTO);
      }

      if (typeof callback === 'function') callback();
    });
  }

  // ---------- dual loader ----------

  function caricaTutti(percorsi, doneCb) {
    if (location.protocol === 'file:') {
      var raw = window.CONTENT_RAW || {};
      var out = {};
      for (var i = 0; i < percorsi.length; i++) {
        out[percorsi[i]] = raw[percorsi[i]] || '';
      }
      doneCb(out);
      return;
    }

    var risultati = {};
    var rimanenti = percorsi.length;
    if (rimanenti === 0) { doneCb(risultati); return; }

    percorsi.forEach(function (p) {
      fetch('../content/' + p + '.md')
        .then(function (res) { return res.ok ? res.text() : ''; })
        .catch(function () { return ''; })
        .then(function (testo) {
          risultati[p] = testo;
          rimanenti--;
          if (rimanenti === 0) doneCb(risultati);
        });
    });
  }

  // ---------- parser battute (personalita) ----------

  function parsePersonalita(testo) {
    var out = vuotaPersonalita();
    if (!testo) return out;

    var righe = testo.split(/\r?\n/);
    var chiaveCorrente = null;

    for (var i = 0; i < righe.length; i++) {
      var riga = righe[i].trim();
      if (riga === '') continue;

      if (riga.indexOf('## ') === 0) {
        var titolo = riga.substring(3).trim();
        chiaveCorrente = mappaSezione(titolo);
        continue;
      }

      if (riga.indexOf('- ') === 0 && chiaveCorrente) {
        var battuta = riga.substring(2).trim();
        battuta = battuta.replace(/^\[ESEMPIO\]\s*/i, '');
        if (battuta !== '') {
          out[chiaveCorrente].push(battuta);
        }
      }
    }

    return out;
  }

  function mappaSezione(titolo) {
    var t = titolo.toLowerCase();
    for (var i = 0; i < SEZIONE_MAP.length; i++) {
      if (t.indexOf(SEZIONE_MAP[i].match) !== -1) {
        return SEZIONE_MAP[i].chiave;
      }
    }
    return null;
  }

  // ---------- parser tabelle md (utility comune) ----------

  // Estrae la prima tabella markdown del testo: ritorna { header:[...], righe:[[...],[...]] }
  function primaTabella(testo) {
    if (!testo) return null;
    var righe = testo.split(/\r?\n/);
    var righeTabella = [];
    var dentro = false;

    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].trim();
      var eRigaTabella = r.indexOf('|') !== -1;

      if (!dentro && eRigaTabella) {
        dentro = true;
      } else if (dentro && !eRigaTabella) {
        break;
      }

      if (dentro) righeTabella.push(r);
    }

    if (righeTabella.length < 2) return null;

    var header = splitCelle(righeTabella[0]);
    var corpo = [];
    for (var j = 1; j < righeTabella.length; j++) {
      if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(righeTabella[j])) continue; // riga separatore ---
      var celle = splitCelle(righeTabella[j]);
      if (celle.length === 0) continue;
      corpo.push(celle);
    }

    return { header: header, righe: corpo };
  }

  // Estrae TUTTE le tabelle markdown del testo (blocchi di righe contenenti "|"
  // separati da almeno una riga non-tabella): ritorna un array di { header:[...], righe:[[...],[...]] }.
  // Utile per content/arredi.md che ha due tabelle con lo stesso header da concatenare.
  function tutteLeTabelle(testo) {
    if (!testo) return [];
    var righe = testo.split(/\r?\n/);
    var risultati = [];
    var blocco = [];

    function chiudiBlocco() {
      if (blocco.length >= 2) {
        var header = splitCelle(blocco[0]);
        var corpo = [];
        for (var j = 1; j < blocco.length; j++) {
          if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(blocco[j])) continue; // riga separatore ---
          var celle = splitCelle(blocco[j]);
          if (celle.length === 0) continue;
          corpo.push(celle);
        }
        if (corpo.length > 0) risultati.push({ header: header, righe: corpo });
      }
      blocco = [];
    }

    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].trim();
      var eRigaTabella = r.indexOf('|') !== -1;
      if (eRigaTabella) {
        blocco.push(r);
      } else if (blocco.length > 0) {
        chiudiBlocco();
      }
    }
    chiudiBlocco();

    return risultati;
  }

  function splitCelle(riga) {
    var r = riga.trim();
    if (r.indexOf('|') === 0) r = r.substring(1);
    if (r.lastIndexOf('|') === r.length - 1) r = r.substring(0, r.length - 1);
    var parti = r.split('|');
    var out = [];
    for (var i = 0; i < parti.length; i++) out.push(parti[i].trim());
    return out;
  }

  function primoNumero(testo) {
    if (!testo) return 0;
    var m = testo.match(/-?\d+([.,]\d+)?/);
    if (!m) return 0;
    return parseFloat(m[0].replace(',', '.'));
  }

  function tuttiINumeri(testo) {
    if (!testo) return [];
    var m = testo.match(/-?\d+([.,]\d+)?/g);
    if (!m) return [];
    return m.map(function (s) { return parseFloat(s.replace(',', '.')); });
  }

  // ---------- parser cibi ----------
  // Colonne attese per posizione: Nome | Categoria | Costo | +Fame | +Stat RPG | Note

  function parseCibi(testo) {
    var tabella = primaTabella(testo);
    if (!tabella) return [];

    var out = [];
    for (var i = 0; i < tabella.righe.length; i++) {
      var c = tabella.righe[i];
      if (c.length < 5) continue;

      var nome = c[0] || '';
      if (nome === '') continue;

      var categoria = (c[1] || '').toLowerCase();
      var costo = primoNumero(c[2]);
      var fame = primoNumero(c[3]);

      var celStat = c[4] || '';
      var statInfo = estraiStatRpg(celStat);

      out.push({
        nome: nome,
        categoria: categoria,
        costo: costo,
        fame: fame,
        stat: statInfo.valore,
        statNome: statInfo.nome
      });
    }
    return out;
  }

  var STAT_ALIAS = [
    { match: 'forza', nome: 'forza' },
    { match: 'intelligen', nome: 'intelligenza' },
    { match: 'veloc', nome: 'velocita' },
    { match: 'carisma', nome: 'carisma' }
  ];

  function estraiStatRpg(cella) {
    var t = (cella || '').toLowerCase();
    for (var i = 0; i < STAT_ALIAS.length; i++) {
      if (t.indexOf(STAT_ALIAS[i].match) !== -1) {
        return { nome: STAT_ALIAS[i].nome, valore: primoNumero(cella) };
      }
    }
    return { nome: null, valore: 0 };
  }

  // ---------- parser arredi ----------
  // Colonne attese per posizione: Nome | Stanza | Razza | Rarita | Come si ottiene | Bonus
  // content/arredi.md ha DUE tabelle separate con lo stesso header: si concatenano tutte
  // le righe di tutte le tabelle trovate (tutteLeTabelle), non solo la prima.

  function parseArredi(testo) {
    var tabelle = tutteLeTabelle(testo);
    if (tabelle.length === 0) return [];

    var out = [];
    for (var t = 0; t < tabelle.length; t++) {
      var tabella = tabelle[t];
      for (var i = 0; i < tabella.righe.length; i++) {
        var c = tabella.righe[i];
        if (c.length < 6) continue;

        var nome = c[0] || '';
        if (nome === '') continue;

        var bonusRaw = c[5] || '';
        var estratto = null;
        try {
          estratto = estraiBonusArredo(bonusRaw);
        } catch (e) {
          console.warn('PETQ.content: bonus arredo non parsabile per "' + nome + '": "' + bonusRaw + '"', e);
        }
        if (!estratto) {
          estratto = { bonusStat: null, bonusValore: 0, perk: null, soloCollezione: false, effettoSpeciale: null };
        }

        var fonte = c[4] || '';
        var mSostituisce = fonte.match(/sostituisce\s+(?:l['’]|la\s+|il\s+)?([A-Za-zÀ-ú]+)/i);

        out.push({
          nome: nome,
          stanza: (c[1] || '').toLowerCase(),
          razza: (c[2] || '').toLowerCase(),
          rarita: (c[3] || '').toLowerCase(),
          fonte: fonte,
          bonus: bonusRaw,
          bonusStat: estratto.bonusStat,
          bonusValore: estratto.bonusValore,
          perk: estratto.perk,
          soloCollezione: estratto.soloCollezione,
          effettoSpeciale: estratto.effettoSpeciale,
          sostituisceParziale: mSostituisce ? mSostituisce[1].trim() : null,
          sostituisce: null
        });
      }
    }

    // risolve il nome parziale ("Fascia", "Album") al nome esatto della tabella
    // (es. "Fascia da martial artist", "Album da disegno") cercando un arredo il cui
    // nome CONTIENE la parola indicata dopo "sostituisce" nella colonna fonte.
    for (var s = 0; s < out.length; s++) {
      if (!out[s].sostituisceParziale) continue;
      var parziale = out[s].sostituisceParziale.toLowerCase();
      var match = null;
      for (var k = 0; k < out.length; k++) {
        if (k === s) continue;
        if (out[k].nome.toLowerCase().indexOf(parziale) !== -1) { match = out[k].nome; break; }
      }
      if (match) {
        out[s].sostituisce = match;
      } else {
        console.warn('PETQ.content: "sostituisce ' + out[s].sostituisceParziale + '" non risolto per arredo "' + out[s].nome + '"');
      }
    }

    return out;
  }

  // Estrae dal testo libero della colonna "Bonus" di arredi.md i campi strutturati
  // usati dal motore missioni/arredi: bonusStat/bonusValore (passivo su stat),
  // perk (categoria sbloccata se piazzato), soloCollezione (nessun bonus meccanico),
  // effettoSpeciale (testo libero riconosciuto o raw se non riconosciuto).
  function estraiBonusArredo(testo) {
    var t = (testo || '').trim();
    var out = { bonusStat: null, bonusValore: 0, perk: null, soloCollezione: false, effettoSpeciale: null };

    if (t === '' || t === '—' || t === '-') {
      out.soloCollezione = true;
      return out;
    }
    if (/solo collezione/i.test(t)) {
      out.soloCollezione = true;
    }

    // bonus passivo su stat: "+1 Forza passiva", "+2 Intelligenza passiva", "+1 Velocità passiva", ecc.
    // (nota: [a-zà-ù]* invece di \w* perche' \w non copre le lettere accentate italiane)
    var mBonus = t.match(/([+-]?\d+)\s*(forza|intelligen[a-zà-ù]*|veloc[a-zà-ù]*|carisma)\s*passiv/i);
    if (mBonus) {
      out.bonusValore = parseInt(mBonus[1], 10);
      var statoStat = mBonus[2].toLowerCase();
      if (statoStat.indexOf('veloc') === 0) out.bonusStat = 'velocita';
      else if (statoStat.indexOf('intelligen') === 0) out.bonusStat = 'intelligenza';
      else out.bonusStat = statoStat;
    }

    // perk: "perk Videogioco" / "perk Combattimento" / "perk Sport"
    var mPerk = t.match(/perk\s+(videogioco|combattimento|sport)/i);
    if (mPerk) out.perk = mPerk[1].toLowerCase();

    // effetti speciali riconosciuti (non ancora tutti implementati nel motore: quelli
    // con chiave dedicata sono pronti per essere agganciati senza ritoccare il parser)
    if (/dimezza calo igiene/i.test(t)) {
      out.effettoSpeciale = 'igiene_dimezza_pioggia';
    } else if (/felicit[aà]\s*passiva/i.test(t)) {
      out.effettoSpeciale = 'felicita_passiva';
      out.bonusValore = primoNumero(t) || 1;
    } else if (/sconto cibo/i.test(t)) {
      out.effettoSpeciale = 'sconto_cibo';
      out.bonusValore = primoNumero(t) || 10;
    } else if (/igiene.*extra.*lavaggio/i.test(t)) {
      out.effettoSpeciale = 'igiene_extra_lavaggio';
      out.bonusValore = primoNumero(t) || 5;
    } else if (!mBonus && !mPerk && !out.soloCollezione) {
      // testo libero non riconosciuto: lo teniamo come effetto speciale raw, segnalando
      console.warn('PETQ.content: bonus arredo non riconosciuto, tenuto come testo libero: "' + t + '"');
      out.effettoSpeciale = t;
    }

    return out;
  }

  // ---------- parser missioni ----------
  // Formato atteso (v. docs/SPEC-MODULO-MISSIONI.md): schede separate da "## Missione N ...",
  // righe tecniche "Dati: ..." (scheda-livello e per-esito), blocchi esito introdotti da "**Nome**",
  // prosa in "Testo:"/"Scena:". M0 (tutorial) ha un pattern diverso: righe "- Dati: cond=... ; reward=..."
  // multiple che condividono lo stesso Testo/Scena finali (slot {oggetto}).

  function parseMissioni(testo) {
    var out = [];
    if (!testo) return out;

    var righe = testo.split(/\r?\n/);

    // individua i blocchi "## Missione ..." (ignora backlog/linee guida fuori da questi blocchi
    // perche' non iniziano con "## Missione")
    var blocchi = [];
    var corrente = null;
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i];
      var mTitolo = r.match(/^##\s+Missione\s+(\d+)/i);
      if (mTitolo) {
        if (corrente) blocchi.push(corrente);
        corrente = { numero: parseInt(mTitolo[1], 10), titoloRiga: r.trim(), righe: [] };
        continue;
      }
      if (r.indexOf('## ') === 0) {
        // altra sezione di secondo livello (backlog, linee guida): chiude il blocco corrente
        if (corrente) { blocchi.push(corrente); corrente = null; }
        continue;
      }
      if (corrente) corrente.righe.push(r);
    }
    if (corrente) blocchi.push(corrente);

    for (var b = 0; b < blocchi.length; b++) {
      try {
        var scheda = parseSchedaMissione(blocchi[b]);
        if (scheda) out.push(scheda);
      } catch (e) {
        console.warn('PETQ.content: errore parsing scheda missione, la salto', e);
      }
    }

    return out;
  }

  function parseSchedaMissione(blocco) {
    var titolo = blocco.titoloRiga.replace(/^##\s+/, '').trim();
    var id = 'm' + blocco.numero;
    var isTutorial = /tutorial/i.test(titolo);
    var fuoriRosa = /fuori rosa/i.test(titolo);

    var scheda = {
      id: id,
      numero: blocco.numero,
      titolo: titolo,
      tutorial: isTutorial,
      fuoriRosa: fuoriRosa || isTutorial,
      luogo: '',
      razza: 'entrambe',
      categoria: null,
      stat: [],
      durata: null,
      durataMs: 0,
      costo: 0,
      esiti: []
    };

    // 1) riga Dati: scheda-livello: la prima riga "Dati:" (con o senza "- ") che contiene
    // durata=/costo=/categoria=/stat=/tutorial= e NON contiene "cond=" (quella e' gia' un esito)
    var righe = blocco.righe;
    var idxDatiScheda = -1;
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].trim();
      var isDati = /^-?\s*Dati:/i.test(r);
      if (isDati && !/cond\s*=/.test(r)) {
        var contenuto = r.replace(/^-?\s*Dati:/i, '');
        applicaDatiScheda(scheda, contenuto);
        idxDatiScheda = i;
        break;
      }
    }

    if (!scheda.tutorial && (!scheda.durata || !(scheda.durataMs > 0))) {
      console.warn('PETQ.content: durata mancante o non valida per ' + scheda.id + ', uso default 1h');
      scheda.durata = scheda.durata || '1h';
      scheda.durataMs = 3600000;
    }

    // 2) metadati prosa (fallback se la riga Dati non copre tutto, es. luogo/razza)
    for (var j = 0; j < righe.length; j++) {
      var rr = righe[j].trim();
      var mLuogo = rr.match(/^-\s*Luogo:\s*(.+)$/i);
      if (mLuogo) { scheda.luogo = mLuogo[1].trim(); continue; }
      var mRazza = rr.match(/^-\s*Razza:\s*(.+)$/i);
      if (mRazza) { scheda.razza = mRazza[1].trim().toLowerCase(); continue; }
      var mCat = rr.match(/^-\s*Categoria:\s*(.+)$/i);
      if (mCat && !scheda.categoria) { scheda.categoria = mCat[1].trim().toLowerCase(); continue; }
    }

    // 3) esiti: due pattern possibili.
    // Pattern A (M0/tutorial): righe multiple "- Dati: cond=... ; reward=..." che condividono
    // un unico "- Testo:"/"- Scena:" successivo (con slot tipo {oggetto}).
    // Pattern B (standard): blocchi "**Nome esito** (...) — ..." poi "Dati: ..." poi "Testo:" poi "Scena:".
    if (scheda.tutorial) {
      parseEsitiTutorial(scheda, righe);
    } else {
      parseEsitiStandard(scheda, righe);
    }

    if (!scheda.tutorial && scheda.esiti.length === 0) {
      console.warn('PETQ.content: scheda ' + id + ' senza esiti riconosciuti');
    }

    return scheda;
  }

  function applicaDatiScheda(scheda, contenuto) {
    var campi = splitToken(contenuto, ';');
    for (var i = 0; i < campi.length; i++) {
      var kv = campi[i].split('=');
      if (kv.length < 2) continue;
      var chiave = kv[0].trim().toLowerCase();
      var valore = kv.slice(1).join('=').trim();
      if (chiave === 'durata') { scheda.durata = valore; scheda.durataMs = parseDurata(valore); }
      else if (chiave === 'costo') scheda.costo = primoNumero(valore);
      else if (chiave === 'categoria') scheda.categoria = valore.toLowerCase();
      else if (chiave === 'stat') scheda.stat = valore.toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      else if (chiave === 'tutorial') scheda.tutorial = valore === '1' || valore.toLowerCase() === 'true';
    }
  }

  function parseDurata(valore) {
    var m = valore.match(/([\d.,]+)\s*h/i);
    if (m) return parseFloat(m[1].replace(',', '.')) * 3600000;
    var n = primoNumero(valore);
    return n ? n * 3600000 : 0;
  }

  function splitToken(testo, sep) {
    if (!testo) return [];
    var parti = testo.split(sep);
    var out = [];
    for (var i = 0; i < parti.length; i++) {
      var t = parti[i].trim();
      if (t !== '') out.push(t);
    }
    return out;
  }

  // Pattern tutorial (M0): 4 righe "- Dati: cond=X ; reward=Y" (una per personalita), poi una riga
  // condivisa "- Testo (slot {oggetto}): ..." e "- Scena: ...". Per M0 l'esito e' sempre tipo
  // 'tutorial' e la "chiave" e' la personalita stessa (fonte di verita' per lo smistamento in gioco).
  function parseEsitiTutorial(scheda, righe) {
    var testoCondiviso = '';
    var scenaCondivisa = '';
    var righeDati = [];

    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].trim();
      var mDati = r.match(/^-?\s*Dati:\s*cond=(.*)$/i);
      if (mDati) { righeDati.push(r.replace(/^-?\s*Dati:/i, '')); continue; }
      var mTesto = r.match(/^-?\s*Testo[^:]*:\s*(.+)$/i);
      if (mTesto) { testoCondiviso = ripulisciTesto(mTesto[1]); continue; }
      var mScena = r.match(/^-?\s*Scena:\s*(.+)$/i);
      if (mScena) { scenaCondivisa = mScena[1].trim(); continue; }
    }

    for (var j = 0; j < righeDati.length; j++) {
      var campi = splitToken(righeDati[j], ';');
      var esito = {
        tipo: 'tutorial',
        chiave: null,
        personalita: null,
        cond: null,
        priorita: null,
        reward: [],
        testo: testoCondiviso,
        scena: scenaCondivisa,
        scenaId: scenaIdDa(scheda, 'tutorial', scenaCondivisa)
      };
      for (var k = 0; k < campi.length; k++) {
        var kv = campi[k].split('=');
        if (kv.length < 2) continue;
        var chiave = kv[0].trim().toLowerCase();
        var valore = kv.slice(1).join('=').trim();
        if (chiave === 'cond') {
          esito.cond = parseCondizione(valore);
          esito.personalita = valore.trim().toLowerCase();
          esito.chiave = esito.personalita;
        } else if (chiave === 'reward') {
          esito.reward = splitToken(valore, ',');
        }
      }
      if (!esito.chiave) {
        console.warn('PETQ.content: esito tutorial senza personalita riconosciuta in ' + scheda.id);
        esito.chiave = 'tutorial_' + j;
      }
      scheda.esiti.push(esito);
    }
  }

  // Pattern standard: blocchi "**Titolo esito** (...) — sintesi" seguiti da riga "Dati:",
  // poi "Testo:" poi "Scena:". Tipo derivato dal titolo (standard/fallimento/super),
  // chiave usata per ordine di apparizione (fallimenti) e nome (M7 super con priorita).
  function parseEsitiStandard(scheda, righe) {
    var blocchi = [];
    var corrente = null;
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i];
      var mTitolo = r.match(/^\*\*(.+?)\*\*/);
      if (mTitolo) {
        if (corrente) blocchi.push(corrente);
        corrente = { titolo: mTitolo[1].trim(), righe: [] };
        continue;
      }
      if (corrente) corrente.righe.push(r);
    }
    if (corrente) blocchi.push(corrente);

    for (var b = 0; b < blocchi.length; b++) {
      var blocco = blocchi[b];
      var titolo = blocco.titolo;
      var tLower = titolo.toLowerCase();
      var tipo = 'standard';
      if (tLower.indexOf('fallim') !== -1) tipo = 'fallimento';
      else if (tLower.indexOf('super') !== -1) tipo = 'super';

      var esito = {
        tipo: tipo,
        chiave: slugEsito(titolo, tipo),
        cond: null,
        priorita: null,
        reward: [],
        testo: '',
        scena: '',
        scenaId: null
      };

      var trovataRigaDati = false;
      var scenaProsa = '';
      for (var i = 0; i < blocco.righe.length; i++) {
        var r = blocco.righe[i].trim();
        if (r === '') continue;

        var mDati = r.match(/^Dati:\s*(.+)$/i);
        if (mDati) {
          trovataRigaDati = true;
          var campi = splitToken(mDati[1], ';');
          for (var k = 0; k < campi.length; k++) {
            var kv = campi[k].split('=');
            if (kv.length < 2) continue;
            var chiave = kv[0].trim().toLowerCase();
            var valore = kv.slice(1).join('=').trim();
            if (chiave === 'cond') esito.cond = parseCondizione(valore);
            else if (chiave === 'reward') esito.reward = splitToken(valore, ',');
            else if (chiave === 'priorita') esito.priorita = primoNumero(valore);
          }
          continue;
        }

        var mTesto = r.match(/^Testo:\s*(.+)$/i);
        if (mTesto) { esito.testo = ripulisciTesto(mTesto[1]); continue; }

        var mScena = r.match(/^Scena:\s*(.+)$/i);
        if (mScena) { scenaProsa = mScena[1].trim(); esito.scena = scenaProsa; continue; }
      }

      if (!trovataRigaDati) {
        console.warn('PETQ.content: manca riga Dati per esito "' + titolo + '" in ' + scheda.id);
        esito.cond = null;
        esito.reward = [];
      }

      esito.scenaId = scenaIdDa(scheda, tipo, scenaProsa, titolo);

      if (tipo === 'super' && esito.priorita === null) {
        // priorita assente sulle schede con un solo super: non serve per la risoluzione,
        // ma normalizziamo a 99 (bassa precedenza) per rendere l'ordinamento deterministico
        esito.priorita = 99;
      }

      scheda.esiti.push(esito);
    }
  }

  // Slug stabile per l'esito dentro la scheda (contratto SPEC-MODULO-MISSIONI.md): usa il
  // testo tra parentesi/dopo trattino quando presente per distinguere A/B o
  // Dominio/Intimidazione/Amicizia (es. "Fallimento A" -> 'a', "Super successo — Dominio" ->
  // 'dominio'), altrimenti il tipo stesso quando e' unico nella scheda ("Standard" -> 'standard').
  function slugEsito(titolo, tipo) {
    var resto = titolo
      .replace(/^standard$/i, '')
      .replace(/fallim\w*/i, '')
      .replace(/super\s*success\w*/i, '')
      .trim();
    resto = resto.replace(/^[—\-–:\s]+/, '').trim();
    if (resto === '') return tipo;
    var slug = resto.toLowerCase()
      .replace(/[^a-z0-9àèéìòù\s]/gi, '')
      .trim()
      .replace(/\s+/g, '_');
    return slug || tipo;
  }

  function ripulisciTesto(t) {
    var s = (t || '').trim();
    s = s.replace(/^"(.*)"$/, '$1');
    return s;
  }

  // id scena secondo convenzione spec: std_<categoria>, fail_generica, super_m1..m8,
  // super_m7_dominio|intimidazione|amicizia. Il tutorial (m0) non e' nella lista dei 10
  // dedicati della spec: riusa comunque lo schema super_m<N> (qui super_m0), un solo id
  // condiviso dai 4 esiti per personalita' (stesso spirito "regalo di benvenuto").
  function scenaIdDa(scheda, tipo, scenaProsa, titoloEsito) {
    if (tipo === 'tutorial') return 'super_m' + scheda.numero;
    if (tipo === 'fallimento') return 'fail_generica';
    if (tipo === 'standard') return 'std_' + (scheda.categoria || 'generica');
    // super
    if (scheda.numero === 7 && titoloEsito) {
      var tl = titoloEsito.toLowerCase();
      if (tl.indexOf('dominio') !== -1) return 'super_m7_dominio';
      if (tl.indexOf('intimidazione') !== -1) return 'super_m7_intimidazione';
      if (tl.indexOf('amicizia') !== -1) return 'super_m7_amicizia';
    }
    return 'super_m' + scheda.numero;
  }

  // ---------- parser espressioni condizione ----------
  // Grammatica: espr = and ('|' and)* ; and = termine ('&' termine)*
  // termine = personalita (gentile|maleducato|nerd|sportivo) | confronto stat (forza>=3, velocita<=0, ecc.)
  // Ritorna un albero {op:'|'|'&', figli:[...]} o {op:'personalita', valore} o {op:'cmp', stat, cmp, val}
  // valutabile con valutaCondizione(albero, ctx) dove ctx = {personalita, stat:{forza,...}}

  var PERSONALITA_VALIDE = ['gentile', 'maleducato', 'nerd', 'sportivo'];

  function parseCondizione(espr) {
    if (!espr || espr.trim() === '') return null;
    try {
      var pezziOr = splitTopLevel(espr, '|');
      var nodiOr = [];
      for (var i = 0; i < pezziOr.length; i++) {
        var pezziAnd = splitTopLevel(pezziOr[i], '&');
        var nodiAnd = [];
        for (var j = 0; j < pezziAnd.length; j++) {
          var termine = parseTermine(pezziAnd[j]);
          if (termine) nodiAnd.push(termine);
        }
        if (nodiAnd.length === 0) continue;
        nodiOr.push(nodiAnd.length === 1 ? nodiAnd[0] : { op: '&', figli: nodiAnd });
      }
      if (nodiOr.length === 0) return null;
      return nodiOr.length === 1 ? nodiOr[0] : { op: '|', figli: nodiOr };
    } catch (e) {
      console.warn('PETQ.content: espressione condizione non valida: "' + espr + '"', e);
      return null;
    }
  }

  // split su un separatore a un solo livello (qui non servono parentesi: la grammatica
  // delle schede non le usa, & lega piu' stretto di | per definizione della spec)
  function splitTopLevel(testo, sep) {
    return splitToken(testo, sep);
  }

  function parseTermine(t) {
    var s = (t || '').trim().toLowerCase();
    if (s === '') return null;

    if (PERSONALITA_VALIDE.indexOf(s) !== -1) {
      return { op: 'personalita', valore: s };
    }

    var m = s.match(/^(forza|intelligenza|velocita|carisma)\s*(>=|<=|>|<|==)\s*(-?\d+)$/);
    if (m) {
      return { op: 'cmp', stat: m[1], cmp: m[2], val: parseInt(m[3], 10) };
    }

    console.warn('PETQ.content: termine condizione non riconosciuto: "' + t + '"');
    return null;
  }

  // ---------- parser bilanciamento ----------
  // Cerca per substring dell'etichetta nelle righe di tabella del file; regole dedicate per campo.

  function parseBilanciamento(testo) {
    if (!testo) return null;

    var righe = testo.split(/\r?\n/);
    var righeTabella = [];
    for (var i = 0; i < righe.length; i++) {
      var r = righe[i].trim();
      if (r.indexOf('|') !== -1) righeTabella.push(r);
    }
    if (righeTabella.length === 0) return null;

    function trovaRiga(substr) {
      var s = substr.toLowerCase();
      for (var i = 0; i < righeTabella.length; i++) {
        if (righeTabella[i].toLowerCase().indexOf(s) !== -1) return righeTabella[i];
      }
      return null;
    }

    function numeroDaEtichetta(substr, indiceNumero) {
      var r = trovaRiga(substr);
      if (!r) return null;
      var nums = tuttiINumeri(r);
      if (nums.length === 0) return null;
      var idx = (typeof indiceNumero === 'number') ? indiceNumero : 0;
      if (idx < 0) idx = nums.length + idx;
      return (idx >= 0 && idx < nums.length) ? nums[idx] : null;
    }

    var out = clona(DEFAULT_BILANCIAMENTO);
    var trovatoAlmenoUno = false;

    // terzo elemento = indice del numero da prendere nella riga (0=primo, -1=ultimo);
    // serve perche' alcune etichette/spiegazioni contengono numeri "di contorno"
    // prima della soglia vera (es. "ultimi 2 giorni < 30" -> serve l'ultimo, 30)
    var mappa = [
      ['fame', ['decadimento', 'fame'], 0],
      ['igiene', ['decadimento', 'igiene'], 0],
      ['felicità', ['decadimento', 'felicita'], 0],
      ['stat "critica"', ['soglie', 'critica'], 0],
      ['variante magra', ['soglie', 'magro'], -1],
      ['overlay sporco', ['soglie', 'sporco'], -1],
      ['malus missione da salute', ['soglie', 'malusSalute'], 0],
      ['soglia sovralimentazione', ['soglie', 'sovralimentazione'], 0],
      ['login giornaliero', ['economia', 'login'], 0],
      ['monete iniziali', ['economia', 'monetePartenza'], 0],
      ['sessioni al giorno', ['allenamento', 'sessioni'], 0],
      ['decadimento energia', ['energia_sonno', 'decadimento'], -1],
      ['costo missione', ['energia_sonno', 'costoMissionePerOra'], 0],
      ['costo allenamento', ['energia_sonno', 'costoAllenamento'], -1],
      ['soglia rifiuto', ['energia_sonno', 'sogliaRifiuto'], -1],
      ['ora del letto', ['energia_sonno', 'oraLetto'], -1],
      ['ora del crollo automatico', ['energia_sonno', 'oraCrollo'], -1],
      ['riposino (prima delle 21) — durata max', ['energia_sonno', 'riposinoDurataMax'], -1],
      ['riposino — durata minima', ['energia_sonno', 'riposinoDurataMin'], -1],
      ['recupero riposino', ['energia_sonno', 'riposinoRecuperoOra'], 0],
      ['sonno notturno (dalle 21) — durata max', ['energia_sonno', 'sveglioAutonomoOre'], -1],
      ['sonno notturno — durata minima', ['energia_sonno', 'sonnoMinimoOre'], -1],
      ['energia al risveglio notturno (≥5h', ['energia_sonno', 'risveglioBuono'], -1],
      ['energia al risveglio notturno (crollato', ['energia_sonno', 'risveglioCattivo'], -1],
      ['energia al risveglio (crollato/dormito male)', ['energia_sonno', 'risveglioCattivo'], -1]
    ];

    for (var i = 0; i < mappa.length; i++) {
      var val = numeroDaEtichetta(mappa[i][0], mappa[i][2]);
      if (val !== null) {
        out[mappa[i][1][0]][mappa[i][1][1]] = val;
        trovatoAlmenoUno = true;
      }
    }

    // riga "Effetto | +1 alla stat scelta, +5 Felicità": primo numero = effetto, secondo = felicita bonus
    var rigaEffetto = trovaRiga('effetto');
    if (rigaEffetto) {
      var numsEffetto = tuttiINumeri(rigaEffetto);
      if (numsEffetto.length >= 1) { out.allenamento.effetto = numsEffetto[0]; trovatoAlmenoUno = true; }
      if (numsEffetto.length >= 2) { out.allenamento.felicita = numsEffetto[1]; }
    }

    // riga "Benessere | tutte a 70": primo numero = benessere iniziale
    var valBenessere = numeroDaEtichetta('benessere', 0);
    if (valBenessere !== null) { out.iniziali.benessere = valBenessere; trovatoAlmenoUno = true; }

    // riga "RPG | budget di 3 punti base ... poi +1 alla stat firma"
    // FORMATO CONTRATTUALE (GDD "Alla nascita", playtest v2): la riga contiene "punti base";
    // il PRIMO numero della riga = budget totale da distribuire a caso (impilabile),
    // l'ULTIMO numero = bonus alla stat firma. Totale iniziale = budget + firma.
    var rigaRpg = trovaRiga('punti base');
    if (rigaRpg) {
      var numsRpg = tuttiINumeri(rigaRpg);
      if (numsRpg.length >= 1) { out.iniziali.budget = numsRpg[0]; trovatoAlmenoUno = true; }
      if (numsRpg.length >= 2) { out.iniziali.firma = numsRpg[numsRpg.length - 1]; }
    }

    return trovatoAlmenoUno ? out : null;
  }

  function clona(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // ---------- valutazione condizioni (condivisa con PETQ.missions) ----------
  // ctx = { personalita: 'gentile', stat: {forza:n, intelligenza:n, velocita:n, carisma:n} }
  function valutaCondizione(nodo, ctx) {
    if (!nodo) return false;
    if (nodo.op === '|') {
      for (var i = 0; i < nodo.figli.length; i++) {
        if (valutaCondizione(nodo.figli[i], ctx)) return true;
      }
      return false;
    }
    if (nodo.op === '&') {
      for (var j = 0; j < nodo.figli.length; j++) {
        if (!valutaCondizione(nodo.figli[j], ctx)) return false;
      }
      return true;
    }
    if (nodo.op === 'personalita') {
      return ctx.personalita === nodo.valore;
    }
    if (nodo.op === 'cmp') {
      var v = (ctx.stat && typeof ctx.stat[nodo.stat] === 'number') ? ctx.stat[nodo.stat] : 0;
      switch (nodo.cmp) {
        case '>=': return v >= nodo.val;
        case '<=': return v <= nodo.val;
        case '>': return v > nodo.val;
        case '<': return v < nodo.val;
        case '==': return v === nodo.val;
      }
      return false;
    }
    return false;
  }

  window.PETQ.content.parseCondizione = parseCondizione;
  window.PETQ.content.valutaCondizione = valutaCondizione;

})();
