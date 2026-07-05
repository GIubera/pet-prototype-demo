# Missioni — prototipo (10 schede + tutorial)

Chi compila: il fondatore definisce le schede (requisiti, durata, reward, condizioni); il socio scrive i testi degli esiti (qui in versione neutra, poi le varianti per personalità). Ogni scheda ha anche una riga "Scena" per chi disegnerà gli sprite di ogni esito.

**Modello di risoluzione (pet baby, prototipo)** — niente tiro di dado, niente soglia probabilistica. Il giocatore sceglie 1 missione al giorno da una rosa di 3; quasi sempre l'esito è quello **standard** (è così che il pet cresce, punto). Fallimento e super successo sono code rare, deterministiche: scattano solo se il pet soddisfa la condizione scritta sulla scheda (di solito una personalità precisa, a volte insieme a una stat molto bassa/alta). Il fallimento non è mai un "meno secco": compensa sempre con qualcosa, possibilmente in tema con la missione. Dettagli del modello e vecchia formula probabilistica (fase adulta) in bilanciamento.md.

**Categorie, tag & perk**: ogni missione ha una categoria (Videogioco, Sociale, Combattimento, Studio, Consegne, Sport) e opzionalmente uno o più **tag** trasversali (invenzione, natura, gara) usati dai talenti e da alcuni perk. Alcuni super successi sbloccano un **perk**: un arredo che, finché è piazzato in casa, annulla il fallimento e garantisce sempre il super successo nelle missioni future della stessa categoria — o dello stesso tag, come Sabotatore sulle gare senza perk proprio.

---

## Missione 0 — Tutorial: Il negozio di giocattoli [fuori rosa, solo giorno 1, mai fallimento]
- Luogo: 📍 Negozio di Giocattoli
- Razza: entrambe
- Costo: gratis (regalo di benvenuto)
- Dati: tutorial=1 ; costo=0
- Reward: Felicità +10 + 1 oggetto collezionabile, secondo la personalità:

| Personalità | Oggetto | Bonus passivo |
|---|---|---|
| Sportivo | Pallone da calcio | +1 Forza |
| Nerd | GameBit portatile | +1 Intelligenza |
| Gentile | Microfono giocattolo | +1 Carisma |
| Maleducato | Fumetto sarcastico | +1 Intelligenza |

- Dati: cond= sportivo ; reward= fel+10, arredo:Pallone da calcio
- Dati: cond= nerd ; reward= fel+10, arredo:GameBit portatile
- Dati: cond= gentile ; reward= fel+10, arredo:Microfono giocattolo
- Dati: cond= maleducato ; reward= fel+10, arredo:Fumetto sarcastico
- Testo (slot {oggetto}): "Le saracinesche del negozio di giocattoli si alzano proprio mentre passi di lì, quasi per invito. Dentro, scaffali pieni fino al soffitto di cose che non ti servono — ma tu vai dritto verso una sola, come se ti stesse chiamando per nome: {oggetto}. Lo stringi tutto il tragitto di ritorno, e per una volta non stai calcolando se ti serve davvero. Lo vuoi, e basta."
- Scena: pet che stringe {oggetto} tra le braccia, sorriso aperto

## Missione 1: Torneo alla Sala Giochi
- Luogo: 📍 Sala Giochi "Bit & Byte"
- Razza: entrambe
- Categoria: Videogioco
- Stat coinvolta: Velocità
- Durata: 1h
- Costo: 3 monete
- Dati: durata=1h ; costo=3 ; categoria=videogioco ; stat=velocita

**Standard** — +1 Velocità, Felicità +5
Dati: reward= velocita+1, fel+5
Testo: "La sala è piena del solito ronzio di cabinati e luci lampeggianti. Ti piazzi al primo schermo libero, pollici già pronti — e macini punti come se il joystick rispondesse solo a te. Non il record storico della sala, ma abbastanza da guadagnarti un'occhiata di rispetto dal tizio dietro al banco."
Scena: pet di profilo davanti al cabinato, pollici sui pulsanti, aria concentrata

