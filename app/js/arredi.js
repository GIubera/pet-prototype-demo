window.PETQ = window.PETQ || {};

(function () {

  // Stanze disponibili (v. app/js/rooms.js _stanze): usate per la struttura piazzati e per
  // validare piazza(). Duplicato minimale qui per non dipendere da rooms.js (che e' un modulo
  // grafico, fuori dallo scope di questo file).
  var STANZE = ['cucina', 'bagno', 'salone', 'camera'];

  // Mappa sostituzioni: regola di design fissa citata in prosa (missioni.md/bilanciamento.md),
  // non ricavabile dalla tabella arredi.md in modo generico. Chiave = nome che arriva come
  // reward, valore = nome che viene sostituito/rimosso se posseduto. Copre anche il caso
  // speciale "Il Topo (allenatore)" permanente che sostituisce se stesso in versione temporanea
  // (stesso nome, la differenza e' la presenza di scadenzaMs).
  var SOSTITUZIONI = {
    'Completo da martial artist': 'Fascia da martial artist',
    'Libro': 'Album da disegno'
  };

  var NOME_ALLENATORE = 'Il Topo (allenatore)';

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.arredi: bilanciamento non disponibile, uso default locali');
    return {};
  }

  // Slot per stanza: da bilanciamento.md "Slot arredo per stanza" (sezione Arredi e bonus
  // passivi, PROPOSTA). Il parser di content.js non mappa questa riga in modo dedicato
  // (tabella con etichetta libera "Slot arredo per stanza | 3"): leggiamo con trovaRigaGenerica
  // se disponibile, altrimenti fallback 3 come da spec.
  function slotPerStanza() {
    var bil = bilanciamento();
    if (bil.arredi && typeof bil.arredi.slotPerStanza === 'number') return bil.arredi.slotPerStanza;
    return 3;
  }

  // Valore di vendita fallback per arredi da missione: la tabella arredi.md non ha un prezzo
  // numerico per gli arredi ottenuti da missione (solo quelli "negozio N monete" ce l'hanno,
  // nella colonna "Come si ottiene"). Decisione presa qui: 10 monete base, vendita al 50% (5).
  var VALORE_FALLBACK = 10;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // Guardia difensiva: garantisce che state.arredi sia nel formato nuovo anche se lo stato
  // non e' ancora passato da PETQ.save.load (es. subito dopo avviaPartita nello stesso avvio).
  function assicuraArrediStruct(state) {
    if (!state) return;
    if (!state.arredi || typeof state.arredi !== 'object' || Array.isArray(state.arredi) ||
        !state.arredi.posseduti || !state.arredi.piazzati) {
      state.arredi = { posseduti: [], piazzati: { cucina: [], bagno: [], salone: [], camera: [] } };
    }
    if (!Array.isArray(state.arredi.posseduti)) state.arredi.posseduti = [];
    if (!state.arredi.piazzati || typeof state.arredi.piazzati !== 'object') {
      state.arredi.piazzati = { cucina: [], bagno: [], salone: [] };
    }
    for (var i = 0; i < STANZE.length; i++) {
      if (!Array.isArray(state.arredi.piazzati[STANZE[i]])) state.arredi.piazzati[STANZE[i]] = [];
    }
  }

  function trovaArredoContent(nome) {
    var data = window.PETQ.content && window.PETQ.content.data;
    var elenco = (data && data.arredi) || [];
    for (var i = 0; i < elenco.length; i++) {
      if (elenco[i].nome === nome) return elenco[i];
    }
    return null;
  }

  // Rimuove (una sola occorrenza) un arredo posseduto per nome; ritorna la voce rimossa o null.
  function rimuoviDaPosseduti(state, nome) {
    var lista = state.arredi.posseduti;
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].nome === nome) {
        return lista.splice(i, 1)[0];
      }
    }
    return null;
  }

  function rimuoviDaPiazzati(state, nome) {
    var stanze = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanze.length; s++) {
      var lista = state.arredi.piazzati[stanze[s]];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].nome === nome) {
          return { voce: lista.splice(i, 1)[0], stanza: stanze[s] };
        }
      }
    }
    return null;
  }

  // aggiungi: gestisce sostituzioni (Completo sostituisce Fascia, Libro sostituisce Album,
  // Topo permanente sostituisce Topo temporaneo) e doppioni (permessi come voci separate,
  // la vendita doppioni la gestisce vendi()). opts opzionale {scadenzaMs}.
  function aggiungi(state, nome, opts) {
    assicuraArrediStruct(state);
    if (!nome) return { ok: false, msg: 'nome arredo mancante' };
    opts = opts || {};

    // caso speciale: "Il Topo (allenatore)" permanente (senza scadenzaMs) sostituisce se
    // stesso in versione temporanea (con scadenzaMs), sia tra i posseduti che tra i piazzati.
    if (nome === NOME_ALLENATORE && typeof opts.scadenzaMs !== 'number') {
      sostituisciOvunque(state, NOME_ALLENATORE);
    }

    // preferisce il campo "sostituisce" dedotto dal parser (content.js parseArredi, dalla
    // colonna "Come si ottiene" di arredi.md: "sostituisce Fascia"/"sostituisce l'Album");
    // SOSTITUZIONI resta come fallback se il content non e' ancora caricato o il campo manca.
    var info = trovaArredoContent(nome);
    var daSostituire = (info && info.sostituisce) ? info.sostituisce : SOSTITUZIONI[nome];
    if (daSostituire) {
      sostituisciOvunque(state, daSostituire);
    }

    var voce = { nome: nome };
    if (typeof opts.scadenzaMs === 'number') voce.scadenzaMs = opts.scadenzaMs;
    state.arredi.posseduti.push(voce);

    return { ok: true, msg: nome + ' aggiunto alla collezione.' };
  }

  // rimuove tutte le occorrenze di 'nomeDaTogliere' (posseduto o piazzato, mantiene la stanza
  // se era piazzato non e' richiesto dalla spec: il nuovo arredo va semplicemente aggiunto
  // come non-piazzato, coerente con "sostituisce" = toglie il vecchio, il nuovo si piazza a parte).
  function sostituisciOvunque(state, nomeDaTogliere) {
    while (rimuoviDaPosseduti(state, nomeDaTogliere)) {}
    var r;
    do { r = rimuoviDaPiazzati(state, nomeDaTogliere); } while (r);
  }

  function trovaSlotStanza(state, stanza) {
    return state.arredi.piazzati[stanza] || null;
  }

  function piazza(state, nome, stanza) {
    assicuraArrediStruct(state);
    if (STANZE.indexOf(stanza) === -1) {
      return { ok: false, msg: 'Stanza non valida.' };
    }
    var posseduto = null;
    for (var i = 0; i < state.arredi.posseduti.length; i++) {
      if (state.arredi.posseduti[i].nome === nome) { posseduto = state.arredi.posseduti[i]; break; }
    }
    if (!posseduto) {
      return { ok: false, msg: 'Arredo non posseduto.' };
    }

    // gia' piazzato da qualche parte?
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var j = 0; j < lista.length; j++) {
        if (lista[j].nome === nome) return { ok: false, msg: 'Arredo gia\' piazzato.' };
      }
    }

    var slotMax = slotPerStanza();
    var listaStanza = trovaSlotStanza(state, stanza);
    if (listaStanza.length >= slotMax) {
      return { ok: false, msg: 'Slot della stanza pieni (' + slotMax + ').' };
    }

    rimuoviDaPosseduti(state, nome);
    listaStanza.push(posseduto);

    return { ok: true, msg: nome + ' piazzato in ' + stanza + '.' };
  }

  function rimuovi(state, nome) {
    assicuraArrediStruct(state);
    var r = rimuoviDaPiazzati(state, nome);
    if (!r) return { ok: false, msg: 'Arredo non piazzato.' };
    state.arredi.posseduti.push(r.voce);
    return { ok: true, msg: nome + ' rimesso in collezione.' };
  }

  // vendi: rimuove del tutto (posseduto o piazzato), accredita 50% del "valore". Gli arredi da
  // negozio hanno un prezzo nella colonna "Come si ottiene" (es. "negozio 80 monete"): lo
  // leggiamo da li' se presente, altrimenti fallback VALORE_FALLBACK con console.warn.
  function vendi(state, nome) {
    assicuraArrediStruct(state);
    var rimossoPosseduto = rimuoviDaPosseduti(state, nome);
    var rimossoPiazzato = rimossoPosseduto ? null : rimuoviDaPiazzati(state, nome);
    if (!rimossoPosseduto && !rimossoPiazzato) {
      return { ok: false, msg: 'Arredo non trovato.' };
    }

    var valore = VALORE_FALLBACK;
    var infoContent = trovaArredoContent(nome);
    if (infoContent && infoContent.fonte) {
      var m = infoContent.fonte.match(/negozio\s+(\d+)/i);
      if (m) valore = parseInt(m[1], 10);
      else console.warn('PETQ.arredi: nessun prezzo negozio per "' + nome + '", uso valore fallback ' + VALORE_FALLBACK);
    } else {
      console.warn('PETQ.arredi: arredo "' + nome + '" non trovato in content.data.arredi, uso valore fallback ' + VALORE_FALLBACK);
    }

    var ricavo = Math.round(valore * 0.5);
    state.coins = (state.coins || 0) + ricavo;

    return { ok: true, msg: 'Venduto ' + nome + ' per ' + ricavo + ' monete.' };
  }

  // bonusPassivi: somma bonusValore degli arredi PIAZZATI per stat, cap +2 per singola stat.
  function bonusPassivi(state) {
    assicuraArrediStruct(state);
    var somma = { forza: 0, intelligenza: 0, velocita: 0, carisma: 0 };
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var i = 0; i < lista.length; i++) {
        var info = trovaArredoContent(lista[i].nome);
        if (info && info.bonusStat && typeof somma[info.bonusStat] === 'number') {
          somma[info.bonusStat] += info.bonusValore || 0;
        }
      }
    }
    var chiavi = Object.keys(somma);
    for (var k = 0; k < chiavi.length; k++) {
      somma[chiavi[k]] = clamp(somma[chiavi[k]], 0, 2);
    }
    return somma;
  }

  // perkAttivi: array dei perk le cui fonti sono PIAZZATE.
  function perkAttivi(state) {
    assicuraArrediStruct(state);
    var perks = [];
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var i = 0; i < lista.length; i++) {
        var info = trovaArredoContent(lista[i].nome);
        if (info && info.perk && perks.indexOf(info.perk) === -1) {
          perks.push(info.perk);
        }
      }
    }
    return perks;
  }

  // arredoScaduto: vero se la voce (posseduta o piazzata) ha scadenzaMs superato.
  function trovaVoceOvunque(state, nome) {
    for (var i = 0; i < state.arredi.posseduti.length; i++) {
      if (state.arredi.posseduti[i].nome === nome) return state.arredi.posseduti[i];
    }
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var j = 0; j < lista.length; j++) {
        if (lista[j].nome === nome) return lista[j];
      }
    }
    return null;
  }

  function arredoScaduto(state, nome) {
    var voce = trovaVoceOvunque(state, nome);
    if (!voce || typeof voce.scadenzaMs !== 'number') return false;
    return Date.now() >= voce.scadenzaMs;
  }

  // haEffettoSpeciale: vero se un arredo PIAZZATO (e non scaduto) ha quell'effettoSpeciale
  // (v. content.js parseArredi/estraiBonusArredo, es. 'igiene_dimezza_pioggia' per l'Ombrello
  // meccanico). Usato dal motore missioni per dimezzare il calo Igiene nelle missioni a rischio.
  function haEffettoSpeciale(state, chiave) {
    assicuraArrediStruct(state);
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var i = 0; i < lista.length; i++) {
        if (arredoScaduto(state, lista[i].nome)) continue;
        var info = trovaArredoContent(lista[i].nome);
        if (info && info.effettoSpeciale === chiave) return true;
      }
    }
    return false;
  }

  // scadiTemporanei: rimuove (da posseduti e piazzati) gli arredi con scadenzaMs superato,
  // es. "il topo come allenatore per 7 giorni" (M7 Intimidazione). Da chiamare al login
  // giornaliero/boot. Ritorna i nomi rimossi (per eventuale notifica UI futura).
  function scadiTemporanei(state) {
    assicuraArrediStruct(state);
    var rimossi = [];
    var ora = Date.now();

    for (var i = state.arredi.posseduti.length - 1; i >= 0; i--) {
      var v = state.arredi.posseduti[i];
      if (typeof v.scadenzaMs === 'number' && ora >= v.scadenzaMs) {
        rimossi.push(v.nome);
        state.arredi.posseduti.splice(i, 1);
      }
    }
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var j = lista.length - 1; j >= 0; j--) {
        if (typeof lista[j].scadenzaMs === 'number' && ora >= lista[j].scadenzaMs) {
          rimossi.push(lista[j].nome);
          lista.splice(j, 1);
        }
      }
    }
    return rimossi;
  }

  // perkAttivi() gia' esclude implicitamente solo per piazzamento; aggiungiamo qui il check
  // scadenza (un allenatore 7g scaduto non e' un perk di categoria, ma per coerenza generale
  // qualunque arredo temporaneo scaduto non deve contribuire a bonus/perk).
  var perkAttiviBase = perkAttivi;
  perkAttivi = function (state) {
    assicuraArrediStruct(state);
    var perks = [];
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var i = 0; i < lista.length; i++) {
        if (arredoScaduto(state, lista[i].nome)) continue;
        var info = trovaArredoContent(lista[i].nome);
        if (info && info.perk && perks.indexOf(info.perk) === -1) {
          perks.push(info.perk);
        }
      }
    }
    return perks;
  };

  // bonus del Topo allenatore: +1 all'allenamento di Forza se piazzato e non scaduto
  // (l'arredo e' programmatico, non viene da arredi.md, quindi ha il suo hook dedicato)
  function bonusAllenamento(state, statNome) {
    if (statNome !== 'forza' || !state) return 0;
    assicuraArrediStruct(state);
    var stanzeKeys = Object.keys(state.arredi.piazzati);
    for (var s = 0; s < stanzeKeys.length; s++) {
      var lista = state.arredi.piazzati[stanzeKeys[s]];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].nome === NOME_ALLENATORE && !arredoScaduto(state, lista[i].nome)) return 1;
      }
    }
    return 0;
  }

  window.PETQ.arredi = {
    aggiungi: aggiungi,
    piazza: piazza,
    rimuovi: rimuovi,
    vendi: vendi,
    bonusPassivi: bonusPassivi,
    perkAttivi: perkAttivi,
    haEffettoSpeciale: haEffettoSpeciale,
    bonusAllenamento: bonusAllenamento,
    scadiTemporanei: scadiTemporanei,
    slotPerStanza: slotPerStanza,
    _assicuraArrediStruct: assicuraArrediStruct,
    _sostituzioni: SOSTITUZIONI,
    _nomeAllenatore: NOME_ALLENATORE
  };

})();
