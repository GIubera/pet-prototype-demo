window.PETQ = window.PETQ || {};

(function () {

  var ROOM_W = (PETQ.rooms && PETQ.rooms._W) || 112;
  var ROOM_H = (PETQ.rooms && PETQ.rooms._H) || 64;
  var PET_SIZE = 16;
  var PET_SCALE = 2;
  var PET_PX = PET_SIZE * PET_SCALE;
  var IDLE_MS = 500;
  var BALLOON_MS = 4000;

  // hotzone vasca (coordinate logiche stanza): la vasca è nella metà sinistra del bagno
  var HOTZONE_VASCA = { x: 0, y: 20, w: 50, h: 44 };
  // posizione del pet durante il lavaggio (dentro la vasca)
  var WASH_POS = { x: 8, y: 14 };

  // hotzone letto (coordinate logiche stanza, camera — GDD "Casa": il letto e' stato spostato
  // dal salone alla camera dedicata): rettangolo esposto da PETQ.rooms._letto.camera[tema],
  // riletto qui con fallback nel caso il modulo grafica non sia ancora caricato (stesso
  // pattern difensivo di ROOM_W/ROOM_H sopra). tema: 'lab'|'ship' (v. temaRazza).
  function hotzoneLetto(tema) {
    var perTema = PETQ.rooms && PETQ.rooms._letto && PETQ.rooms._letto.camera;
    if (perTema && perTema[tema]) return perTema[tema];
    return { x: 14, y: 20, w: 40, h: 30 };
  }

  // hotzone frigo (coordinate logiche stanza, cucina — GDD "Economia" -> "Spesa e dispensa"):
  // rettangolo esposto da PETQ.rooms._frigoZona.cucina[tema], stesso pattern hotzoneLetto sopra.
  function hotzoneFrigo(tema) {
    var perTema = PETQ.rooms && PETQ.rooms._frigoZona && PETQ.rooms._frigoZona.cucina;
    if (perTema && perTema[tema]) return perTema[tema];
    return { x: 6, y: 10, w: 16, h: 34 };
  }
  // posizione del pet mentre dorme A LETTO (FIX: prima era un punto fisso {22,30} che non
  // teneva conto delle dimensioni reali del letto per tema e sforava sotto il bordo del
  // letto ship - v. rooms.js LETTO_LAB_CAMERA/LETTO_SHIP_CAMERA, che hanno x/y/w/h diversi).
  // Ora centriamo lo sprite (PET_PX x PET_PX) nel rettangolo VERO del letto, con un piccolo
  // offset verso il basso perche' il "materasso/giaciglio" disegnato da rooms.js occupa la
  // meta' inferiore della capsula (la cupola/vetro sta sopra): v. labCameraLetto/
  // shipCameraLetto, il rettangolo del cuscino+coperta parte a r.y+9/+12. Clampato dentro
  // il rettangolo cosi' lo sprite non sporge mai fuori dai bordi del letto.
  function sleepBedPos(tema) {
    var r = hotzoneLetto(tema);
    var x = Math.round(r.x + (r.w - PET_PX) / 2);
    var y = Math.round(r.y + (r.h - PET_PX) / 2) + 4; // +4: verso il giaciglio, non la cupola
    // clamp dentro il rettangolo letto; se il letto e' piu' piccolo del pet su un asse
    // (min > max dopo il clamp), vince il bordo superiore/sinistro (r.x/r.y) cosi' lo sprite
    // resta ancorato al letto invece di sforare, semplicemente "riempiendolo" per intero
    x = Math.min(Math.max(x, r.x), Math.max(r.x, r.x + r.w - PET_PX));
    y = Math.min(Math.max(y, r.y), Math.max(r.y, r.y + r.h - PET_PX));
    return { x: x, y: y };
  }
  // posizione del pet mentre dorme CROLLATO (sul pavimento, al centro come l'idle normale)
  function sleepFloorPos() {
    return { x: Math.round((ROOM_W - PET_PX) / 2), y: ROOM_H - PET_PX - 4 };
  }

  // mappa allenamento: prop -> stat (da GDD "Direzione interazione")
  var PROPS_ALLENAMENTO = [
    { id: 'pesi', stat: 'forza', label: 'Forza' },
    { id: 'libro', stat: 'intelligenza', label: 'Intelligenza' },
    { id: 'corsa', stat: 'velocita', label: 'Velocità' },
    { id: 'specchio', stat: 'carisma', label: 'Carisma' }
  ];

  var STAT_LABEL = { forza: 'Forza', intelligenza: 'Intelligenza', velocita: 'Velocità', carisma: 'Carisma' };

  // posizioni placeholder degli slot arredo nelle stanze (puntino luminoso finché la
  // grafica non disegna gli arredi veri)
  var SLOT_SPOTS = [[10, 41], [55, 39], [99, 41]];

  // tinte fallback della cartolina esito per scena/categoria (guard su sprites.drawCartolina)
  var TINTE_SCENA = {
    fail: { sfondo: '#4a505a', terra: '#383e48' },
    superSc: { sfondo: '#5a4a22', terra: '#44381c' },
    videogioco: { sfondo: '#2f3a5f', terra: '#242c48' },
    sociale: { sfondo: '#5f3a52', terra: '#472b3d' },
    combattimento: { sfondo: '#5f3232', terra: '#472525' },
    studio: { sfondo: '#2f4a3a', terra: '#23382c' },
    consegne: { sfondo: '#545130', terra: '#3f3d24' },
    sport: { sfondo: '#2f4a5f', terra: '#233848' },
    generica: { sfondo: '#3a4150', terra: '#2b303c' }
  };

  var appEl = null;
  var currentState = null;
  var currentStanza = 'cucina';
  var idleTimer = null;
  var idleFrame = 0;
  var balloonTimer = null;
  var toastTimer = null;

  // effetto in corso sul canvas: null | {tipo:'crumbs'} | {tipo:'wash'} |
  // {tipo:'train', prop} | {tipo:'puff', x, y, step}
  var effetto = null;
  var animazioneInCorso = false;
  var petDragging = false;
  var lastPetRect = null; // rettangolo logico del pet nell'ultimo draw

  var ghostEl = null;
  var ghostCanvas = null;

  var canvasPointer = null; // gesto in corso sul canvas stanza
  var foodPointer = null;   // gesto in corso su una card cibo

  var collezioneAperta = false;   // pannello Collezione (salone) aperto/chiuso
  var battutaPartenza = null;     // battuta 'missione_partenza' mostrata sulla card in corso
  var missioneSelezionata = null; // id del pin selezionato sulla mappa missioni
  var mapPointer = null;          // gesto in corso sul canvas mappa
  var frigoAperto = false;        // pannello frigo (cucina) aperto/chiuso
  var negozioSelezionato = false; // pannello acquisto shop (mappa) aperto/chiuso

  // ---------- util ----------

  function bilanciamento() {
    var data = window.PETQ.content && window.PETQ.content.data;
    if (data && data.bilanciamento) return data.bilanciamento;
    console.warn('PETQ.ui: bilanciamento non disponibile, uso default locali');
    return { economia: { monetePartenza: 50 } };
  }

  function oggiStr() {
    var d = new Date();
    var mese = String(d.getMonth() + 1).padStart(2, '0');
    var giorno = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mese + '-' + giorno;
  }

  // Debug "Nuovo giorno": retrodata di N giorni ogni voce di state.missioniFatte (mappa
  // {id: 'YYYY-MM-DD'}), cosi' il cooldown missioni (3 giorni, v. missions.js) si puo' testare
  // senza aspettare la mezzanotte reale. Formato data stringa: costruiamo la data a mezzogiorno
  // per evitare sfasamenti da fuso/ora legale, stesso pattern di missions.js diffGiorniStr.
  function retrodataCooldownMissioni(state, giorni) {
    if (!state || !state.missioniFatte || typeof state.missioniFatte !== 'object') return;
    var chiavi = Object.keys(state.missioniFatte);
    for (var i = 0; i < chiavi.length; i++) {
      var dataStr = state.missioniFatte[chiavi[i]];
      var d = new Date(dataStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - giorni);
      var mese = String(d.getUTCMonth() + 1).padStart(2, '0');
      var giorno = String(d.getUTCDate()).padStart(2, '0');
      state.missioniFatte[chiavi[i]] = d.getUTCFullYear() + '-' + mese + '-' + giorno;
    }
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  function getApp() {
    if (!appEl) appEl = document.getElementById('app');
    return appEl;
  }

  function temaRazza(pet) {
    return (pet && pet.razza === 'robot') ? 'lab' : 'ship';
  }

  function coordLogiche(canvas, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return { x: -1, y: -1 };
    return {
      x: (clientX - r.left) * ROOM_W / r.width,
      y: (clientY - r.top) * ROOM_H / r.height
    };
  }

  function dentroRect(p, rect, margine) {
    var m = margine || 0;
    return p.x >= rect.x - m && p.x <= rect.x + rect.w + m &&
           p.y >= rect.y - m && p.y <= rect.y + rect.h + m;
  }

  // ---------- boot pubblico ----------

  function boot(state) {
    if (state) {
      currentState = state;
      controllaSonnoScaduto();
      // apertura app con missione già finita: risolvi e mostra subito l'esito
      if (controllaMissioneScaduta()) return;
      mostraCasa(state);
    } else {
      mostraIntro();
    }
  }

  function render(state) {
    if (!state) return;
    currentState = state;
    controllaAnimScaduta();
    controllaSonnoScaduto();
    if (!animazioneInCorso && controllaMissioneScaduta()) return;
    if (document.getElementById('petq-casa')) {
      aggiornaHud(state);
      disegnaStanzaEPet(state);
    }
  }

  // Se la missione in corso è finita (tempoRimasto <= 0), la risolve, salva e mostra la
  // schermata esito. Ritorna l'esito (truthy) se ha preso il controllo dello schermo.
  function controllaMissioneScaduta() {
    if (!currentState || !currentState.missione) return null;
    if (PETQ.missions.tempoRimasto(currentState) > 0) return null;
    var esito = PETQ.missions.risolvi(currentState);
    if (!esito || !esito.ok) {
      // scheda sparita o stato incoerente: risolvi ha già ripulito state.missione
      PETQ.save.save(currentState);
      return null;
    }
    PETQ.save.save(currentState);
    mostraEsito(esito);
    return esito;
  }

  // Controlla il ciclo sonno (GDD "Energia e sonno"): sveglia autonoma dopo 8h, o crollo
  // automatico alle 23 se il pet e' ancora sveglio. Chiamata da boot/render/idle (stesso
  // pattern di controllaMissioneScaduta): idempotente, non fa nulla se non e' il momento.
  function controllaSonnoScaduto() {
    if (!currentState || !currentState.pet || !PETQ.pet) return null;
    var risveglio = PETQ.pet.controllaSveglia(currentState);
    if (risveglio) {
      PETQ.save.save(currentState);
      disegnaStanzaEPet(currentState);
      aggiornaHud(currentState);
      renderAzioni();
      mostraBalloon(PETQ.dialog.say(currentState.pet, risveglio.battuta, currentState));
      return risveglio;
    }
    var crollato = PETQ.pet.controllaCrolloAutomatico(currentState);
    if (crollato) {
      PETQ.save.save(currentState);
      disegnaStanzaEPet(currentState);
      renderAzioni();
    }
    return null;
  }

  // ==================== INTRO ====================

  function mostraIntro() {
    fermaIdle();
    var app = getApp();
    app.innerHTML = '';

    var wrap = el('div', 'petq-screen petq-intro');
    var titolo = el('h1', 'petq-title', 'Pet Prototype');
    wrap.appendChild(titolo);
    wrap.appendChild(el('p', 'petq-sub', 'Scegli il tuo uovo.'));

    var scelte = el('div', 'petq-uova');

    var robotBox = el('div', 'petq-uovo-box');
    var robotCanvas = document.createElement('canvas');
    robotCanvas.width = 64; robotCanvas.height = 64;
    robotCanvas.className = 'petq-uovo-canvas';
    disegnaUovo(robotCanvas, 'robot');
    robotBox.appendChild(robotCanvas);
    robotBox.appendChild(el('div', 'petq-uovo-label', 'Robot'));
    robotBox.addEventListener('click', function () { sceglieUovo('robot'); });

    var alienoBox = el('div', 'petq-uovo-box');
    var alienoCanvas = document.createElement('canvas');
    alienoCanvas.width = 64; alienoCanvas.height = 64;
    alienoCanvas.className = 'petq-uovo-canvas';
    disegnaUovo(alienoCanvas, 'alieno');
    alienoBox.appendChild(alienoCanvas);
    alienoBox.appendChild(el('div', 'petq-uovo-label', 'Alieno'));
    alienoBox.addEventListener('click', function () { sceglieUovo('alieno'); });

    scelte.appendChild(robotBox);
    scelte.appendChild(alienoBox);
    wrap.appendChild(scelte);

    app.appendChild(wrap);
    montaDebugPanel();
  }

  function disegnaUovo(canvas, razza) {
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);

    if (razza === 'robot') {
      g.fillStyle = '#8a949c';
      ovale(g, 32, 34, 22, 28);
      g.fillStyle = '#c6cfd6';
      ovale(g, 32, 32, 18, 23);
      g.fillStyle = '#5a646c';
      var rivetti = [[20, 20], [44, 20], [20, 46], [44, 46], [32, 14]];
      for (var i = 0; i < rivetti.length; i++) {
        g.beginPath();
        g.arc(rivetti[i][0], rivetti[i][1], 2, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = '#2d4a38';
      ovale(g, 32, 34, 22, 28);
      g.fillStyle = '#7fd8a4';
      ovale(g, 32, 32, 18, 23);
      g.fillStyle = '#f09bb0';
      var macchie = [[24, 24], [40, 30], [28, 42], [38, 46]];
      for (var j = 0; j < macchie.length; j++) {
        g.beginPath();
        g.arc(macchie[j][0], macchie[j][1], 3, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  function ovale(g, cx, cy, rx, ry) {
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  function sceglieUovo(razza) {
    var pet = PETQ.pet.generate(razza);
    mostraNascita(pet);
  }

  // ==================== NASCITA ====================

  function mostraNascita(pet) {
    var app = getApp();
    app.innerHTML = '';

    var wrap = el('div', 'petq-screen petq-nascita');
    wrap.appendChild(el('h1', 'petq-title', 'È nato!'));

    var canvas = document.createElement('canvas');
    canvas.width = PET_SIZE * 6; canvas.height = PET_SIZE * 6;
    canvas.className = 'petq-sprite-grande';
    PETQ.sprites.draw(canvas, pet, {});
    wrap.appendChild(canvas);

    wrap.appendChild(el('div', 'petq-personalita', capitalize(pet.personalita)));

    var stats = el('div', 'petq-stats-grid');
    var voci = [
      ['Forza', pet.rpg.forza], ['Intelligenza', pet.rpg.intelligenza],
      ['Velocità', pet.rpg.velocita], ['Carisma', pet.rpg.carisma]
    ];
    for (var i = 0; i < voci.length; i++) {
      var riga = el('div', 'petq-stat-riga');
      riga.appendChild(el('span', 'petq-stat-nome', voci[i][0]));
      riga.appendChild(el('span', 'petq-stat-val', String(voci[i][1])));
      stats.appendChild(riga);
    }
    wrap.appendChild(stats);

    var form = el('div', 'petq-form-nome');
    form.appendChild(el('label', 'petq-label', 'Dagli un nome (max 12 caratteri)'));
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 12;
    input.className = 'petq-input';
    input.placeholder = 'Nome...';
    form.appendChild(input);

    var errore = el('div', 'petq-errore', '');
    form.appendChild(errore);

    var bottone = el('button', 'petq-btn petq-btn-primario', 'Inizia');
    bottone.addEventListener('click', function () {
      var nome = input.value.trim();
      if (nome === '') {
        errore.textContent = 'Il nome è obbligatorio.';
        return;
      }
      pet.nome = nome.substring(0, 12);
      avviaPartita(pet);
    });
    form.appendChild(bottone);

    wrap.appendChild(form);
    app.appendChild(wrap);
  }

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function avviaPartita(pet) {
    var bil = bilanciamento();
    var monete = (bil.economia && typeof bil.economia.monetePartenza === 'number') ? bil.economia.monetePartenza : 50;

    var state = {
      version: 1,
      pet: pet,
      coins: monete,
      poop: 0,
      lastSeen: Date.now(),
      lastLoginDay: oggiStr(),
      arredi: { posseduti: [], piazzati: { cucina: [], bagno: [], salone: [] } },
      parole: [],
      missione: null,
      missioniFatte: {},
      ferite: 0,
      cureOggi: 0,
      // Inventario/frigo (GDD "Economia" -> "Spesa e dispensa"): array di {nome, qty}. Stock
      // iniziale 3 Crocchette semplici cosi' la cucina non e' vuota al primo avvio.
      dispensa: [{ nome: 'Crocchette semplici', qty: 3 }],
      categoriePastiOggi: [],
      tutorialFatto: false,
      sonno: null
    };
    // orologio di gioco: parte dall'ora REALE corrente (stessa regola di migrazione dei
    // salvataggi esistenti, v. clock.js inizializzaOrologio), cosi' anche una partita nuova
    // iniziata di sera parte gia' vicina alla notte di gioco.
    if (PETQ.clock && PETQ.clock.inizializzaOrologio) PETQ.clock.inizializzaOrologio(state);

    PETQ.save.save(state);
    PETQ.main.avviaTicking(state);
    currentState = state;
    mostraCasa(state);
  }

  // ==================== CASA ====================

  function mostraCasa(state) {
    fermaIdle();
    puliziaEffetto();
    currentState = state;
    currentStanza = 'cucina';
    collezioneAperta = false;
    frigoAperto = false;
    negozioSelezionato = null;
    missioneSelezionata = null;
    mapPointer = null;

    var app = getApp();
    app.innerHTML = '';

    var wrap = el('div', 'petq-screen petq-casa');
    wrap.id = 'petq-casa';

    var hud = el('div', 'petq-hud');
    hud.id = 'petq-hud';
    wrap.appendChild(hud);

    var tabs = el('div', 'petq-tabs');
    var stanze = [['cucina', 'Cucina'], ['bagno', 'Bagno'], ['salone', 'Salone'], ['camera', 'Camera'], ['missioni', 'Missioni']];
    for (var i = 0; i < stanze.length; i++) {
      (function (chiave, label) {
        var tab = el('button', 'petq-tab', label);
        tab.dataset.stanza = chiave;
        tab.addEventListener('click', function () {
          controllaAnimScaduta();
          if (animazioneInCorso) return;
          currentStanza = chiave;
          renderStanza();
        });
        tabs.appendChild(tab);
      })(stanze[i][0], stanze[i][1]);
    }
    wrap.appendChild(tabs);

    var stanzaArea = el('div', 'petq-stanza-area');
    var canvasWrap = el('div', 'petq-canvas-wrap');
    var canvas = document.createElement('canvas');
    canvas.width = ROOM_W;
    canvas.height = ROOM_H;
    canvas.id = 'petq-canvas-stanza';
    canvas.className = 'petq-canvas-stanza';
    canvasWrap.appendChild(canvas);

    // hotzone vasca: evidenziata durante il drag del pet nel bagno
    var hotzone = el('div', 'petq-hotzone');
    hotzone.id = 'petq-hotzone';
    hotzone.style.left = (HOTZONE_VASCA.x / ROOM_W * 100) + '%';
    hotzone.style.top = (HOTZONE_VASCA.y / ROOM_H * 100) + '%';
    hotzone.style.width = (HOTZONE_VASCA.w / ROOM_W * 100) + '%';
    hotzone.style.height = (HOTZONE_VASCA.h / ROOM_H * 100) + '%';
    canvasWrap.appendChild(hotzone);

    // hotzone letto: evidenziata durante il drag del pet in camera (stesso pattern vasca)
    var hzLetto = hotzoneLetto(temaRazza(state.pet));
    var hotzoneL = el('div', 'petq-hotzone');
    hotzoneL.id = 'petq-hotzone-letto';
    hotzoneL.style.left = (hzLetto.x / ROOM_W * 100) + '%';
    hotzoneL.style.top = (hzLetto.y / ROOM_H * 100) + '%';
    hotzoneL.style.width = (hzLetto.w / ROOM_W * 100) + '%';
    hotzoneL.style.height = (hzLetto.h / ROOM_H * 100) + '%';
    canvasWrap.appendChild(hotzoneL);

    // indicatore "torna tra X" quando il pet è in missione
    var indicatore = el('div', 'petq-missione-ind');
    indicatore.id = 'petq-missione-ind';
    indicatore.style.display = 'none';
    canvasWrap.appendChild(indicatore);

    var balloon = el('div', 'petq-balloon');
    balloon.id = 'petq-balloon';
    balloon.style.display = 'none';
    canvasWrap.appendChild(balloon);

    stanzaArea.appendChild(canvasWrap);
    wrap.appendChild(stanzaArea);

    var azioni = el('div', 'petq-azioni');
    azioni.id = 'petq-azioni';
    wrap.appendChild(azioni);

    app.appendChild(wrap);

    installaPointerCanvas(canvas);

    montaDebugPanel();
    renderStanza();
    avviaIdle();
  }

  function renderStanza() {
    if (!currentState) return;
    aggiornaTabsAttive();
    aggiornaHud(currentState);

    // la tab Missioni è una schermata-menu: l'area stanza (canvas) resta nascosta
    var area = document.querySelector('.petq-stanza-area');
    if (area) area.style.display = (currentStanza === 'missioni') ? 'none' : '';

    if (currentStanza !== 'missioni') disegnaStanzaEPet(currentState);
    renderAzioni();
    if (currentStanza !== 'missioni' && !currentState.missione) battutaAutomatica();
  }

  function aggiornaTabsAttive() {
    var tabs = document.querySelectorAll('.petq-tab');
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].dataset.stanza === currentStanza) {
        tabs[i].classList.add('petq-tab-attiva');
      } else {
        tabs[i].classList.remove('petq-tab-attiva');
      }
    }
  }

  function aggiornaHud(state) {
    var hud = document.getElementById('petq-hud');
    if (!hud || !state || !state.pet) return;
    hud.innerHTML = '';

    hud.appendChild(costruisciOrologioHud(state));

    var barre = [
      ['Fame', state.pet.stats.fame],
      ['Igiene', state.pet.stats.igiene],
      ['Salute', state.pet.stats.salute],
      ['Felicità', state.pet.stats.felicita],
      ['Energia', state.pet.stats.energia]
    ];

    for (var i = 0; i < barre.length; i++) {
      var val = Math.round(barre[i][1]);
      var riga = el('div', 'petq-barra-riga');
      riga.appendChild(el('span', 'petq-barra-label', barre[i][0]));
      var traccia = el('div', 'petq-barra-traccia');
      var fill = el('div', 'petq-barra-fill ' + coloreBarra(val));
      fill.style.width = val + '%';
      traccia.appendChild(fill);
      riga.appendChild(traccia);
      riga.appendChild(el('span', 'petq-barra-val', String(val)));
      hud.appendChild(riga);
    }

    // riga compatta stat RPG: icona prop + valore (+ bonus arredi in accento)
    var chips = el('div', 'petq-rpg-chips');
    for (var c = 0; c < PROPS_ALLENAMENTO.length; c++) {
      var prop = PROPS_ALLENAMENTO[c];
      var chip = el('span', 'petq-rpg-chip');
      chip.title = prop.label;

      var iconaChip = document.createElement('canvas');
      iconaChip.width = 12;
      iconaChip.height = 12;
      iconaChip.className = 'petq-chip-icon';
      disegnaProp(iconaChip, prop.id);
      chip.appendChild(iconaChip);

      var sb = statConBonus(prop.stat);
      chip.appendChild(el('span', 'petq-chip-val', String(sb.base)));
      if (sb.bonus > 0) {
        var bonusEl = el('span', 'petq-chip-bonus', '(+' + sb.bonus + ')');
        bonusEl.title = 'bonus dagli arredi piazzati';
        chip.appendChild(bonusEl);
      }
      chips.appendChild(chip);
    }
    hud.appendChild(chips);

    // indicatore ferite discreto (visibile solo quando ce ne sono)
    if ((state.ferite || 0) > 0) {
      var fer = el('div', 'petq-ferite');
      fer.title = 'Ferite: guariscono col riposo o con una cura in bagno';
      var icona = el('span', 'petq-ferite-icona', '♥');
      fer.appendChild(icona);
      fer.appendChild(el('span', 'petq-ferite-num', String(Math.round(state.ferite))));
      hud.appendChild(fer);
    }

    var monete = el('div', 'petq-monete', 'Monete: ' + state.coins);
    hud.appendChild(monete);
  }

  // Orologio di gioco nell'HUD (GDD "Casa" -> orologio in-game): HH:MM da PETQ.clock.oraGioco
  // + icona sole/luna. Notte di gioco = 21:00-07:59 (PETQ.clock.eNotteGioco, stessa soglia
  // "ora del letto" del bilanciamento sonno). Aggiornata ad ogni aggiornaHud (render/tick).
  function costruisciOrologioHud(state) {
    var wrap = el('div', 'petq-orologio');
    if (!PETQ.clock || !PETQ.clock.oraGioco) return wrap;

    var es = (PETQ.pet && PETQ.pet.bilEnergiaSonno) ? PETQ.pet.bilEnergiaSonno() : { oraLetto: 21 };
    var og = PETQ.clock.oraGioco(state);
    var notte = PETQ.clock.eNotteGioco(state, es.oraLetto, 8);

    wrap.appendChild(el('span', 'petq-orologio-icona', notte ? '🌙' : '☀️'));
    wrap.appendChild(el('span', 'petq-orologio-ora', og.hhmm));
    wrap.title = notte ? 'Notte di gioco' : 'Giorno di gioco';
    return wrap;
  }

  function coloreBarra(val) {
    if (val > 50) return 'petq-barra-verde';
    if (val >= 25) return 'petq-barra-gialla';
    return 'petq-barra-rossa';
  }

  // ---------- disegno stanza + pet + effetti ----------

  function posizionePet() {
    if (effetto && effetto.tipo === 'wash') {
      return { x: WASH_POS.x, y: WASH_POS.y };
    }
    if (currentState && currentState.sonno) {
      if (currentState.sonno.aLetto && currentStanza === 'camera') {
        return sleepBedPos(temaRazza(currentState.pet));
      }
      return sleepFloorPos();
    }
    var y = ROOM_H - PET_PX - 4 + (idleFrame === 1 ? 1 : 0);
    if (effetto && effetto.tipo === 'train' && idleFrame === 1) y -= 3; // bounce da allenamento
    return { x: Math.round((ROOM_W - PET_PX) / 2), y: y };
  }

  function disegnaStanzaEPet(state) {
    if (currentStanza === 'missioni') {
      aggiornaIndicatoreMissione(state);
      ridisegnaMappa(); // pin pulsante: il frame segue il loop idle
      return;
    }
    var canvas = document.getElementById('petq-canvas-stanza');
    if (!canvas || !state || !state.pet) return;

    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;

    PETQ.rooms.draw(canvas, temaRazza(state.pet), currentStanza, {
      poop: state.poop,
      arredi: nomiArrediPiazzati(state, currentStanza) // nomi non scaduti: rooms li disegna se sa farlo
    });
    disegnaSlotArredi(g, state);

    var inMissione = !!state.missione;

    if (inMissione) {
      // il pet non è in casa: stanza vuota, niente hit-test sul pet
      lastPetRect = null;
    } else if (!petDragging) {
      var pos = posizionePet();

      var petCanvas = document.createElement('canvas');
      petCanvas.width = PET_PX;
      petCanvas.height = PET_PX;

      if (state.sonno) {
        // Dorme: sprite SDRAIATO orizzontale (non in piedi) + Zzz, sia sul letto sia
        // crollato a terra (GDD "Energia e sonno" -> Zzz animati). drawSdraiato include gia'
        // l'overlay drawSonno (palpebre+Zzz) al suo interno, niente overlaySonno separato.
        PETQ.sprites.drawSdraiato(petCanvas, petLikeDaState(state), { frame: idleFrame });
      } else {
        PETQ.sprites.draw(petCanvas, petLikeDaState(state), { frame: idleFrame });
      }

      var pctx = petCanvas.getContext('2d');
      if (effetto && effetto.tipo === 'wash') overlaySchiuma(pctx, idleFrame);
      if (effetto && effetto.tipo === 'crumbs') overlayBriciole(pctx, idleFrame);
      if (effetto && effetto.tipo === 'cura') overlayCura(pctx, idleFrame);

      g.drawImage(petCanvas, pos.x, pos.y);

      if (effetto && effetto.tipo === 'train') {
        var propCanvas = document.createElement('canvas');
        propCanvas.width = 12;
        propCanvas.height = 12;
        disegnaProp(propCanvas, effetto.prop);
        g.drawImage(propCanvas, Math.min(pos.x + PET_PX - 2, ROOM_W - 12), pos.y + PET_PX - 13);
      }

      lastPetRect = { x: pos.x, y: pos.y, w: PET_PX, h: PET_PX };
    }

    if (effetto && effetto.tipo === 'puff') disegnaPuff(g, effetto);

    aggiornaIndicatoreMissione(state);
  }

  // placeholder arredi piazzati: puntino luminoso sugli slot occupati della stanza corrente.
  // Quando il modulo grafica espone drawArredo, gli arredi veri li disegna rooms.draw
  // (riceve i nomi in stato.arredi) e i puntini spariscono.
  function disegnaSlotArredi(g, state) {
    if (PETQ.rooms && PETQ.rooms.drawArredo) return;
    var pz = state.arredi && state.arredi.piazzati && state.arredi.piazzati[currentStanza];
    if (!pz || !pz.length) return;
    for (var i = 0; i < pz.length && i < SLOT_SPOTS.length; i++) {
      var s = SLOT_SPOTS[i];
      g.fillStyle = '#3ee6d0';
      g.fillRect(s[0], s[1], 2, 2);
      g.fillStyle = (idleFrame === 1) ? '#bff5ec' : '#7fefe0';
      g.fillRect(s[0], s[1] - 1, 2, 1);
    }
  }

  function aggiornaIndicatoreMissione(state) {
    var testo = null;
    if (state && state.missione && PETQ.missions) {
      testo = 'Torna tra ' + formattaTempo(PETQ.missions.tempoRimasto(state));
    }
    var ind = document.getElementById('petq-missione-ind');
    if (ind) {
      ind.style.display = testo ? 'block' : 'none';
      if (testo) ind.textContent = testo;
    }
    var cd = document.getElementById('petq-missione-countdown');
    if (cd && testo) cd.textContent = formattaTempo(PETQ.missions.tempoRimasto(state));
  }

  // ms -> "2g 5h" | "2h 05m" | "12m 30s" | "45s"
  function formattaTempo(ms) {
    if (!(ms > 0)) return '0s';
    var s = Math.ceil(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h >= 24) return Math.floor(h / 24) + 'g ' + (h % 24) + 'h';
    if (h > 0) return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    if (m > 0) return m + 'm ' + (sec < 10 ? '0' : '') + sec + 's';
    return sec + 's';
  }

  // valore stat RPG del pet: base + bonus passivi degli arredi piazzati (già cappati da arredi.js).
  // state opzionale (default: quello corrente) per i test di logica.
  function statConBonus(nomeStat, state) {
    var st = state || currentState;
    var base = (st && st.pet && st.pet.rpg &&
      typeof st.pet.rpg[nomeStat] === 'number') ? st.pet.rpg[nomeStat] : 0;
    var bonus = 0;
    if (st && PETQ.arredi && PETQ.arredi.bonusPassivi) {
      var b = PETQ.arredi.bonusPassivi(st);
      if (b && typeof b[nomeStat] === 'number') bonus = b[nomeStat];
    }
    return { base: base, bonus: bonus, tot: base + bonus };
  }

  // testo compatto per un valore stat: "3" oppure "3 (+1)" col bonus arredi
  function testoStat(nomeStat, state) {
    var sb = statConBonus(nomeStat, state);
    return sb.bonus > 0 ? sb.base + ' (+' + sb.bonus + ')' : String(sb.base);
  }

  // nomi degli arredi piazzati nella stanza (esclusi i temporanei scaduti), per rooms.draw
  function nomiArrediPiazzati(state, stanza) {
    var lista = state && state.arredi && state.arredi.piazzati && state.arredi.piazzati[stanza];
    if (!lista || !lista.length) return [];
    var ora = Date.now();
    var nomi = [];
    for (var i = 0; i < lista.length; i++) {
      if (typeof lista[i].scadenzaMs === 'number' && ora >= lista[i].scadenzaMs) continue;
      nomi.push(lista[i].nome);
    }
    return nomi;
  }

  function petLikeDaState(state) {
    var pet = state.pet;
    var soglie = (bilanciamento().soglie) || { sporco: 30 };
    var sogliaSporco = (typeof soglie.sporco === 'number') ? soglie.sporco : 30;
    return {
      razza: pet.razza,
      sottorazza: pet.sottorazza,
      parts: pet.parts,
      stadio: pet.stadio,
      corpo: PETQ.pet.bodyVariant(pet),
      sporco: pet.stats.igiene < sogliaSporco
    };
  }

  // ---------- icone e overlay: API grafica nuove con guard + fallback ----------

  var COLORI_CATEGORIA = {
    base: '#c8a468', carne: '#e07050', verdura: '#6ec46e',
    pesce: '#6aaede', dolce: '#e88ac0'
  };

  var COLORI_PROP = {
    pesi: '#8a94a0', libro: '#6aaede', corsa: '#7fd8a4', specchio: '#d8c8e8'
  };

  function disegnaCibo(canvas, cibo) {
    if (PETQ.sprites && PETQ.sprites.drawFood) {
      PETQ.sprites.drawFood(canvas, cibo);
      return;
    }
    // fallback: quadratino colorato per categoria
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var col = COLORI_CATEGORIA[(cibo && cibo.categoria) || ''] || '#c8a468';
    g.fillStyle = '#1e242e';
    g.fillRect(1, 1, 10, 10);
    g.fillStyle = col;
    g.fillRect(2, 2, 8, 8);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(3, 3, 2, 1);
  }

  function disegnaProp(canvas, id) {
    if (PETQ.sprites && PETQ.sprites.drawProp) {
      PETQ.sprites.drawProp(canvas, id);
      return;
    }
    // fallback: quadratino colorato per prop
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    var col = COLORI_PROP[id] || '#8a94a0';
    g.fillStyle = '#1e242e';
    g.fillRect(1, 1, 10, 10);
    g.fillStyle = col;
    g.fillRect(2, 2, 8, 8);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(3, 3, 2, 1);
  }

  function overlaySchiuma(ctx, frame) {
    if (PETQ.sprites && PETQ.sprites.drawFoam) {
      PETQ.sprites.drawFoam(ctx, frame);
      return;
    }
    // fallback: bolle bianche/celesti sulla metà bassa del pet (ctx del canvas pet, 16px logici)
    var s = ctx.canvas.width / PET_SIZE;
    var bolle = frame === 1
      ? [[3, 9], [6, 11], [9, 8], [12, 10], [5, 13], [10, 13]]
      : [[4, 10], [7, 8], [10, 11], [13, 9], [6, 12], [11, 13]];
    for (var i = 0; i < bolle.length; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#eef6fb' : '#bfe0f2';
      ctx.fillRect(bolle[i][0] * s, bolle[i][1] * s, s, s);
    }
  }

  function overlayBriciole(ctx, frame) {
    if (PETQ.sprites && PETQ.sprites.drawCrumbs) {
      PETQ.sprites.drawCrumbs(ctx, frame);
      return;
    }
    // fallback: briciole marroni ai piedi del pet
    var s = ctx.canvas.width / PET_SIZE;
    var punti = frame === 1
      ? [[3, 14], [7, 15], [12, 14], [9, 13]]
      : [[4, 15], [8, 13], [11, 15], [6, 14]];
    ctx.fillStyle = '#c08a5c';
    for (var i = 0; i < punti.length; i++) {
      ctx.fillRect(punti[i][0] * s, punti[i][1] * s, s, s);
    }
  }

  // effetto infermeria: croce rossa + cuoricini sul canvas del pet (2 frame alternati)
  function overlayCura(ctx, frame) {
    var s = ctx.canvas.width / PET_SIZE;
    var cx = frame === 1 ? 12 : 11;
    ctx.fillStyle = '#e85a5a';
    ctx.fillRect(cx * s, 1 * s, s, 3 * s);
    ctx.fillRect((cx - 1) * s, 2 * s, 3 * s, s);
    ctx.fillStyle = '#f09bb0';
    var cuori = frame === 1 ? [[2, 4], [4, 7], [13, 8]] : [[3, 3], [5, 6], [12, 9]];
    for (var i = 0; i < cuori.length; i++) {
      ctx.fillRect(cuori[i][0] * s, cuori[i][1] * s, s, s);
    }
  }

  function disegnaPuff(g, e) {
    g.fillStyle = '#c9cfd8';
    if (e.step === 0) {
      g.fillRect(e.x - 1, e.y - 2, 2, 2);
      g.fillRect(e.x + 1, e.y - 1, 2, 2);
      g.fillRect(e.x - 3, e.y, 2, 2);
    } else {
      g.fillRect(e.x - 4, e.y - 3, 1, 1);
      g.fillRect(e.x + 3, e.y - 4, 1, 1);
      g.fillRect(e.x, e.y - 5, 1, 1);
      g.fillRect(e.x - 2, e.y + 1, 1, 1);
      g.fillRect(e.x + 4, e.y, 1, 1);
    }
  }

  // ---------- effetti temporizzati ----------

  var effettoTimers = [];
  var animDeadline = 0;
  var animCompletamento = null;

  function dopoMs(ms, fn) {
    effettoTimers.push(setTimeout(fn, ms));
  }

  // animazione con completamento garantito: se il timer viene congelato
  // (tab in background, telefono bloccato), il completamento scatta comunque
  // alla prima occasione utile oltre la scadenza
  function animaTimed(ms, fn) {
    animDeadline = Date.now() + ms;
    animCompletamento = fn;
    dopoMs(ms, completaAnim);
  }

  function completaAnim() {
    if (!animCompletamento) return;
    var fn = animCompletamento;
    animCompletamento = null;
    animDeadline = 0;
    fn();
  }

  function controllaAnimScaduta() {
    if (animazioneInCorso && animCompletamento && Date.now() > animDeadline) {
      completaAnim();
    }
  }

  function puliziaEffetto() {
    for (var i = 0; i < effettoTimers.length; i++) clearTimeout(effettoTimers[i]);
    effettoTimers = [];
    effetto = null;
    animazioneInCorso = false;
    petDragging = false;
    animDeadline = 0;
    animCompletamento = null;
    nascondiGhost();
    evidenziaHotzone(false);
  }

  // ---------- idle animation ----------

  function avviaIdle() {
    fermaIdle();
    idleFrame = 0;
    idleTimer = setInterval(function () {
      idleFrame = idleFrame === 0 ? 1 : 0;
      if (!currentState) return;
      // il countdown missione può azzerarsi tra un tick di gioco e l'altro (30s):
      // controlliamo anche qui così il ritorno è puntuale
      if (!animazioneInCorso && controllaMissioneScaduta()) return;
      if (!animazioneInCorso) controllaSonnoScaduto();
      disegnaStanzaEPet(currentState);
    }, IDLE_MS);
  }

  function fermaIdle() {
    if (idleTimer) {
      clearInterval(idleTimer);
      idleTimer = null;
    }
  }

  // ---------- balloon battute + toast ----------

  function mostraBalloon(testo) {
    var balloon = document.getElementById('petq-balloon');
    if (!balloon) return;
    balloon.textContent = testo;
    balloon.style.display = 'block';

    if (balloonTimer) clearTimeout(balloonTimer);
    balloonTimer = setTimeout(function () {
      balloon.style.display = 'none';
      balloonTimer = null;
    }, BALLOON_MS);
  }

  function mostraToast(testo) {
    var t = document.getElementById('petq-toast');
    if (!t) {
      t = el('div', 'petq-toast');
      t.id = 'petq-toast';
      document.body.appendChild(t);
    }
    t.textContent = testo;
    t.classList.add('petq-toast-visibile');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('petq-toast-visibile');
    }, 2000);
  }

  function situazionePrioritaria(pet) {
    var soglie = (bilanciamento().soglie) || { critica: 25 };
    var critica = (typeof soglie.critica === 'number') ? soglie.critica : 25;
    if (pet.stats.fame < critica) return 'fame';
    if (pet.stats.igiene < critica) return 'sporco';
    if (pet.stats.felicita < critica) return 'triste';
    if (pet.stats.felicita > 75) return 'felice';
    return 'saluto';
  }

  function battutaAutomatica() {
    if (!currentState || !currentState.pet) return;
    var situazione = situazionePrioritaria(currentState.pet);
    var testo = PETQ.dialog.say(currentState.pet, situazione, currentState);
    mostraBalloon(testo);
  }

  // ---------- ghost drag ----------

  function mostraGhost(sizePx, drawFn) {
    if (!ghostEl) {
      ghostEl = el('div', 'petq-ghost');
      ghostCanvas = document.createElement('canvas');
      ghostEl.appendChild(ghostCanvas);
      document.body.appendChild(ghostEl);
    }
    ghostEl.style.width = sizePx + 'px';
    ghostEl.style.height = sizePx + 'px';
    drawFn(ghostCanvas);
    ghostEl.style.display = 'block';
  }

  function muoviGhost(clientX, clientY) {
    if (!ghostEl) return;
    var size = parseInt(ghostEl.style.width, 10) || 48;
    ghostEl.style.left = (clientX - size / 2) + 'px';
    ghostEl.style.top = (clientY - size / 2 - 12) + 'px';
  }

  function nascondiGhost() {
    if (ghostEl) ghostEl.style.display = 'none';
  }

  function evidenziaHotzone(on) {
    var hz = document.getElementById('petq-hotzone');
    if (!hz) return;
    if (on) hz.classList.add('petq-hotzone-attiva');
    else hz.classList.remove('petq-hotzone-attiva');
  }

  function evidenziaHotzoneLetto(on) {
    var hz = document.getElementById('petq-hotzone-letto');
    if (!hz) return;
    if (on) hz.classList.add('petq-hotzone-attiva');
    else hz.classList.remove('petq-hotzone-attiva');
  }

  // ---------- interazioni sul canvas stanza (tap pet/poop, drag pet) ----------

  function poopSpots() {
    // se il modulo grafica espone le coordinate, usale; altrimenti fallback
    // sulle posizioni note (rooms.js POOP_SPOTS) con tolleranza generosa
    return (PETQ.rooms && (PETQ.rooms._poopSpots || PETQ.rooms.poopSpots)) ||
      [[16, 52], [54, 55], [92, 52]];
  }

  function hitPoop(p) {
    if (!currentState || !(currentState.poop > 0)) return -1;
    var spots = poopSpots();
    var n = Math.min(3, currentState.poop);
    for (var i = 0; i < n && i < spots.length; i++) {
      var cx = spots[i][0] + 2, cy = spots[i][1] + 1;
      if (Math.abs(p.x - cx) <= 9 && Math.abs(p.y - cy) <= 8) return i;
    }
    return -1;
  }

  function installaPointerCanvas(canvas) {
    canvas.addEventListener('pointerdown', function (e) {
      controllaAnimScaduta();
      if (animazioneInCorso || !currentState) return;
      var p = coordLogiche(canvas, e.clientX, e.clientY);

      var target = null, poopIdx = -1;
      if (lastPetRect && dentroRect(p, lastPetRect, 3)) {
        target = 'pet';
      } else if (currentStanza === 'cucina' && !currentState.missione &&
                 dentroRect(p, hotzoneFrigo(temaRazza(currentState.pet)), 0)) {
        target = 'frigo';
      } else {
        poopIdx = hitPoop(p);
        if (poopIdx !== -1) target = 'poop';
      }
      if (!target) return;

      canvasPointer = {
        id: e.pointerId, target: target, poopIdx: poopIdx,
        startX: e.clientX, startY: e.clientY, dragging: false
      };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    canvas.addEventListener('pointermove', function (e) {
      if (!canvasPointer || e.pointerId !== canvasPointer.id) return;

      var dx = e.clientX - canvasPointer.startX;
      var dy = e.clientY - canvasPointer.startY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var puoTrascinare = canvasPointer.target === 'pet' && !currentState.sonno &&
        (currentStanza === 'bagno' || currentStanza === 'camera');
      if (!canvasPointer.dragging && puoTrascinare && dist > 10) {
        canvasPointer.dragging = true;
        petDragging = true;
        var rect = canvas.getBoundingClientRect();
        var ghostSize = Math.round(rect.width * PET_PX / ROOM_W);
        mostraGhost(ghostSize, function (gc) {
          gc.width = PET_PX; gc.height = PET_PX;
          PETQ.sprites.draw(gc, petLikeDaState(currentState), { frame: 0 });
        });
        if (currentStanza === 'bagno') evidenziaHotzone(true);
        else evidenziaHotzoneLetto(true);
        disegnaStanzaEPet(currentState);
      }

      if (canvasPointer.dragging) {
        muoviGhost(e.clientX, e.clientY);
      } else if (dist > 14) {
        canvasPointer.tapAnnullato = true; // troppo movimento: niente tap
      }
    });

    function fine(e, annullato) {
      if (!canvasPointer || e.pointerId !== canvasPointer.id) return;
      var cp = canvasPointer;
      canvasPointer = null;

      if (cp.dragging) {
        petDragging = false;
        nascondiGhost();
        evidenziaHotzone(false);
        evidenziaHotzoneLetto(false);
        var p = coordLogiche(canvas, e.clientX, e.clientY);
        if (!annullato && currentStanza === 'bagno' && dentroRect(p, HOTZONE_VASCA, 0)) {
          avviaLavaggio();
        } else if (!annullato && currentStanza === 'camera' &&
                   dentroRect(p, hotzoneLetto(temaRazza(currentState.pet)), 0)) {
          provaAndareALetto();
        } else {
          disegnaStanzaEPet(currentState);
        }
        return;
      }

      if (annullato || cp.tapAnnullato) return;

      if (cp.target === 'pet') {
        if (currentState.sonno) {
          eseguiSveglia();
        } else {
          eseguiCoccola();
        }
      } else if (cp.target === 'poop') {
        eseguiPuliziaBisogni(cp.poopIdx);
      } else if (cp.target === 'frigo') {
        apriFrigo();
      }
    }

    canvas.addEventListener('pointerup', function (e) { fine(e, false); });
    canvas.addEventListener('pointercancel', function (e) { fine(e, true); });
  }

  // ---------- azioni di gioco (flussi touch) ----------

  function eseguiCoccola() {
    var r = PETQ.care.coccola(currentState);
    PETQ.save.save(currentState);
    aggiornaHud(currentState);
    if (r.ok) {
      battutaAutomatica(); // battuta contestuale per situazione
    } else if (r.battutaPool) {
      // Cap coccole raggiunto (FIX battute personalita'): pesca dal pool dedicato invece
      // del messaggio generico r.msg. Se il pool e' vuoto per quella personalita' (socio non
      // ha ancora scritto le battute, o file non ricaricato), dialog.say ritorna '...' come
      // placeholder universale: in quel caso ripieghiamo sul messaggio fisso di care.js.
      var battuta = PETQ.dialog.say(currentState.pet, r.battutaPool, currentState);
      mostraBalloon((battuta && battuta !== '...') ? battuta : r.msg);
    } else {
      mostraBalloon(r.msg);
    }
  }

  function eseguiPuliziaBisogni(spotIdx) {
    var spots = poopSpots();
    var s = spots[spotIdx] || spots[0];
    var r = PETQ.care.cleanPoop(currentState);
    PETQ.save.save(currentState);
    aggiornaHud(currentState);

    effetto = { tipo: 'puff', x: s[0] + 2, y: s[1] + 1, step: 0 };
    disegnaStanzaEPet(currentState);
    dopoMs(160, function () {
      if (effetto && effetto.tipo === 'puff') {
        effetto.step = 1;
        disegnaStanzaEPet(currentState);
      }
    });
    dopoMs(340, function () {
      if (effetto && effetto.tipo === 'puff') {
        effetto = null;
        disegnaStanzaEPet(currentState);
      }
    });

    mostraBalloon(r.msg);
    renderAzioni();
  }

  function avviaLavaggio() {
    animazioneInCorso = true;
    effetto = { tipo: 'wash' };
    disegnaStanzaEPet(currentState);

    animaTimed(1500, function () {
      effetto = null;
      animazioneInCorso = false;
      var r = PETQ.care.wash(currentState);
      dopoAzione(r);
    });
  }

  // Drag del pet nel letto (camera, GDD "Energia e sonno" aggiornato): "Dormire" e' un unico
  // gesto, niente piu' rifiuto prima delle 21 (fix di questa sessione: era l'ostacolo che
  // impediva di testare il sonno col debug ×600, perche' l'ora reale non avanzava mai).
  // La modalita' (riposino/notturno) la decide PETQ.pet.avviaSonno in base all'orologio DI
  // GIOCO corrente (PETQ.clock.oraGioco): il pet PUO' SEMPRE essere messo a dormire.
  function provaAndareALetto() {
    if (!currentState || !currentState.pet || currentState.sonno || currentState.missione) return;
    PETQ.pet.avviaSonno(currentState, true);
    PETQ.save.save(currentState);
    disegnaStanzaEPet(currentState);
    renderAzioni();
    mostraBalloon(PETQ.dialog.say(currentState.pet, 'dormire', currentState));
  }

  // Tap sul pet mentre dorme (canvas stanza): equivale al tasto Sveglia, stessa regola dei
  // minimi (v. eseguiSveglia sotto, condivisa col bottone renderizzato in renderAzioniCamera).
  function eseguiSveglia() {
    tentaSveglia();
  }

  // Tenta di svegliare il pet: rispetta il minimo di ore dormite (GDD: riposino 1h, notturno
  // 5h). Sotto il minimo niente sveglia, solo una battuta di protesta (bottone disabilitato
  // nella UI, ma questa funzione e' la stessa richiamata dal tap sul pet quindi la guardia
  // va ripetuta qui). Ritorna true se la sveglia e' avvenuta.
  function tentaSveglia() {
    if (!currentState || !currentState.sonno || !PETQ.pet) return false;
    var stato = PETQ.pet.puoSvegliare(currentState);
    if (!stato.puo) {
      mostraBalloon(PETQ.dialog.say(currentState.pet, 'sonno', currentState) ||
        ((currentState.pet.nome || 'Il pet') + ' sta ancora dormendo, lascialo riposare.'));
      return false;
    }
    var risultato = PETQ.pet.svegliaManuale(currentState);
    PETQ.save.save(currentState);
    disegnaStanzaEPet(currentState);
    aggiornaHud(currentState);
    renderAzioni();
    if (risultato) mostraBalloon(PETQ.dialog.say(currentState.pet, risultato.battuta, currentState));
    return true;
  }

  // Dai da mangiare (GDD "Economia" -> "Spesa e dispensa"): sempre gratis, il pagamento e'
  // gia' avvenuto allo shop. PETQ.care.feed consuma direttamente 1 porzione da state.dispensa
  // per nome (v. care.js consumaDaDispensa): qui non serve piu' fare lo splice manuale ne'
  // controllare le monete, solo reagire all'esito (frigo vuoto per quel cibo = errore raro,
  // capita solo per doppio-tap velocissimo su qty=1).
  function eseguiFeed(cibo, cardEl, dispensaIdx) {
    if (currentState.missione) {
      shakeCard(cardEl);
      mostraToast((currentState.pet.nome || 'Il pet') + ' è in missione: la pappa può aspettare.');
      return;
    }
    var r = PETQ.care.feed(currentState, cibo);
    if (!r.ok) {
      shakeCard(cardEl);
      mostraToast(r.msg);
      return;
    }
    PETQ.save.save(currentState);
    aggiornaHud(currentState);
    renderAzioni();

    effetto = { tipo: 'crumbs' };
    disegnaStanzaEPet(currentState);
    dopoMs(1300, function () {
      if (effetto && effetto.tipo === 'crumbs') {
        effetto = null;
        disegnaStanzaEPet(currentState);
      }
    });

    // battuta 'felice' occasionale, altrimenti conferma del pasto
    if (PETQ.rng.rand() < 0.35) {
      mostraBalloon(PETQ.dialog.say(currentState.pet, 'felice', currentState));
    } else {
      mostraBalloon(r.msg);
    }
  }

  function avviaAllenamento(prop, cardEl) {
    if (animazioneInCorso) return;
    if (currentState.trainDay === oggiStr()) {
      mostraToast('Allenamento già fatto oggi.');
      return;
    }
    animazioneInCorso = true;
    effetto = { tipo: 'train', prop: prop.id };
    disegnaStanzaEPet(currentState);

    animaTimed(2500, function () {
      effetto = null;
      animazioneInCorso = false;
      var r = PETQ.care.train(currentState, prop.stat);
      dopoAzione(r);
    });
  }

  function shakeCard(cardEl) {
    if (!cardEl) return;
    cardEl.classList.remove('petq-shake');
    // forza il reflow per far ripartire l'animazione
    void cardEl.offsetWidth;
    cardEl.classList.add('petq-shake');
    setTimeout(function () { cardEl.classList.remove('petq-shake'); }, 450);
  }

  // Dopo un'azione (train/teachWord/cura...): salva, ridisegna e controlla il ciclo sonno.
  // Il controllo e' importante soprattutto per l'allenamento (bilanciamento.md "Durata
  // allenamento"): avanzando l'orologio di gioco di 90 minuti puo' far scattare l'ora del
  // crollo automatico (23:00) o, in teoria con offset di giornata estremi, un nuovo giorno —
  // stesso meccanismo idempotente gia' usato dal tick/boot (controllaSonnoScaduto).
  function dopoAzione(risultato) {
    PETQ.save.save(currentState);
    aggiornaHud(currentState);
    disegnaStanzaEPet(currentState);
    renderAzioni();
    if (risultato && risultato.battutaPool) {
      mostraBalloon(PETQ.dialog.say(currentState.pet, risultato.battutaPool, currentState));
    } else if (risultato && risultato.msg) {
      mostraBalloon(risultato.msg);
    }
    controllaSonnoScaduto();
  }

  // ---------- azioni per stanza ----------

  function renderAzioni() {
    var azioni = document.getElementById('petq-azioni');
    if (!azioni || !currentState) return;
    azioni.innerHTML = '';

    if (currentStanza === 'cucina') renderAzioniCucina(azioni);
    else if (currentStanza === 'bagno') renderAzioniBagno(azioni);
    else if (currentStanza === 'camera') renderAzioniCamera(azioni);
    else if (currentStanza === 'missioni') renderTabMissioni(azioni);
    else renderAzioniSalone(azioni);
  }

  // --- camera: hint + tasto Sveglia (l'unica altra azione è drag sul canvas: letto) ---

  function renderAzioniCamera(container) {
    var nome = currentState.pet.nome || 'il pet';
    if (currentState.sonno) {
      var modalita = currentState.sonno.modalita === 'riposino' ? 'un riposino' : 'la nanna notturna';
      container.appendChild(el('p', 'petq-hint', nome + ' sta facendo ' + modalita + '.'));
      container.appendChild(costruisciTastoSveglia(nome));
    } else if (currentState.missione) {
      container.appendChild(el('p', 'petq-hint', nome + ' è in missione: il letto aspetta il suo ritorno.'));
    } else {
      container.appendChild(el('p', 'petq-hint', 'Trascina ' + nome + ' nel letto per farlo dormire: riposino di giorno, nanna vera dalle 21:00.'));
    }
  }

  // Tasto Sveglia (GDD "Energia e sonno"): sempre visibile mentre dorme, ma disabilitato
  // sotto il minimo di ore dormite (riposino 1h, notturno 5h) con il motivo esplicito.
  function costruisciTastoSveglia(nome) {
    var wrap = el('div', 'petq-riga-azione');
    var stato = PETQ.pet.puoSvegliare(currentState);
    var btn = el('button', 'petq-btn', 'Sveglia');
    if (!stato.puo) {
      btn.disabled = true;
      var motivo = 'Sta ancora riposando, ancora ' + stato.minutiMancanti + 'm.';
      btn.title = motivo;
      wrap.appendChild(btn);
      wrap.appendChild(el('p', 'petq-hint', motivo));
      return wrap;
    }
    btn.addEventListener('click', function () { tentaSveglia(); });
    wrap.appendChild(btn);
    return wrap;
  }

  function trovaCibo(nome) {
    var data = window.PETQ.content && window.PETQ.content.data;
    var cibi = (data && data.cibi) || [];
    for (var i = 0; i < cibi.length; i++) {
      if (cibi[i].nome === nome) return cibi[i];
    }
    return null;
  }

  function trovaArredoInfo(nome) {
    var data = window.PETQ.content && window.PETQ.content.data;
    var arredi = (data && data.arredi) || [];
    for (var i = 0; i < arredi.length; i++) {
      if (arredi[i].nome === nome) return arredi[i];
    }
    return null;
  }

  // cibo da dispensa non presente in cibi.md: fallback neutro (fame +20 default locale)
  function ciboFallback(nome) {
    console.warn('PETQ.ui: cibo dispensa "' + nome + '" non trovato in content.data.cibi, uso fallback');
    return { nome: nome, categoria: 'base', costo: 0, fame: 20, stat: 0, statNome: null };
  }

  // --- cucina: tap sul FRIGO -> menu del cibo POSSEDUTO (GDD "Economia" -> "Spesa e
  // dispensa"): niente più barra cibo orizzontale, niente più costo qui (già pagato allo
  // shop). Il pannello si apre/chiude con frigoAperto; ogni voce ha tap (dà subito) o drag
  // (riusa lo stesso gesto della vecchia barra) verso il pet in scena.

  function apriFrigo() {
    if (!currentState || currentState.missione) return;
    frigoAperto = !frigoAperto;
    renderAzioni();
  }

  function renderAzioniCucina(container) {
    var nome = currentState.pet.nome || 'il pet';
    var hintCucina = currentState.missione
      ? nome + ' è in missione: la pappa aspetta il suo ritorno.'
      : 'Tocca il frigo per vedere cosa avete in casa.';
    container.appendChild(el('p', 'petq-hint', hintCucina));

    if (currentState.missione) return;

    var dispensa = currentState.dispensa || [];
    if (!frigoAperto) {
      var apriBtn = el('button', 'petq-btn petq-btn-piccolo', 'Apri frigo (' + dispensa.length + ')');
      apriBtn.addEventListener('click', apriFrigo);
      container.appendChild(apriBtn);
      return;
    }

    var chiudiBtn = el('button', 'petq-btn petq-btn-piccolo', 'Chiudi frigo');
    chiudiBtn.addEventListener('click', apriFrigo);
    container.appendChild(chiudiBtn);

    if (dispensa.length === 0) {
      container.appendChild(el('p', 'petq-vuoto', 'Il frigo è vuoto: fai un salto al Market sulla mappa.'));
      return;
    }

    var lista = el('div', 'petq-food-bar');
    for (var i = 0; i < dispensa.length; i++) {
      (function (voce, idx) {
        var cibo = trovaCibo(voce.nome) || ciboFallback(voce.nome);
        var card = el('div', 'petq-food-card petq-food-card-dispensa');

        var icona = document.createElement('canvas');
        icona.width = 12; icona.height = 12;
        icona.className = 'petq-food-icon';
        disegnaCibo(icona, cibo);
        card.appendChild(icona);

        card.appendChild(el('div', 'petq-food-nome', cibo.nome));
        card.appendChild(el('div', 'petq-food-tag', 'x' + (voce.qty || 0)));
        var effettiEl = el('div', 'petq-food-costo', descriviCibo(cibo));
        card.appendChild(effettiEl);

        card.addEventListener('click', function () {
          if (!foodPointer) eseguiFeed(cibo, card, idx);
        });
        installaDragCibo(card, cibo, idx);
        lista.appendChild(card);
      })(dispensa[i], i);
    }
    container.appendChild(lista);
  }

  function descriviCibo(cibo) {
    var effetti = '+' + cibo.fame + ' fame';
    if (cibo.statNome) effetti += ', +' + cibo.stat + ' ' + cibo.statNome;
    return effetti;
  }

  // Drag di una card cibo del frigo verso la scena (stesso gesto della vecchia barra cibo):
  // se il rilascio cade sul canvas stanza, da' da mangiare (eseguiFeed). Il tap semplice (niente
  // drag) e' gia' gestito dal listener 'click' della card in renderAzioniCucina.
  function installaDragCibo(card, cibo, dispensaIdx) {
    card.addEventListener('pointerdown', function (e) {
      if (animazioneInCorso) return;
      foodPointer = {
        id: e.pointerId, cibo: cibo, card: card,
        startX: e.clientX, startY: e.clientY, dragging: false
      };
    });

    card.addEventListener('pointermove', function (e) {
      if (!foodPointer || e.pointerId !== foodPointer.id) return;

      var dx = e.clientX - foodPointer.startX;
      var dy = e.clientY - foodPointer.startY;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (!foodPointer.dragging) {
        // touch: parte il drag solo se il gesto è più verticale che orizzontale
        // (orizzontale = scroll della barra, con touch-action: pan-x);
        // mouse: basta la distanza
        var verticale = Math.abs(dy) > Math.abs(dx);
        if ((e.pointerType === 'mouse' && dist > 6) || (dist > 10 && verticale)) {
          foodPointer.dragging = true;
          try { card.setPointerCapture(e.pointerId); } catch (err) {}
          var canvas = document.getElementById('petq-canvas-stanza');
          var rect = canvas ? canvas.getBoundingClientRect() : { width: 448 };
          var ghostSize = Math.max(32, Math.round(rect.width * 12 / ROOM_W));
          mostraGhost(ghostSize, function (gc) {
            gc.width = 12; gc.height = 12;
            disegnaCibo(gc, cibo);
          });
          muoviGhost(e.clientX, e.clientY);
        }
      } else {
        muoviGhost(e.clientX, e.clientY);
      }
    });

    function fine(e, annullato) {
      if (!foodPointer || e.pointerId !== foodPointer.id) return;
      var fp = foodPointer;
      foodPointer = null;

      if (fp.dragging) {
        nascondiGhost();
        if (annullato) return;
        var canvas = document.getElementById('petq-canvas-stanza');
        if (canvas) {
          var r = canvas.getBoundingClientRect();
          var dentro = e.clientX >= r.left && e.clientX <= r.right &&
                       e.clientY >= r.top && e.clientY <= r.bottom;
          if (dentro) eseguiFeed(fp.cibo, fp.card, dispensaIdx);
        }
      }
      // tap semplice (niente drag): gestito dal listener 'click' della card, niente da fare qui.
    }

    card.addEventListener('pointerup', function (e) { fine(e, false); });
    card.addEventListener('pointercancel', function (e) { fine(e, true); });
  }

  // --- bagno: solo suggerimenti, le azioni sono drag/tap sul canvas ---

  function renderAzioniBagno(container) {
    var nome = currentState.pet.nome || 'il pet';
    if (currentState.missione) {
      container.appendChild(el('p', 'petq-hint', nome + ' è in missione: niente bagnetto finché non torna.'));
    } else {
      container.appendChild(el('p', 'petq-hint', 'Trascina ' + nome + ' nella vasca per lavarlo.'));
    }
    if (currentState.poop > 0) {
      container.appendChild(el('p', 'petq-hint', 'Tocca i bisogni per pulirli.'));
    }

    // Infermeria (fix playtest 7c): la zona è SEMPRE visibile, con stato esplicito invece
    // di sparire — "Nessuna ferita da curare" / "Cura — N monete" / "Cure finite per oggi".
    container.appendChild(costruisciInfermeria(nome));
  }

  function costruisciInfermeria(nome) {
    var wrap = el('div', 'petq-infermeria');
    wrap.appendChild(el('div', 'petq-infermeria-titolo', 'Infermeria'));

    var costo = costoCura();
    var ferite = currentState.ferite || 0;

    if (ferite <= 0) {
      wrap.appendChild(el('p', 'petq-hint', 'Nessuna ferita da curare.'));
      return wrap;
    }

    var btn = el('button', 'petq-btn', 'Cura — ' + costo + ' monete');
    var motivo = null;
    if (currentState.missione) motivo = nome + ' è in missione.';
    else if (cureEsauriteOggi()) motivo = 'Cure finite per oggi, torna domani.';
    else if ((currentState.coins || 0) < costo) motivo = 'Monete insufficienti.';
    if (motivo) {
      btn.disabled = true;
      btn.title = motivo;
      wrap.appendChild(el('p', 'petq-hint', motivo));
    }
    btn.addEventListener('click', avviaCura);
    wrap.appendChild(btn);
    return wrap;
  }

  // Costo cura mostrato in UI: dalla config se un giorno verrà mappata
  // (bilanciamento.infermeria.costo), altrimenti 15 come hardcoded in care.cura
  function costoCura() {
    var bil = bilanciamento();
    if (bil.infermeria && typeof bil.infermeria.costo === 'number') return bil.infermeria.costo;
    return 15;
  }

  function cureEsauriteOggi() {
    var bil = bilanciamento();
    var maxCure = (bil.infermeria && typeof bil.infermeria.maxGiorno === 'number') ? bil.infermeria.maxGiorno : 2;
    return currentState.cureDay === oggiStr() && (currentState.cureOggi || 0) >= maxCure;
  }

  function avviaCura() {
    if (animazioneInCorso || !currentState || currentState.missione) return;
    var r = PETQ.care.cura(currentState);
    if (!r.ok) {
      mostraToast(r.msg);
      renderAzioni();
      return;
    }
    animazioneInCorso = true;
    effetto = { tipo: 'cura' };
    disegnaStanzaEPet(currentState);
    mostraToast(r.msg);

    animaTimed(1500, function () {
      effetto = null;
      animazioneInCorso = false;
      dopoAzione(null);
      mostraBalloon(PETQ.dialog.say(currentState.pet, 'felice', currentState));
    });
  }

  // --- salone: card allenamento + insegna parola ---

  function renderAzioniSalone(container) {
    var oggi = oggiStr();
    var nome = currentState.pet.nome || 'il pet';
    var inMissione = !!currentState.missione;
    var giaAllenato = currentState.trainDay === oggi;
    var cardsDisabilitate = giaAllenato || inMissione;

    var hintSalone = inMissione
      ? nome + ' è in missione. Intanto puoi sistemare la collezione.'
      : 'Tocca ' + nome + ' per una coccola. Allenamento (1 al giorno):';
    container.appendChild(el('p', 'petq-hint', hintSalone));

    var cards = el('div', 'petq-train-cards');
    for (var i = 0; i < PROPS_ALLENAMENTO.length; i++) {
      (function (prop) {
        var card = el('div', 'petq-train-card' + (cardsDisabilitate ? ' petq-train-card-usata' : ''));
        if (giaAllenato) card.title = 'Allenamento già fatto oggi';
        else if (inMissione) card.title = nome + ' è in missione';

        var icona = document.createElement('canvas');
        icona.width = 12; icona.height = 12;
        icona.className = 'petq-train-icon';
        disegnaProp(icona, prop.id);
        card.appendChild(icona);
        card.appendChild(el('div', 'petq-train-label', prop.label));
        card.appendChild(el('div', 'petq-train-val', testoStat(prop.stat)));

        card.addEventListener('click', function () {
          if (currentState.trainDay === oggiStr() || currentState.missione) return;
          avviaAllenamento(prop, card);
        });
        cards.appendChild(card);
      })(PROPS_ALLENAMENTO[i]);
    }
    container.appendChild(cards);

    // insegna parola: resta bottone + input (serve la tastiera)
    var paroleWrap = el('div', 'petq-riga-azione');
    var inputParola = document.createElement('input');
    inputParola.type = 'text';
    inputParola.className = 'petq-input petq-input-piccolo';
    inputParola.placeholder = 'Nuova parola...';
    var giaInsegnato = currentState.wordDay === oggi;
    if (giaInsegnato || inMissione) inputParola.disabled = true;
    paroleWrap.appendChild(inputParola);

    var paroleBtn = el('button', 'petq-btn petq-btn-piccolo', 'Insegna parola');
    if (giaInsegnato || inMissione) {
      paroleBtn.disabled = true;
      paroleBtn.title = giaInsegnato ? 'Parola già insegnata oggi' : nome + ' è in missione';
    }
    paroleBtn.addEventListener('click', function () {
      var r = PETQ.care.teachWord(currentState, inputParola.value);
      dopoAzione(r);
    });
    paroleWrap.appendChild(paroleBtn);
    container.appendChild(paroleWrap);

    // collezione arredi
    var collBtn = el('button', 'petq-btn', collezioneAperta ? 'Chiudi collezione' : 'Collezione');
    collBtn.addEventListener('click', function () {
      collezioneAperta = !collezioneAperta;
      renderAzioni();
    });
    container.appendChild(collBtn);
    if (collezioneAperta) container.appendChild(costruisciCollezione());
  }

  // ---------- collezione arredi ----------

  function costruisciCollezione() {
    var wrap = el('div', 'petq-collezione');
    var arr = currentState.arredi || {};
    var posseduti = arr.posseduti || [];
    var piazzati = arr.piazzati || { cucina: [], bagno: [], salone: [] };
    var stanze = ['cucina', 'bagno', 'salone'];
    var slotMax = (PETQ.arredi && PETQ.arredi.slotPerStanza) ? PETQ.arredi.slotPerStanza() : 3;

    var slotInfo = [];
    for (var s = 0; s < stanze.length; s++) {
      var occupati = (piazzati[stanze[s]] || []).length;
      slotInfo.push(capitalize(stanze[s]) + ' ' + occupati + '/' + slotMax);
    }
    wrap.appendChild(el('p', 'petq-hint', 'Slot: ' + slotInfo.join(' · ')));

    // conteggio copie totali per nome (per mostrare "Vendi" solo sui doppioni)
    var conteggi = {};
    function conta(voce) { conteggi[voce.nome] = (conteggi[voce.nome] || 0) + 1; }
    for (var p = 0; p < posseduti.length; p++) conta(posseduti[p]);
    for (var s2 = 0; s2 < stanze.length; s2++) {
      var lista = piazzati[stanze[s2]] || [];
      for (var j = 0; j < lista.length; j++) conta(lista[j]);
    }

    var vuota = true;
    for (var s3 = 0; s3 < stanze.length; s3++) {
      var listaP = piazzati[stanze[s3]] || [];
      for (var k = 0; k < listaP.length; k++) {
        wrap.appendChild(rigaArredo(listaP[k], stanze[s3], conteggi));
        vuota = false;
      }
    }
    for (var q = 0; q < posseduti.length; q++) {
      wrap.appendChild(rigaArredo(posseduti[q], null, conteggi));
      vuota = false;
    }

    if (vuota) {
      wrap.appendChild(el('p', 'petq-vuoto', 'Nessun arredo: completa le missioni per trovarne.'));
    }
    return wrap;
  }

  function rigaArredo(voce, piazzatoIn, conteggi) {
    var info = trovaArredoInfo(voce.nome);
    var stanzaDest = (info && ['cucina', 'bagno', 'salone'].indexOf(info.stanza) !== -1) ? info.stanza : 'salone';

    var riga = el('div', 'petq-arredo-riga');
    var testi = el('div', 'petq-arredo-info');

    var titolo = voce.nome + (piazzatoIn ? ' — in ' + piazzatoIn : '');
    testi.appendChild(el('div', 'petq-arredo-nome', titolo));

    var dett = [];
    dett.push((info && info.bonus && info.bonus !== '—') ? info.bonus : 'solo collezione');
    if (!piazzatoIn) dett.push('stanza: ' + stanzaDest);
    if (typeof voce.scadenzaMs === 'number') {
      var restante = voce.scadenzaMs - Date.now();
      dett.push(restante > 0 ? 'scade tra ' + formattaTempo(restante) : 'scaduto');
    }
    testi.appendChild(el('div', 'petq-arredo-dett', dett.join(' · ')));
    riga.appendChild(testi);

    var btns = el('div', 'petq-arredo-btns');

    if (piazzatoIn) {
      var btnRim = el('button', 'petq-btn petq-btn-mini', 'Rimuovi');
      btnRim.addEventListener('click', function () {
        var r = PETQ.arredi.rimuovi(currentState, voce.nome);
        dopoAzioneArredo(r);
      });
      btns.appendChild(btnRim);
    } else {
      var btnPiazza = el('button', 'petq-btn petq-btn-mini', 'Piazza in ' + stanzaDest);
      btnPiazza.addEventListener('click', function () {
        var r = PETQ.arredi.piazza(currentState, voce.nome, stanzaDest);
        dopoAzioneArredo(r);
      });
      btns.appendChild(btnPiazza);
    }

    if ((conteggi[voce.nome] || 0) > 1) {
      var btnVendi = el('button', 'petq-btn petq-btn-mini petq-btn-danger', 'Vendi');
      btnVendi.addEventListener('click', function () {
        var r = PETQ.arredi.vendi(currentState, voce.nome);
        dopoAzioneArredo(r);
      });
      btns.appendChild(btnVendi);
    }

    riga.appendChild(btns);
    return riga;
  }

  function dopoAzioneArredo(r) {
    PETQ.save.save(currentState);
    aggiornaHud(currentState);
    renderAzioni();
    if (r && r.msg) mostraToast(r.msg);
  }

  // ==================== TAB MISSIONI ====================

  function renderTabMissioni(container) {
    if (!PETQ.missions) {
      container.appendChild(el('p', 'petq-vuoto', 'Modulo missioni non disponibile.'));
      return;
    }
    if (mappaDisponibile()) {
      renderTabMissioniMappa(container);
    } else {
      renderTabMissioniLista(container);
    }
  }

  // guard sulle API mappa del modulo grafica (in arrivo in parallelo):
  // finché mancano, la tab resta la lista di card
  function mappaDisponibile() {
    return !!(PETQ.rooms && PETQ.rooms.drawMappa && PETQ.rooms._mappaPins &&
              PETQ.rooms._MAPPA_W > 0 && PETQ.rooms._MAPPA_H > 0);
  }

  // --- fallback: lista di card (comportamento pre-mappa, invariato) ---

  function renderTabMissioniLista(container) {
    // giorno 1: solo il tutorial M0, flusso dedicato senza rosa
    if (!currentState.tutorialFatto) {
      var m0 = PETQ.missions.tutorialDaProporre(currentState);
      if (m0) {
        container.appendChild(cardTutorial(m0));
        return;
      }
    }

    if (currentState.missione) {
      container.appendChild(cardMissioneInCorso());
      return;
    }

    if (missioneEsauritaOggi()) {
      container.appendChild(el('p', 'petq-hint', 'Missione di oggi completata: torna domani per una nuova rosa.'));
      return;
    }

    container.appendChild(el('p', 'petq-hint', 'La rosa di oggi: scegli una missione e mandaci ' + (currentState.pet.nome || 'il pet') + '.'));

    var rosa = PETQ.missions.rosaDelGiorno(currentState);
    if (!rosa || rosa.length === 0) {
      container.appendChild(el('p', 'petq-vuoto', 'Nessuna missione disponibile.'));
      return;
    }
    for (var i = 0; i < rosa.length; i++) {
      container.appendChild(cardMissione(rosa[i]));
    }
  }

  // --- mappa della città ---

  // Limite 1 missione al giorno (fix playtest): missions.avvia() rifiuta comunque, questo è
  // solo per la UI (mappa senza pin attivi + hint dedicato). Il tutorial M0 non conta (non
  // passa da missioneGiorno, v. missions.js risolviTutorial).
  function missioneEsauritaOggi() {
    return !!currentState.missioneGiorno && currentState.missioneGiorno === oggiStr();
  }

  // Stato corrente della mappa: quali pin sono attivi/tappabili, quale luogo è "in corso",
  // e le schede per costruire il pannello dettaglio.
  function statoMappa() {
    if (!currentState.tutorialFatto) {
      var m0 = PETQ.missions.tutorialDaProporre(currentState);
      if (m0) return { attivi: ['m0'], inCorso: null, tutorial: m0, rosa: [m0] };
    }
    if (currentState.missione) {
      return { attivi: [], inCorso: currentState.missione.id, tutorial: null, rosa: [] };
    }
    if (missioneEsauritaOggi()) {
      return { attivi: [], inCorso: null, tutorial: null, rosa: [], esaurita: true };
    }
    var rosa = PETQ.missions.rosaDelGiorno(currentState) || [];
    var attivi = [];
    for (var i = 0; i < rosa.length; i++) attivi.push(rosa[i].id);
    return { attivi: attivi, inCorso: null, tutorial: null, rosa: rosa };
  }

  function renderTabMissioniMappa(container) {
    var sm = statoMappa();
    var nome = currentState.pet.nome || 'il pet';

    var hint;
    if (sm.inCorso) hint = nome + ' è in giro per la città: eccolo sulla mappa. Il Market resta aperto.';
    else if (sm.tutorial) hint = 'Primo giorno: tocca il pin del negozio di giocattoli.';
    else if (sm.esaurita) hint = 'Missione di oggi completata: torna domani per una nuova rosa. Il Market resta aperto.';
    else hint = 'Scegli una destinazione per ' + nome + ', o fai la spesa al Market.';
    container.appendChild(el('p', 'petq-hint', hint));

    var mappaWrap = el('div', 'petq-mappa-wrap');
    mappaWrap.id = 'petq-mappa-wrap';

    var canvas = document.createElement('canvas');
    canvas.id = 'petq-canvas-mappa';
    canvas.className = 'petq-canvas-mappa';
    canvas.width = PETQ.rooms._MAPPA_W;
    canvas.height = PETQ.rooms._MAPPA_H;
    canvas.style.aspectRatio = PETQ.rooms._MAPPA_W + ' / ' + PETQ.rooms._MAPPA_H;
    mappaWrap.appendChild(canvas);
    container.appendChild(mappaWrap);

    var dettaglio = el('div', 'petq-mappa-dettaglio');
    dettaglio.id = 'petq-mappa-dettaglio';
    dettaglio.style.display = 'none';
    container.appendChild(dettaglio);

    installaPointerMappa(canvas);
    ridisegnaMappa();
    aggiornaEtichetteMappa(sm);
    aggiornaDettaglioMappa(sm);
  }

  function ridisegnaMappa() {
    if (!mappaDisponibile()) return;
    var canvas = document.getElementById('petq-canvas-mappa');
    if (!canvas || !currentState) return;
    var sm = statoMappa();
    PETQ.rooms.drawMappa(canvas, { attivi: sm.attivi, inCorso: sm.inCorso, frame: idleFrame });
  }

  // Etichette col nome sui luoghi attivi (fix playtest, GDD "Mappa leggibilità"): overlay HTML
  // posizionati in percentuale sui rettangoli pin (stessa tecnica delle hotzone stanza),
  // chip piccole semi-trasparenti con testo nitido — la pixel art da sola non basta a
  // riconoscere i luoghi. Nomi brevi indipendenti dal titolo scheda (che può cambiare).
  var NOME_BREVE_LUOGO = {
    m0: 'Negozio', m1: 'Sala Giochi', m2: 'Parco', m3: 'Dojo', m4: 'Biblioteca',
    m5: 'Industria', m6: 'Studio TV', m7: 'Fogne', m8: 'Neon Ave'
  };

  function aggiornaEtichetteMappa(sm) {
    var wrap = document.getElementById('petq-mappa-wrap');
    if (!wrap) return;
    var esistenti = wrap.querySelectorAll('.petq-mappa-etichetta');
    for (var r = 0; r < esistenti.length; r++) esistenti[r].remove();

    var pins = (PETQ.rooms && PETQ.rooms._mappaPins) || {};
    var attivi = (sm && sm.attivi) || [];
    var mw = PETQ.rooms._MAPPA_W, mh = PETQ.rooms._MAPPA_H;

    function piazzaEtichetta(rect, testo) {
      if (!rect || !testo) return;
      var chip = el('div', 'petq-mappa-etichetta', testo);
      var cx = rect.x + rect.w / 2;
      var yTop = Math.max(0, rect.y - 2); // appena sopra il luogo/pin, dentro il canvas
      chip.style.left = (cx / mw * 100) + '%';
      chip.style.top = (yTop / mh * 100) + '%';
      wrap.appendChild(chip);
    }

    for (var i = 0; i < attivi.length; i++) {
      piazzaEtichetta(pins[attivi[i]], NOME_BREVE_LUOGO[attivi[i]]);
    }
    // Shop cibo (GDD "Economia" -> "Spesa e dispensa"): etichetta SEMPRE visibile, il pin non
    // fa parte della rosa a rotazione quindi non passa mai da 'attivi'.
    if (PETQ.rooms && PETQ.rooms._shopPin) {
      piazzaEtichetta(PETQ.rooms._shopPin, 'Market');
    }
  }

  function aggiornaDettaglioMappa(sm) {
    var dettaglio = document.getElementById('petq-mappa-dettaglio');
    if (!dettaglio) return;
    dettaglio.innerHTML = '';

    // shop cibo: pannello acquisto, ha priorità su tutto il resto (sempre accessibile, non è
    // una missione — v. GDD "Economia" -> "Spesa e dispensa")
    if (negozioSelezionato) {
      dettaglio.appendChild(pannelloShop());
      dettaglio.style.display = '';
      return;
    }

    // missione in corso: il dettaglio è sempre la card col countdown, niente selezione
    if (sm.inCorso) {
      dettaglio.appendChild(cardMissioneInCorso());
      dettaglio.style.display = '';
      return;
    }

    if (!missioneSelezionata) {
      dettaglio.style.display = 'none';
      return;
    }

    if (sm.tutorial && missioneSelezionata === 'm0') {
      dettaglio.appendChild(cardTutorial(sm.tutorial));
      dettaglio.style.display = '';
      return;
    }

    var scheda = null;
    for (var i = 0; i < sm.rosa.length; i++) {
      if (sm.rosa[i].id === missioneSelezionata) { scheda = sm.rosa[i]; break; }
    }
    if (!scheda) {
      missioneSelezionata = null;
      dettaglio.style.display = 'none';
      return;
    }
    dettaglio.appendChild(cardMissione(scheda));
    dettaglio.style.display = '';
  }

  // ---------- shop cibo (pin permanente sulla mappa, GDD "Economia" -> "Spesa e dispensa") ----------
  // Menu ACQUISTO (non una missione): lista dei cibi da content/cibi.md con prezzo; "Compra"
  // acquista 1 porzione, ripetibile, scala le monete e incrementa la qty in dispensa (frigo).
  function pannelloShop() {
    var wrap = el('div', 'petq-missione-card petq-shop-card');
    wrap.appendChild(el('div', 'petq-missione-titolo', 'Market'));
    wrap.appendChild(el('div', 'petq-missione-meta', 'Compra cibo: finisce nel frigo in cucina, gratis da lì in poi.'));

    var data = window.PETQ.content && window.PETQ.content.data;
    var cibi = (data && data.cibi) || [];
    if (cibi.length === 0) {
      wrap.appendChild(el('p', 'petq-vuoto', 'Nessun cibo disponibile.'));
      return wrap;
    }

    var lista = el('div', 'petq-shop-lista');
    for (var i = 0; i < cibi.length; i++) {
      (function (cibo) {
        var riga = el('div', 'petq-shop-riga');

        var icona = document.createElement('canvas');
        icona.width = 12; icona.height = 12;
        icona.className = 'petq-food-icon';
        disegnaCibo(icona, cibo);
        riga.appendChild(icona);

        var info = el('div', 'petq-shop-info');
        info.appendChild(el('div', 'petq-cibo-nome', cibo.nome));
        info.appendChild(el('div', 'petq-cibo-effetti', descriviCibo(cibo) + ' — ' + cibo.costo + ' monete'));
        riga.appendChild(info);

        var btn = el('button', 'petq-btn petq-btn-mini', 'Compra');
        if ((currentState.coins || 0) < cibo.costo) {
          btn.disabled = true;
          btn.title = 'Monete insufficienti.';
        }
        btn.addEventListener('click', function () { eseguiAcquisto(cibo, riga); });
        riga.appendChild(btn);

        lista.appendChild(riga);
      })(cibi[i]);
    }
    wrap.appendChild(lista);
    return wrap;
  }

  // Compra 1 porzione del cibo: scala le monete, incrementa la qty in dispensa (o crea la
  // riga se il pet non ne aveva). Ripetibile a piacere finché ci sono monete.
  function eseguiAcquisto(cibo, rigaEl) {
    if (!currentState) return;
    if ((currentState.coins || 0) < cibo.costo) {
      shakeCard(rigaEl);
      mostraToast('Monete insufficienti.');
      return;
    }
    currentState.coins -= cibo.costo;
    if (!Array.isArray(currentState.dispensa)) currentState.dispensa = [];
    var voce = null;
    for (var i = 0; i < currentState.dispensa.length; i++) {
      if (currentState.dispensa[i].nome === cibo.nome) { voce = currentState.dispensa[i]; break; }
    }
    if (voce) {
      voce.qty = (voce.qty || 0) + 1;
    } else {
      currentState.dispensa.push({ nome: cibo.nome, qty: 1 });
    }
    PETQ.save.save(currentState);
    aggiornaHud(currentState);
    aggiornaDettaglioMappa(statoMappa());
    mostraToast(cibo.nome + ' comprato: ora è nel frigo.');
  }

  function coordMappa(canvas, clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return { x: -1, y: -1 };
    return {
      x: (clientX - r.left) * PETQ.rooms._MAPPA_W / r.width,
      y: (clientY - r.top) * PETQ.rooms._MAPPA_H / r.height
    };
  }

  // hit-test sui pin dei soli luoghi attivi (margine generoso per il touch)
  function hitPin(p, attivi) {
    var pins = (PETQ.rooms && PETQ.rooms._mappaPins) || {};
    for (var i = 0; i < (attivi || []).length; i++) {
      var id = attivi[i];
      var rect = pins[id];
      if (rect && dentroRect(p, rect, 3)) return id;
    }
    return null;
  }

  // hit-test sul pin shop (SEMPRE tappabile, GDD: "sempre accessibile", distinto dalla rosa)
  function hitShopPin(p) {
    var rect = PETQ.rooms && PETQ.rooms._shopPin;
    return !!(rect && dentroRect(p, rect, 3));
  }

  function installaPointerMappa(canvas) {
    canvas.addEventListener('pointerdown', function (e) {
      mapPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });

    function fine(e, annullato) {
      if (!mapPointer || e.pointerId !== mapPointer.id) return;
      var dx = e.clientX - mapPointer.x;
      var dy = e.clientY - mapPointer.y;
      mapPointer = null;
      if (annullato || Math.sqrt(dx * dx + dy * dy) > 12) return; // non era un tap

      var p = coordMappa(canvas, e.clientX, e.clientY);

      // shop: sempre tappabile (anche a missione in corso o rosa esaurita), niente a che
      // vedere col motore missioni. Tap fuori dal pin mentre il negozio e' aperto lo chiude.
      if (hitShopPin(p)) {
        negozioSelezionato = true;
        missioneSelezionata = null;
        aggiornaDettaglioMappa(statoMappa());
        return;
      }
      if (negozioSelezionato) {
        negozioSelezionato = false;
        aggiornaDettaglioMappa(statoMappa());
        return;
      }

      var sm = statoMappa();
      if (sm.inCorso) return; // nessun pin missione tappabile durante la missione

      missioneSelezionata = hitPin(p, sm.attivi); // pin -> seleziona/cambia; fuori -> null = chiude
      ridisegnaMappa();
      aggiornaDettaglioMappa(sm);
    }

    canvas.addEventListener('pointerup', function (e) { fine(e, false); });
    canvas.addEventListener('pointercancel', function (e) { fine(e, true); });
  }

  function titoloMissione(scheda) {
    var t = (scheda && scheda.titolo) || '';
    t = t.replace(/^Missione\s+\d+\s*[:—–-]*\s*/i, '');
    t = t.replace(/\s*\[[^\]]*\]\s*$/, '');
    return t.trim() || (scheda && scheda.id) || 'Missione';
  }

  function statLabels(statArr) {
    var out = [];
    for (var i = 0; i < (statArr || []).length; i++) {
      out.push(STAT_LABEL[statArr[i]] || capitalize(statArr[i]));
    }
    return out.join(', ');
  }

  function cardMissione(scheda) {
    var card = el('div', 'petq-missione-card');
    card.appendChild(el('div', 'petq-missione-titolo', titoloMissione(scheda)));

    var meta = [];
    if (scheda.luogo) meta.push(scheda.luogo);
    if (scheda.durata) meta.push('Durata: ' + scheda.durata);
    // niente valore del pet qui: scoprire se si è all'altezza fa parte del gioco
    // (le proprie stat si leggono nell'HUD)
    if (scheda.stat && scheda.stat.length) meta.push('Stat: ' + statLabels(scheda.stat));
    if (scheda.costo > 0) meta.push('Costo: ' + scheda.costo + ' monete');
    card.appendChild(el('div', 'petq-missione-meta', meta.join(' · ')));

    // anteprima del SOLO esito standard: fallimenti e super si scoprono giocando
    var standard = null;
    for (var i = 0; i < (scheda.esiti || []).length; i++) {
      if (scheda.esiti[i].tipo === 'standard') { standard = scheda.esiti[i]; break; }
    }
    if (standard && standard.reward && standard.reward.length) {
      var tokens = [];
      for (var j = 0; j < standard.reward.length; j++) {
        tokens.push(formattaRewardToken(standard.reward[j]));
      }
      card.appendChild(el('div', 'petq-missione-reward', 'Ricompensa: ' + tokens.join(', ')));
    }

    var btn = el('button', 'petq-btn petq-btn-primario petq-btn-piccolo', 'Parti');
    if (scheda.costo > 0 && (currentState.coins || 0) < scheda.costo) {
      btn.disabled = true;
      btn.title = 'Monete insufficienti.';
    }
    btn.addEventListener('click', function () { eseguiPartenza(scheda); });
    card.appendChild(btn);

    return card;
  }

  function cardMissioneInCorso() {
    var scheda = PETQ.missions.inCorso(currentState);
    var card = el('div', 'petq-missione-card petq-missione-card-corso');
    card.appendChild(el('div', 'petq-missione-titolo', scheda ? titoloMissione(scheda) : 'Missione in corso'));
    if (scheda && scheda.luogo) card.appendChild(el('div', 'petq-missione-meta', scheda.luogo));

    var countdown = el('div', 'petq-missione-countdown-riga');
    countdown.appendChild(el('span', null, 'Torna tra '));
    var span = el('span', 'petq-missione-countdown', formattaTempo(PETQ.missions.tempoRimasto(currentState)));
    span.id = 'petq-missione-countdown';
    countdown.appendChild(span);
    card.appendChild(countdown);

    if (battutaPartenza) {
      card.appendChild(el('div', 'petq-missione-quote', '"' + battutaPartenza + '"'));
    }
    return card;
  }

  function cardTutorial(m0) {
    var card = el('div', 'petq-missione-card petq-missione-card-tutorial');
    card.appendChild(el('div', 'petq-missione-titolo', titoloMissione(m0)));
    if (m0.luogo) card.appendChild(el('div', 'petq-missione-meta', m0.luogo));
    card.appendChild(el('div', 'petq-missione-reward', 'Regalo di benvenuto: nessun rischio, nessuna attesa.'));

    var btn = el('button', 'petq-btn petq-btn-primario petq-btn-piccolo', 'Vai');
    btn.addEventListener('click', eseguiTutorial);
    card.appendChild(btn);
    return card;
  }

  function eseguiPartenza(scheda) {
    if (currentState.missione) return;
    var r = PETQ.missions.avvia(currentState, scheda.id);
    if (!r.ok) {
      mostraToast(r.msg);
      return;
    }
    PETQ.save.save(currentState);
    battutaPartenza = PETQ.dialog.say(currentState.pet, 'missione_partenza', currentState);
    missioneSelezionata = null;
    aggiornaHud(currentState);
    renderAzioni(); // ora la tab mostra la scheda in corso con countdown e battuta
  }

  function eseguiTutorial() {
    var r = PETQ.missions.risolviTutorial(currentState);
    if (!r.ok) {
      mostraToast(r.msg);
      return;
    }
    PETQ.save.save(currentState);
    mostraEsito(r);
  }

  // ==================== SCHERMATA ESITO ====================

  function mostraEsito(esito) {
    fermaIdle();
    puliziaEffetto();
    battutaPartenza = null;
    collezioneAperta = false;
    missioneSelezionata = null;

    var app = getApp();
    app.innerHTML = '';

    var titoli = {
      standard: 'Missione compiuta',
      super: 'Super successo!',
      fallimento: 'Missione fallita...',
      tutorial: 'Regalo di benvenuto'
    };

    var wrap = el('div', 'petq-screen petq-esito');
    wrap.appendChild(el('h1', 'petq-title', titoli[esito.tipo] || 'Ritorno a casa'));

    var cart = document.createElement('canvas');
    cart.width = ROOM_W;
    cart.height = ROOM_H;
    cart.className = 'petq-cartolina';
    disegnaCartolina(cart, esito.scenaId, petLikeDaState(currentState));
    wrap.appendChild(cart);

    var testo = risolviSlotEsito(esito.testo || '', esito);
    if (testo) wrap.appendChild(el('p', 'petq-esito-testo', testo));

    if (esito.rewards && esito.rewards.length) {
      var lista = el('div', 'petq-esito-rewards');
      lista.appendChild(el('div', 'petq-hint', 'Ottenuto:'));
      for (var i = 0; i < esito.rewards.length; i++) {
        lista.appendChild(rigaReward(esito.rewards[i]));
      }
      wrap.appendChild(lista);
    }

    var btn = el('button', 'petq-btn petq-btn-primario', 'Torna a casa');
    btn.addEventListener('click', function () {
      mostraCasa(currentState);
      var pool = esito.tipo === 'fallimento' ? 'missione_fallimento' : 'missione_successo';
      mostraBalloon(PETQ.dialog.say(currentState.pet, pool, currentState));
    });
    wrap.appendChild(btn);

    app.appendChild(wrap);
    montaDebugPanel();
  }

  // slot nei testi esito: {oggetto} = il primo arredo/arma dei reward (tutorial M0), {nome} = pet
  function risolviSlotEsito(testo, esito) {
    if (!testo) return '';
    var oggetto = 'un regalo';
    for (var i = 0; i < ((esito && esito.rewards) || []).length; i++) {
      var rw = esito.rewards[i];
      if (rw.tipo === 'arredo' || rw.tipo === 'arma') { oggetto = rw.nome; break; }
    }
    return testo
      .replace(/\{oggetto\}/g, oggetto)
      .replace(/\{nome\}/g, (currentState && currentState.pet && currentState.pet.nome) || '...');
  }

  function rigaReward(rw) {
    var riga = el('div', 'petq-reward-riga');

    var icona = document.createElement('canvas');
    icona.width = 12;
    icona.height = 12;
    icona.className = 'petq-reward-icona';
    if (rw.tipo === 'cibo') {
      disegnaCibo(icona, trovaCibo(rw.nome) || { nome: rw.nome, categoria: 'base' });
    } else if (rw.tipo === 'arredo' || rw.tipo === 'arma' || rw.tipo === 'tutteArmi' || rw.tipo === 'allenatore') {
      disegnaQuadratino(icona, '#c8a25a');
    } else if (rw.tipo === 'perk') {
      disegnaQuadratino(icona, '#3ee6d0');
    } else {
      disegnaQuadratino(icona, rw.tipo === 'ferite' ? '#e85a5a' : '#8a94a0');
    }
    riga.appendChild(icona);

    riga.appendChild(el('span', 'petq-reward-testo', formattaRewardOggetto(rw)));
    return riga;
  }

  function disegnaQuadratino(canvas, colore) {
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#1e242e';
    g.fillRect(1, 1, 10, 10);
    g.fillStyle = colore;
    g.fillRect(2, 2, 8, 8);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(3, 3, 2, 1);
  }

  function segno(n) {
    return (n > 0 ? '+' : '') + n;
  }

  // token reward della scheda (anteprima rosa) -> testo leggibile
  function formattaRewardToken(token) {
    var t = (token || '').trim();
    var m = t.match(/^(forza|intelligenza|velocita|carisma)\s*([+-]\d+)$/i);
    if (m) return segno(parseInt(m[2], 10)) + ' ' + STAT_LABEL[m[1].toLowerCase()];
    m = t.match(/^fel\s*([+-]\d+)$/i);
    if (m) return segno(parseInt(m[1], 10)) + ' Felicità';
    m = t.match(/^monete\s*([+-]\d+)$/i);
    if (m) return segno(parseInt(m[1], 10)) + ' monete';
    m = t.match(/^igiene\s*([+-]\d+)$/i);
    if (m) return segno(parseInt(m[1], 10)) + ' Igiene';
    m = t.match(/^ferite\s*([+-]\d+)$/i);
    if (m) return segno(parseInt(m[1], 10)) + ' Ferite';
    m = t.match(/^cibo:(.+)$/i);
    if (m) return m[1].trim() + ' (cibo)';
    m = t.match(/^arredo:(.+)$/i);
    if (m) return m[1].trim() + ' (arredo)';
    if (/^armaCasuale$/i.test(t)) return "Un'arma misteriosa";
    if (/^tutteArmi$/i.test(t)) return 'Tutte le armi';
    m = t.match(/^allenatore:(7g|perm)$/i);
    if (m) return m[1].toLowerCase() === '7g' ? 'Allenatore (7 giorni)' : 'Allenatore personale';
    m = t.match(/^perk:(\w+)$/i);
    if (m) return 'Perk ' + capitalize(m[1].toLowerCase());
    if (/^rimborsoCosto$/i.test(t)) return 'Rimborso del costo';
    return t;
  }

  // reward applicato (oggetto da missions.risolvi) -> testo leggibile
  function formattaRewardOggetto(rw) {
    if (!rw) return '';
    switch (rw.tipo) {
      case 'stat': return segno(rw.valore) + ' ' + (STAT_LABEL[rw.stat] || rw.stat);
      case 'felicita': return segno(rw.valore) + ' Felicità';
      case 'monete': return segno(rw.valore) + ' monete';
      case 'igiene': return segno(rw.valore) + ' Igiene';
      case 'ferite': return segno(rw.valore) + ' Ferite';
      case 'arredo': return rw.nome + ' (arredo)';
      case 'arma': return rw.nome + ' (arredo)';
      case 'cibo': return rw.nome + ' (in dispensa)';
      case 'tutteArmi': return 'Tutte le armi: ' + (rw.nomi || []).join(', ');
      case 'allenatore': return rw.durata === '7g' ? 'Il Topo allenatore (7 giorni)' : 'Il Topo allenatore (permanente)';
      case 'perk': return 'Perk ' + capitalize(rw.categoria) + ' sbloccato';
      case 'rimborso': return 'Rimborso: ' + rw.valore + ' monete';
      default: return rw.nome || rw.tipo || '';
    }
  }

  // cartolina esito: API grafica con guard; fallback = tinta di categoria + pet al centro
  function disegnaCartolina(canvas, scenaId, petLike) {
    if (PETQ.sprites && PETQ.sprites.drawCartolina) {
      PETQ.sprites.drawCartolina(canvas, scenaId, petLike);
      return;
    }
    var g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    var tinta = tintaScena(scenaId);
    g.fillStyle = tinta.sfondo;
    g.fillRect(0, 0, ROOM_W, ROOM_H);
    g.fillStyle = tinta.terra;
    g.fillRect(0, 46, ROOM_W, ROOM_H - 46);

    var pc = document.createElement('canvas');
    pc.width = PET_PX;
    pc.height = PET_PX;
    PETQ.sprites.draw(pc, petLike, { frame: 0 });
    g.drawImage(pc, Math.round((ROOM_W - PET_PX) / 2), 46 - PET_PX + 6);
  }

  function tintaScena(scenaId) {
    var id = scenaId || '';
    if (id.indexOf('fail') === 0) return TINTE_SCENA.fail;
    if (id.indexOf('super') === 0) return TINTE_SCENA.superSc;
    var m = id.match(/^std_(\w+)$/);
    if (m && TINTE_SCENA[m[1]]) return TINTE_SCENA[m[1]];
    return TINTE_SCENA.generica;
  }

  // ==================== DEBUG PANEL ====================

  function debugAttivo() {
    return location.search.indexOf('debug') !== -1;
  }

  function montaDebugPanel() {
    if (!debugAttivo()) return;
    var esistente = document.getElementById('petq-debug');
    if (esistente) esistente.remove();

    var panel = el('div', 'petq-debug');
    panel.id = 'petq-debug';

    var velLabel = el('span', 'petq-debug-label', 'Velocità:');
    panel.appendChild(velLabel);
    [[1, '×1'], [60, '×60'], [600, '×600']].forEach(function (v) {
      var btn = el('button', 'petq-btn petq-btn-mini', v[1]);
      btn.addEventListener('click', function () { window.PETQ.debugTime = v[0]; });
      panel.appendChild(btn);
    });

    if (currentState && currentState.pet) {
      var statKeys = [['fame', 'Fame'], ['igiene', 'Igiene'], ['salute', 'Salute'], ['felicita', 'Felicità']];
      statKeys.forEach(function (sk) {
        var btnPiu = el('button', 'petq-btn petq-btn-mini', sk[1] + ' +20');
        btnPiu.addEventListener('click', function () {
          currentState.pet.stats[sk[0]] = Math.max(0, Math.min(100, currentState.pet.stats[sk[0]] + 20));
          PETQ.save.save(currentState);
          aggiornaHud(currentState);
        });
        panel.appendChild(btnPiu);

        var btnMeno = el('button', 'petq-btn petq-btn-mini', sk[1] + ' -20');
        btnMeno.addEventListener('click', function () {
          currentState.pet.stats[sk[0]] = Math.max(0, Math.min(100, currentState.pet.stats[sk[0]] - 20));
          PETQ.save.save(currentState);
          aggiornaHud(currentState);
        });
        panel.appendChild(btnMeno);
      });
    }

    var moneteBtn = el('button', 'petq-btn petq-btn-mini', '+100 monete');
    moneteBtn.addEventListener('click', function () {
      if (currentState) {
        currentState.coins += 100;
        PETQ.save.save(currentState);
        aggiornaHud(currentState);
        renderAzioni();
      }
    });
    panel.appendChild(moneteBtn);

    var poopBtn = el('button', 'petq-btn petq-btn-mini', 'Spawn poop');
    poopBtn.addEventListener('click', function () {
      if (currentState) {
        currentState.poop = Math.min(3, (currentState.poop || 0) + 1);
        PETQ.save.save(currentState);
        disegnaStanzaEPet(currentState);
        if (document.getElementById('petq-casa')) renderAzioni();
      }
    });
    panel.appendChild(poopBtn);

    var fineMissBtn = el('button', 'petq-btn petq-btn-mini', 'Fine missione subito');
    fineMissBtn.addEventListener('click', function () {
      if (currentState && currentState.missione) {
        currentState.missione.fine = Date.now() - 1;
        PETQ.save.save(currentState);
        controllaMissioneScaduta();
      } else {
        mostraToast('Nessuna missione in corso.');
      }
    });
    panel.appendChild(fineMissBtn);

    // Debug "Nuovo giorno" (fix playtest, limite 1 missione/giorno): azzera tutti i contatori
    // giornalieri e fa scattare il dailyLogin, cosi' si puo' testare il reset senza aspettare
    // la mezzanotte reale. Il debug non puo' spostare la data REALE del sistema (oggiStr() la
    // legge da new Date()), quindi per testare il cooldown missioni (3 giorni, date assolute)
    // retrodatiamo di 1 giorno ogni voce di state.missioniFatte: dopo 3 click una missione
    // completata "oggi" risulta come completata 3 giorni fa e rientra nella rosa.
    var nuovoGiornoBtn = el('button', 'petq-btn petq-btn-mini', 'Nuovo giorno');
    nuovoGiornoBtn.addEventListener('click', function () {
      if (!currentState) return;
      currentState.missioneGiorno = null;
      currentState.trainDay = null;
      currentState.wordDay = null;
      currentState.coccoleDay = null;
      currentState.coccoleCount = 0;
      currentState.cureDay = null;
      currentState.cureOggi = 0;
      currentState.categoriePastiOggi = [];
      currentState.lastLoginDay = null;
      retrodataCooldownMissioni(currentState, 1);
      if (PETQ.care && PETQ.care.dailyLogin) PETQ.care.dailyLogin(currentState);
      PETQ.save.save(currentState);
      aggiornaHud(currentState);
      renderAzioni();
      mostraToast('Nuovo giorno simulato.');
    });
    panel.appendChild(nuovoGiornoBtn);

    // Debug "Forza nanna" (fix playtest 7a): manda a letto il pet SUBITO, a qualsiasi ora,
    // bypassando la soglia oraLetto (utile per testare il ciclo sonno senza aspettare le 21).
    var forzaNannaBtn = el('button', 'petq-btn petq-btn-mini', 'Forza nanna');
    forzaNannaBtn.addEventListener('click', function () {
      if (!currentState || !PETQ.pet) return;
      if (currentState.sonno) {
        mostraToast((currentState.pet && currentState.pet.nome || 'Il pet') + ' sta già dormendo.');
        return;
      }
      PETQ.pet.avviaSonno(currentState, true);
      PETQ.save.save(currentState);
      disegnaStanzaEPet(currentState);
      renderAzioni();
      mostraToast('A nanna, subito.');
    });
    panel.appendChild(forzaNannaBtn);

    // Debug "Salta sonno" (fix orologio di gioco, questa sessione): completa IMMEDIATAMENTE
    // il sonno in corso come se avesse dormito la sua durata massima (riposino 2h piene /
    // notturno 8h piene), utile per testare il risveglio autonomo senza aspettare l'orologio
    // di gioco anche a velocita' ×600.
    var saltaSonnoBtn = el('button', 'petq-btn petq-btn-mini', 'Salta sonno');
    saltaSonnoBtn.addEventListener('click', function () {
      if (!currentState || !PETQ.pet) return;
      if (!currentState.sonno) {
        mostraToast('Non sta dormendo.');
        return;
      }
      var risultato = PETQ.pet.debugSaltaAlMattino(currentState);
      PETQ.save.save(currentState);
      disegnaStanzaEPet(currentState);
      aggiornaHud(currentState);
      renderAzioni();
      if (risultato) mostraBalloon(PETQ.dialog.say(currentState.pet, risultato.battuta, currentState));
      mostraToast('Sonno completato.');
    });
    panel.appendChild(saltaSonnoBtn);

    // Debug "Ferite +20" (fix playtest 7c): per testare il flusso infermeria senza aspettare
    // un fallimento missione.
    var feriteBtn = el('button', 'petq-btn petq-btn-mini', 'Ferite +20');
    feriteBtn.addEventListener('click', function () {
      if (!currentState) return;
      currentState.ferite = Math.min(100, (currentState.ferite || 0) + 20);
      if (currentState.pet && PETQ.pet) PETQ.pet.recomputeSalute(currentState.pet, currentState);
      PETQ.save.save(currentState);
      aggiornaHud(currentState);
      renderAzioni();
    });
    panel.appendChild(feriteBtn);

    // Debug "Insegna parola test" (GDD "Parola imparata", punto 4): inserisce direttamente
    // "banana" in state.parole, bypassando il limite di 1 al giorno di care.teachWord, cosi'
    // si puo' verificare subito che {parola} compaia nelle battute senza aspettare il giorno
    // dopo. Non tocca wordDay: l'insegnamento "vero" del giorno resta comunque disponibile.
    var parolaTestBtn = el('button', 'petq-btn petq-btn-mini', 'Insegna parola test');
    parolaTestBtn.addEventListener('click', function () {
      if (!currentState) return;
      if (!Array.isArray(currentState.parole)) currentState.parole = [];
      if (currentState.parole.indexOf('banana') === -1) currentState.parole.push('banana');
      PETQ.save.save(currentState);
      mostraToast('Parola di test inserita: banana.');
    });
    panel.appendChild(parolaTestBtn);

    var resetBtn = el('button', 'petq-btn petq-btn-mini petq-btn-danger', 'Reset save');
    resetBtn.addEventListener('click', function () {
      PETQ.save.reset();
      location.reload();
    });
    panel.appendChild(resetBtn);

    document.body.appendChild(panel);
  }

  window.PETQ.ui = {
    boot: boot,
    render: render,
    // esposti per test di logica (stesso stile di rooms._W / sprites._getRobotFrame)
    _dentroRect: dentroRect,
    _coordLogiche: coordLogiche,
    _situazionePrioritaria: situazionePrioritaria,
    _hotzoneVasca: HOTZONE_VASCA,
    _propsAllenamento: PROPS_ALLENAMENTO,
    _formattaTempo: formattaTempo,
    _formattaRewardToken: formattaRewardToken,
    _formattaRewardOggetto: formattaRewardOggetto,
    _titoloMissione: titoloMissione,
    _tintaScena: tintaScena,
    _risolviSlotEsito: risolviSlotEsito,
    _hitPin: hitPin,
    _mappaDisponibile: mappaDisponibile,
    _statConBonus: statConBonus,
    _testoStat: testoStat,
    _nomiArrediPiazzati: nomiArrediPiazzati
  };

})();