**Fallimento** (condizione: Maleducato + Velocità 0) — rimborso dei 3 monete del costo, Felicità invariata
Dati: cond= maleducato & velocita<=0 ; reward= rimborsoCosto
Testo: "Primo livello, primo game over — e nemmeno per colpa del gioco, diciamocelo. Il cabinato lampeggia la scritta più umiliante dell'alfabeto, tu rispondi con un pugno che fa più rumore che danno. Il gestore, imbarazzato dalla scenata davanti a tutti, ti scorta fuori con la mano sulla spalla: 'dai su, non è successo niente, ma non tornare per un po'.'"
Scena: pet col pugno chiuso contro lo schermo "GAME OVER", oppure scortato fuori

**Super successo** (condizione: Nerd O Velocità 3+, oppure perk Videogioco già posseduto) — Felicità +10, Coppa Arcade (arredo raro, +1 Velocità passivo; piazzata = perk Videogioco: niente fallimento e sempre super successo nelle prossime missioni Videogioco)
Dati: cond= nerd | velocita>=3 ; reward= fel+10, arredo:Coppa Arcade, perk:videogioco
Testo: "Qualcuno ha attaccato un cartello 'TORNEO LAMPO — VINCI LA COPPA' sopra il cabinato più bello della sala. Ti iscrivi per gioco, avanzi per un misto di riflessi e fortuna sfacciata, e in finale ti ritrovi mezza sala che tifa per l'avversario. Vinci comunque. Il gestore in persona ti mette in mano una coppa vera — pesante, lucida, imbarazzantemente esagerata per un torneo nato per sbaglio un martedì pomeriggio."
Scena: pet con le braccia alzate, coppa dorata sopra la testa, luci/folla sullo sfondo

## Missione 2: Festa di compleanno al parco
- Luogo: 📍 Parco delle Antenne
- Razza: entrambe
- Categoria: Sociale
- Stat coinvolta: Carisma
- Durata: 2h
- Dati: durata=2h ; costo=0 ; categoria=sociale ; stat=carisma

**Standard** — +1 Carisma, Felicità +5, Fetta di torta (cibo, Carisma+1)
Dati: reward= carisma+1, fel+5, cibo:Fetta di torta
Testo: "Il parco è pieno di palloncini e di quella musica troppo allegra che si sente da tre isolati. Ti butti tra gli invitati, chiacchieri, ridi alle battute giuste al momento giusto — e prima di sparire nella confusione qualcuno ti mette in mano una fetta, giusto una, 'il resto è per gli altri'. Giornata ben spesa comunque."
Scena: pet tra sagome di altri invitati, piatto con fetta di torta in mano, palloncini

**Fallimento** (condizione: Maleducato + Carisma 0) — niente Carisma, Torta intera (cibo, Carisma+3)
Dati: cond= maleducato & carisma<=0 ; reward= cibo:Torta intera
Testo: "Batti il record personale di comprare simpatia: zero. Una battuta di troppo, uno sguardo storto di troppo, e in cinque minuti l'intera festa ti guarda come un problema. Non ti fai troppi scrupoli: quando nessuno guarda, non ti accontenti di una fetta, ti porti via l'INTERA torta e te ne vai a muso duro, mollando la festa nel caos di chi si chiede dove sia finito il dolce."
Scena: pet a braccia conserte che scappa con la torta intera sotto il braccio, altri invitati contrariati

**Super successo** (condizione: Carisma 3+) — +1 Carisma, Felicità +10, Macchinina giocattolo (arredo, nessun bonus passivo, solo collezione)
Dati: cond= carisma>=3 ; reward= carisma+1, fel+10, arredo:Macchinina giocattolo
Testo: "Non stai nemmeno cercando di fare colpo, e proprio per questo funziona alla grande: battuta dopo battuta, diventi il motivo per cui questa festa verrà ricordata. Alla fine il festeggiato in persona ti ficca in mano il suo regalo preferito del giorno — una macchinina che luccica ancora dell'incarto — 'perché te lo meriti più di me'."
Scena: pet al centro di un capannello festante, macchinina in mano che luccica

## Missione 3: Lezioni di arti marziali
- Luogo: 📍 Dojo del Rottame
- Razza: entrambe
- Categoria: Combattimento
- Stat coinvolta: Forza
- Durata: 3h
- Costo: 5 monete
- Dati: durata=3h ; costo=5 ; categoria=combattimento ; stat=forza

**Standard** — +1 Forza, Fascia da martial artist (arredo, +1 Forza passivo)
Dati: reward= forza+1, arredo:Fascia da martial artist
Testo: "Il sensei — o quel che ne fa le veci qui dentro — ti mette in fila con gli altri allievi e parte con gli esercizi base. Suda, incassa qualche colpo, ne restituisce altrettanti: alla fine hai imparato due mosse vere e un inchino di approvazione. Piccoli passi."
Scena: pet in guardia, fila di allievi sullo sfondo

**Fallimento** (condizione: Forza 0 O Gentile) — niente Forza, −10 Salute, +1 Carisma
Dati: cond= forza<=0 | gentile ; reward= ferite+10, carisma+1
Testo: "Il primo sparring va così male che il sensei ti toglie dal tatami 'per la tua sicurezza'. Passi il resto della lezione a bordo campo, qualche livido di troppo — ma è lì che un altro allievo, silenzioso quanto te, inizia a farti due chiacchiere. Non hai imparato a combattere. Hai fatto un amico."
Scena: pet seduto a bordo tatami con un cerotto, chiacchiera con un altro allievo

**Super successo** (condizione: Maleducato O Forza 3+) — +1 Forza, Completo da martial artist (arredo, +2 Forza passivo, sostituisce la Fascia), perk Street Fighter (categoria Combattimento: niente fallimento, sempre super successo)
Dati: cond= maleducato | forza>=3 ; reward= forza+1, arredo:Completo da martial artist, perk:combattimento
Testo: "Non fai nemmeno finta di seguire la lezione base: passi dritto agli allievi avanzati e li sfidi uno per uno, giusto per vedere l'effetto che fa. L'effetto è che smettono di ridere abbastanza in fretta. Il sensei, con un misto di orrore e rispetto, ti passa il completo riservato a chi 'ha capito lo spirito del dojo'."
Scena: pet in posa vittoriosa, allievi intimoriti intorno, completo nuovo indosso

## Missione 4: Pomeriggio in biblioteca
- Luogo: 📍 Biblioteca dei Bit Perduti
- Razza: entrambe
- Categoria: Studio
- Stat coinvolta: Intelligenza
- Durata: 4h
- Dati: durata=4h ; costo=0 ; categoria=studio ; stat=intelligenza

**Standard** — +1 Intelligenza, Album da disegno (arredo, +1 Intelligenza passivo)
Dati: reward= intelligenza+1, arredo:Album da disegno
Testo: "La bibliotecaria — o il suo equivalente meccanico/organico, difficile dirlo — ti indica un tavolo vicino alla finestra e ti lascia un blocco di fogli bianchi. Passi il pomeriggio tra schizzi e appunti, la lingua tra i denti per la concentrazione. Non è un capolavoro, ma quando richiudi l'album sei sicuro di aver imparato qualcosa."
Scena: pet seduto al tavolo, album aperto, lingua fuori per la concentrazione

**Fallimento** (condizione: Maleducato) — niente Intelligenza, +1 Forza
Dati: cond= maleducato ; reward= forza+1
Testo: "Cinque minuti di silenzio bastano e avanzano: il tavolo, i fogli bianchi, il ronzio delle luci al neon — tutto troppo noioso per restarci seduto. Molli l'album a metà pagina e sgusci fuori verso il campetto dietro l'angolo, dove almeno la palla non ti guarda con aria delusa."
Scena: pet che scappa con un pallone sottobraccio, foglio a metà abbandonato sul tavolo

**Super successo** (condizione: Intelligenza 3+) — +2 Intelligenza (invece di +1), Libro (arredo, +2 Intelligenza passivo, sostituisce l'Album)
Dati: cond= intelligenza>=3 ; reward= intelligenza+2, arredo:Libro
Testo: "Il blocco di fogli bianchi resta bianco: oggi non hai voglia di disegnare, hai voglia di CAPIRE. Ti perdi tra gli scaffali e riemergi ore dopo con una pila di libri più alta di te. La bibliotecaria, colpita, ti lascia portare a casa il volume più prezioso dello scaffale."
Scena: pet che porta una pila di libri più alta di lui, un volume speciale in evidenza

## Missione 5: Consegna sotto la pioggia di scarti
- Luogo: 📍 Vicoli della Zona Industriale
- Razza: entrambe
- Categoria: Consegne
- Stat coinvolta: Velocità + Forza
- Durata: 2h
- Dati: durata=2h ; costo=0 ; categoria=consegne ; stat=velocita,forza

**Standard** — +1 Velocità, +1 Forza, +8 monete, −10 Igiene
Dati: reward= velocita+1, forza+1, monete+8, igiene-10
Testo: "La zona industriale di notte è tutta vicoli stretti, vapore dai tombini e quella pioggerella acida che nessuno sa spiegarsi da dove venga. Consegni a tempo, firma ritirata, tutto in regola — peccato per lo strato di melma che ti sei portato dietro per tutto il tragitto."
Scena: pet che corre tra vicoli stretti, pacco sottobraccio, macchie sul corpo

**Fallimento** (condizione: Forza 0 E Velocità 0, oppure Nerd con Forza≤1 E Velocità≤1) — niente XP, −15 Igiene, Ombrello meccanico (arredo collezionabile: dimezza il calo Igiene — da −10 a −5 — in tutte le missioni a rischio pioggia/sporco, mentre è piazzato)
Dati: cond= forza<=0 & velocita<=0 | nerd & forza<=1 & velocita<=1 ; reward= igiene-15, arredo:Ombrello meccanico
Testo: "Tra buche, scorciatoie sbagliate e quella pioggerella che non vuole smettere, il pacco arriva tardi e tu arrivi peggio. Fradicio e senza voglia di rifarlo mai più, ti chiudi in garage e rimedi l'unica cosa sensata: costruirti un ombrello con quello che trovi in giro. Non elegante. Funziona."
Scena: pet fradicio seduto in garage, assembla un ombrello con pezzi di scarto

**Super successo** (condizione: Forza 2+ E Velocità 2+) — +2 Velocità, +2 Forza, +15 monete, −10 Igiene (come standard), Scooter giocattolo (arredo, +1 Velocità passivo)
Dati: cond= forza>=2 & velocita>=2 ; reward= velocita+2, forza+2, monete+15, igiene-10, arredo:Scooter giocattolo
Testo: "Scatti tra i vicoli come se li conoscessi a memoria, saltando pozzanghere e schivando tubi che sbuffano vapore senza rallentare mai. Consegna record, mancia generosa, e il destinatario — sorpreso di vederti così presto E così pulito, relativamente — ti tira dietro anche uno scooter giocattolo 'per la prossima volta'."
Scena: pet che salta agilmente pozzanghere, scooter in mano

## Missione 6: Provino per lo spot in città
- Luogo: 📍 Studio di Trasmissione
- Razza: entrambe
- Categoria: Sociale
- Stat coinvolta: Carisma
- Durata: 2h
- Dati: durata=2h ; costo=0 ; categoria=sociale ; stat=carisma

**Standard** — +1 Carisma, +10 monete
Dati: reward= carisma+1, monete+10
Testo: "Il casting è un carosello di facce nuove che entrano ed escono ogni cinque minuti. Quando tocca a te, dici la battuta, fai la posa, e il regista annuisce con l'aria di chi ha visto di meglio ma non si lamenta. Sei dentro. Pagano anche bene."
Scena: pet davanti a luci da studio, regista che annuisce

**Fallimento A** (condizione: Maleducato + Carisma ≤1) — niente Carisma, Megafono (arredo, +1 Carisma passivo)
Dati: cond= maleducato & carisma<=1 ; reward= arredo:Megafono
Testo: "Il regista ti corregge una volta di troppo e decidi che il provino è finito, non prima di dirgli cosa pensi della sua regia. Non ti scritturano. Però nella foga te ne esci con il suo megafono sottobraccio."
Scena: pet che se ne va a grandi passi con un megafono, regista scandalizzato

**Fallimento B** (condizione: Intelligenza 0 O Carisma 0) — niente Carisma, +3 monete, Biscotto (cibo, Carisma+1)
Dati: cond= intelligenza<=0 | carisma<=0 ; reward= monete+3, cibo:Biscotto
Testo: "Le battute erano scritte su un foglio che, a un certo punto, hai smesso di guardare. Il regista ti ringrazia con quella cortesia che significa 'non richiameremo' — ma qualcuno dello staff, impietosito, ti infila in tasca due spiccioli e un biscotto dal buffet del catering. Meglio di niente."
Scena: pet con un biscotto in mano, espressione un po' delusa, tavolo del catering sullo sfondo

**Super successo** (condizione: Carisma 3+) — +1 Carisma, +20 monete, Statuetta tipo Oscar (arredo, +1 Carisma passivo)
Dati: cond= carisma>=3 ; reward= carisma+1, monete+20, arredo:Statuetta tipo Oscar
Testo: "Non stai nemmeno recitando, a un certo punto — sei semplicemente TU, e la cinepresa sembra amarlo. Il regista si alza in piedi a metà provino. Ti scritturano su due piedi, pagano il triplo, e qualcuno ti rifila pure una statuetta avanzata da chissà quale premiazione."
Scena: pet sotto i riflettori, regista in piedi che applaude, statuetta dorata in mano

## Missione 7: Il Mostro nelle Fogne
- Luogo: 📍 Fogne / Laboratorio Abbandonato
- Razza: entrambe
- Categoria: Combattimento
- Stat coinvolta: Forza
- Durata: 3h
- Dati: durata=3h ; costo=0 ; categoria=combattimento ; stat=forza

Le 4 armi (drop casuale nello standard, set completo nei super successi "da combattimento"): Bastone da combattimento, Sai gemelli, Nunchaku arrugginiti, Katane a farfalla — tutte arredo, +1 Forza passivo, stesso bonus, differenza solo estetica/collezione.

**Standard** — +1 Forza, −15 Salute, 1 arma casuale (delle 4)
Dati: reward= forza+1, ferite+15, armaCasuale
Testo: "Nelle fogne sotto la città si aggira qualcosa di grosso, peloso, e decisamente più incazzato del solito topo di quartiere. Lo scontro è breve ma sporco — vinci, ma non senza pagarne il prezzo sulla pelle. Tra le macerie del covo raccogli un'arma a caso e te ne vai zoppicando ma soddisfatto."
Scena: pet in posa vittoriosa ma ammaccato, un'arma in mano, sfondo fogna

**Fallimento** (condizione: Forza 1 o meno) — niente Forza, −25 Salute, +5 monete, Pesi (arredo, +1 Forza passivo), Spiedino (cibo, Forza+1)
Dati: cond= forza<=1 ; reward= ferite+25, monete+5, arredo:Pesi, cibo:Spiedino
Testo: "Il topo mutante è grosso il doppio di te e lo dimostra nei primi trenta secondi. Ti ritiri più ammaccato che mai — ma non del tutto a mani vuote: trovi qualche moneta caduta da qualche tasca sfortunata, e la palestra di quartiere ti regala un set di pesi e uno spiedino ben cotto 'per rimetterti in forze'. Letteralmente."
Scena: pet zoppicante, pesi e spiedino in mano

**Super successo — Dominio** (condizione: Forza 3+) — +2 Forza, −10 Salute, +20 monete, tutte e 4 le armi
Dati: priorita=2 ; cond= forza>=3 ; reward= forza+2, ferite+10, monete+20, tutteArmi
Testo: "Non è nemmeno una gara: lo atterri con una facilità imbarazzante e resti a guardarlo scappare nel buio. Il covo è tutto tuo — non un'arma a caso stavolta, te le porti via TUTTE."
Scena: pet trionfante con tutte le armi addosso, topo in fuga sullo sfondo

**Super successo — Intimidazione** (condizione: Forza 2+ E Maleducato) — +2 Forza, +15 monete, tutte le armi, il topo come allenatore per 7 giorni (arredo temporaneo: +1 Forza extra ad ogni allenamento Forza a casa, poi scade)
Dati: priorita=3 ; cond= forza>=2 & maleducato ; reward= forza+2, monete+15, tutteArmi, allenatore:7g
Testo: "Non serve nemmeno menare le mani: basta uno sguardo storto e il topone capisce con chi ha a che fare. Terrorizzato, molla armi e monete — e per farsi perdonare del tutto si offre pure di allenarti, per una settimana, prima di sparire di nuovo."
Scena: pet minaccioso, topo terrorizzato ai suoi piedi

**Super successo — Amicizia** (condizione: Gentile E Carisma 3+) — +1 Forza (solo XP base, niente armi/bottino), 0 Salute persa, il topo come allenatore permanente (arredo: +1 Forza extra ad ogni allenamento Forza a casa, per sempre)
Dati: priorita=1 ; cond= gentile & carisma>=3 ; reward= forza+1, allenatore:perm
Testo: "Invece di menare le mani ti siedi, letteralmente, e chiacchieri. Il topone voleva solo un po' di compagnia in quelle fogne buie — prima che tu te ne accorga vi siete promessi di allenarvi insieme ogni giorno. Niente armi, niente bottino: un allenatore vero, per sempre."
Scena: pet e topo seduti fianco a fianco, atmosfera calma, nessuna arma in vista

Priorità se un pet soddisfa più condizioni di super successo insieme: Amicizia > Dominio > Intimidazione (l'amicizia è un percorso alternativo che esclude lo scontro a prescindere dalla Forza).

## Missione 8: Gara di Pattini a Neon Avenue
- Luogo: 📍 Neon Avenue
- Razza: entrambe
- Categoria: Sport
- Stat coinvolta: Velocità
- Durata: 2h
- Dati: durata=2h ; costo=0 ; categoria=sport ; stat=velocita

**Standard** — +1 Velocità, +8 monete, Pesce alla griglia (cibo, Velocità+1)
Dati: reward= velocita+1, monete+8, cibo:Pesce alla griglia
Testo: "Il pubblico si accalca ai lati della strada mentre il semaforo lampeggia il via. Non sei il fulmine della serata, ma tieni un ritmo onesto e tagli il traguardo a testa alta, con applausi di cortesia e un premio di partecipazione che quantomeno copre i pattini a noleggio."
Scena: pet sui pattini al traguardo, pubblico ai lati

**Fallimento** (condizione: Velocità 0 O Gentile) — niente Velocità, Pattino spaiato (arredo, +1 Velocità passivo)
Dati: cond= velocita<=0 | gentile ; reward= arredo:Pattino spaiato
Testo: "Ti lanci con tutta l'educazione del mondo — il che, in una gara di pattini, equivale più o meno a stare fermo. Ti sorpassano tutti, con gentilezza reciproca da entrambe le parti. Sul ciglio della pista trovi però un pattino singolo perso da qualcun altro: abbastanza buono da tenertelo."
Scena: pet sorpassato da tutti, raccoglie un pattino sul bordo pista

**Super successo** (condizione: Velocità 3+ O Sportivo) — +2 Velocità, +20 monete, Pattini da gara (arredo, +2 Velocità passivo), perk Sport (categoria Sport: niente fallimento, sempre super successo)
Dati: cond= velocita>=3 | sportivo ; reward= velocita+2, monete+20, arredo:Pattini da gara, perk:sport
Testo: "Non stai nemmeno pattinando, a un certo punto — stai volando basso. Tagli il traguardo con un margine imbarazzante, e lo sponsor della gara ti regala un paio di pattini professionali dritti dalla vetrina."
Scena: pet che taglia il traguardo con largo margine, pattini scintillanti

## Missione 9: Fiera della Scienza del Quartiere
- Luogo: 📍 Fiera della Scienza del Quartiere
- Razza: entrambe
- Categoria: Studio
- Stat coinvolta: Intelligenza
- Tag: invenzione
- Durata: 4h
- Costo: 5 monete
- Dati: durata=4h ; costo=5 ; categoria=studio ; stat=int ; tag=invenzione

**Standard** — +2 Int, +8 monete
Dati: reward= int+2, monete+8
Testo: "La Fiera della Scienza è un tripudio di cartelloni traballanti, esperimenti che fumano e ronzii sospetti. Presenti la tua invenzione a una giuria di quattro sapientoni con gli occhiali spessi: annuiscono, prendono appunti, uno ti fa pure una domanda difficile a cui rispondi al volo. Non vinci, ma esci con la testa più piena di quando sei entrato."
Scena: pet davanti a un cartellone-esperimento, giuria di profilo che prende appunti

**Fallimento** (condizione: Sportivo) — niente Int, Zuppa di verdure (cibo, Int+2)
Dati: priorita=1 ; cond= sportivo ; reward= cibo:Zuppa di verdure
Testo: "Cinque minuti tra formule e circuiti e già ti fischiano le orecchie: troppa roba da secchioni per i tuoi gusti. Ti defili verso il tavolo del rinfresco, dove almeno c'è della zuppa calda, e passi il resto della fiera a fare canestro con le palline di carta. Della scienza, oggi, non ti è entrato niente. Della zuppa sì."
Scena: pet annoiato che si allontana dai cartelloni con una scodella di zuppa in mano

**Fallimento** (condizione: Intelligenza ≤1) — +6 monete, +1 Int
Dati: priorita=2 ; cond= int<=1 ; reward= monete+6, int+1
Testo: "La tua invenzione, diciamo, aveva del potenziale. Peccato che a metà presentazione abbia iniziato a sfrigolare, poi a fumare, poi a spegnersi con un triste 'plop'. La giuria applaude per gentilezza e ti rimborsa le spese 'per l'impegno'. Qualcosa hai imparato, se non altro come NON si fa."
Scena: pet imbarazzato accanto a un aggeggio che sputa fumo

**Super successo** (condizione: Intelligenza 3+, o auto col talento Inventore via tag invenzione) — +3 Int, +15 monete, Coppa della Fiera (arredo raro, +1 Int passivo + perk Studio "Doc Brown": missioni Studio → niente fallimento e sempre super successo)
Dati: cond= int>=3 ; reward= int+3, monete+15, arredo:Coppa della Fiera, perk:studio
Testo: "Non stai presentando un'invenzione — stai presentando IL FUTURO, e la giuria lo capisce entro trenta secondi. Occhiali che si abbassano, appunti frenetici, applausi che partono da soli. Ti consegnano la Coppa della Fiera davanti a tutti, e uno dei giudici ti stringe la mano un po' troppo a lungo: 'ricordati di me quando sarai famoso'."
Scena: pet che alza la Coppa della Fiera, giuria in piedi che applaude

## Missione 10: Sfida Robotica
- Luogo: 📍 Arena della Sfida Robotica
- Razza: entrambe
- Categoria: Studio
- Stat coinvolta: Intelligenza
- Tag: invenzione, gara
- Durata: 2h
- Costo: 3 monete
- Dati: durata=2h ; costo=3 ; categoria=studio ; stat=int ; tag=invenzione,gara

**Standard** — +1 Int, Coppa Robot Wars (arredo, +1 Int passivo)
Dati: reward= int+1, arredo:Coppa Robot Wars
Testo: "L'arena della Sfida Robotica è un quadrato di lamiera ammaccata dove piccoli robot fatti in casa si prendono a testate tra scintille e tifo isterico. Il tuo se la cava: qualche colpo dato, qualche ammaccatura presa, e un onorevole piazzamento a metà classifica. Ti porti a casa una coppa e un bel po' di nozioni su motori e ingranaggi."
Scena: pet a bordo arena con un piccolo robot telecomandato, scintille

**Fallimento** (condizione: Gentile) — niente Int, +1 Carisma, Insalatona (cibo, Int+1)
Dati: priorita=1 ; cond= gentile ; reward= carisma+1, cibo:Insalatona
Testo: "Arrivi in arena, guardi quei robottini che si prenderanno a mazzate... e proprio non te la senti. Sono troppo carini per finire a pezzi. Molli la gara, ti siedi coi tuoi 'avversari' a parlare di come li avete costruiti, e alla fine avete più amici che ammaccature. Non hai imparato a combattere, ma neanche volevi."
Scena: pet seduto in cerchio con altri concorrenti e i loro robottini, atmosfera amichevole

**Fallimento** (condizione: Intelligenza ≤1) — niente Int, Zuppa di verdure (cibo, Int+2)
Dati: priorita=2 ; cond= int<=1 ; reward= cibo:Zuppa di verdure
Testo: "Il tuo robot dura esattamente un round: parte storto, gira in tondo, poi si ferma di colpo come se ci avesse ripensato. Gli altri partecipanti, più che deriderti, ti guardano con pena e ti allungano una scodella di zuppa 'dai, la prossima va meglio'. Almeno mangi."
Scena: pet accanto al suo robottino fermo e fumante, un altro concorrente gli porge del cibo

**Super successo — Sabotaggio** (condizione: Maleducato + Intelligenza 2+) — +2 Int, Telecomando Pirata (arredo, +1 Velocità passivo + perk Sabotatore: nelle gare senza perk proprio → sempre super successo)
Dati: priorita=1 ; cond= maleducato & int>=2 ; reward= int+2, arredo:Telecomando Pirata, perk:sabotatore
Testo: "Mentre gli altri si concentrano sui loro robot, tu ti concentri su UN telecomando 'preso in prestito'. Due ritocchi ai loro ricevitori e all'improvviso i robottini avversari impazziscono, si girano contro i loro stessi padroni, si autodistruggono in un valzer di scintille. Vinci per abbandono. Nessuno ha capito niente, e tu tieni il telecomando."
Scena: pet con un ghigno che smanetta un telecomando, robot avversari in tilt sullo sfondo

**Super successo — Mecha-Bot** (condizione: Intelligenza 3+) — +2 Int, Mecha-Bot (arredo raro, +2 Forza passivo)
Dati: priorita=2 ; cond= int>=3 ; reward= int+2, arredo:Mecha-Bot
Testo: "Gli altri hanno portato robottini. Tu hai portato un MOSTRO. Il tuo Mecha-Bot spazza l'arena in tre mosse, e mentre gli avversari raccolgono i pezzi dei loro tu resti in piedi con le braccia incrociate. Te lo porti a casa — non è più un giocattolo, è un piccolo bestione da guerra che d'ora in poi ti rende più temibile."
Scena: pet trionfante accanto a un robot grosso e minaccioso, rottami intorno

Priorità super M10: Sabotaggio (Maleducato) prima di Mecha-Bot (generico Int 3+). Come per M7, il super batte sempre il fallimento: un Gentile con Int 3+ va in Mecha-Bot, non nel fallimento "fa amicizia".

---

## Backlog — concetti sviluppati ma non scelti (da riprendere in una sessione futura)

### Il Controllore Ti Ha Visto
- Luogo: 📍 Mercato Coperto · Categoria: Marachelle · Stat: Velocità · Durata: 1h
- Standard: +1 Velocità, +5 monete, Sushi (cibo, Velocità+2) — "Un assaggio gratis da un banco del mercato, giusto per curiosità — e il controllore di zona non la prende bene. Scatti tra la folla, giri due angoli a caso, e quando ti volti lui non c'è più. Adrenalina a mille, bottino intascato, nessun rimorso."
- Fallimento (Velocità 0 O Nerd): niente Velocità, −5 monete, Scarpe da corsa consumate (arredo, +1 Velocità passivo) — "Ti blocchi a leggere il cartello dei prezzi invece di scappare, e il controllore ti raggiunge senza nemmeno correre. Multa salata — ma il vecchio dietro al banco ti allunga comunque un paio di scarpe dimenticate lì: 'la prossima volta usale prima di leggere'."
- Super successo (Velocità 3+ O Maleducato): +2 Velocità, +15 monete, Scarpe da corsa professionali (arredo, +2 Velocità passivo) — "Non solo scappi — lo fai passando esattamente sotto il naso del controllore, con un ghigno che dice tutto. Nella confusione racimoli pure il doppio del bottino."

### Grand Prix di Città Bassa
- Luogo: 📍 Circuito Metropolitano · Categoria: Sport · Stat: Velocità · Durata: 3h
- Standard: +1 Velocità, +10 monete, Pesce alla griglia (cibo, Velocità+1) — "Bandiera a scacchi, motori ruggenti, tribune piene. Non lotti per il podio, ma chiudi a metà classifica con onore."
- Fallimento (Velocità 0 O Nerd): niente Velocità, Casco da corsa (arredo, +1 Velocità passivo) — "Passi l'intera gara a calcolare la traiettoria perfetta invece di correre. Ultimo posto, ma un casco di consolazione 'per la prossima volta'."
- Super successo (Velocità 3+ O Sportivo): +2 Velocità, +25 monete, Coppa Grand Prix (arredo, +2 Velocità passivo), perk Sport — "Prendi il comando al primo giro e non lo molli più. Podio, coppa vera, sponsor già in coda."

---

## Linee guida di progetto (dal GDD, verificate su queste 10 schede)
- 1-2 stat RPG coinvolte per missione; tutte e 4 servono: Velocità (M1, M5, M8), Carisma (M2, M6), Forza (M3, M5, M7), Intelligenza (M4, M9, M10) ✓
- Durate tra 1 e 6 ore reali, con una corta ~1h (M1) ✓
- Reward misti: monete, cibo, arredi, XP stat — mai solo monete ✓
- Rischio igiene (M5) e salute (M3, M7) per far girare la loop di cura ✓
- Rosa di 3 missioni/giorno su 10+ disponibili + tutorial fuori rosa: varietà per i giorni baby con rotazione e cooldown 3 giorni ✓
