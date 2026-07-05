# Bilanciamento — v1 (post-sessione missioni)

Il codice legge QUESTO file: cambiare un numero qui cambia il gioco. Le sezioni marcate PROPOSTA sono in attesa di conferma del fondatore.

## Decadimento stat benessere (per ora di gioco attivo; di notte in pausa)

| Stat | Calo/ora | Note |
|---|---|---|
| Fame | −6 | ~2 pasti al giorno per stare sopra 50 |
| Igiene | −8 | −15 extra se ci sono bisogni non puliti; con −8/ora servono ~2 lavaggi al giorno |
| Felicità | −2 | −5/ora se Fame o Igiene sotto 25; raddoppia se Salute < 25 |
| Salute | v. sezione Sistema Salute | non decade da sola: è 100 − Ferite − Malus condizioni |

Ritmo cura target (playtest v2, 4 lug 2026, su ~14 ore attive): **2 pasti, almeno 2 lavaggi, almeno 3 pulizie bisogni al giorno**. Bisogni legati alla digestione: 60-90 minuti di gioco dopo OGNI pasto lo spawn è quasi garantito (p 0.9), più un baseline casuale ridotto (0.05/ora). I numeri della digestione vivono nel codice (pet.js applyDecay / care.js feed), qui la regola.

## Evoluzione (PROTOTIPO 2, punto 1 — design vincolante da PROTOTIPO-2.md)

| Cosa | Valore |
|---|---|
| Baby → Teen | 5 giorni DI GIOCO (pet.giorniVita, avanza a ogni "nuovo giorno": login reale o debug "Nuovo giorno") |
| Teen → Adulto | P3, NON in questo prototipo (10 giorni, da GDD — non implementato) |
| Effetto sulle statistiche | NESSUNO per ora — solo stadio + aspetto (bodyVariant vede 'teen') + battuta pool `evoluzione`. TODO commentato in pet.js `controllaEvoluzione`: il fondatore deciderà se aggiungere un bonus (es. +1 RPG) |

## Soglie

| Cosa | Valore |
|---|---|
| Stat "critica" (sprite triste, notifiche) | < 25 |
| Variante magra | media Fame ultimi 2 giorni < 30 |
| Overlay sporco | Igiene < 30 |
| Malus missione da Salute | Salute < 40 → sprite sofferente + avviso prima di partire in missione |
| Soglia sovralimentazione | Fame ≥ 90 al momento del pasto (solo teen+: dare da mangiare con la pancia già piena fa ingrassare e +10 Ferite; il baby non ne risente) |

### Variante ciccione — soglie PER STADIO (PROTOTIPO 2, punto 1)

La variante esiste negli sprite da prima ma non appariva mai in P1 (regola "mai baby", e il pet era sempre baby). Col teen diventa raggiungibile: decisione fondatore, **difficile da teen**, **più facile da adulto** (P3, soglie ancora da tarare quando arriva lo stadio — struttura già pronta in codice, `pet.js` `SOGLIE_CICCIONE_PER_STADIO`).

| Stadio | Soglia (basta UNA condizione, come prima) |
|---|---|
| Baby | mai ciccione (nessuna soglia — il cucciolo non ingrassa così, GDD "Aspetto dinamico") |
| Teen | >8 pasti/giorno **o** >6 dolci/giorno **o** ≥4 sovralimentazioni recenti cumulative (era >5 pasti/>3 dolci/≥2 sovralimentazioni nel valore unico pre-evoluzione: alzate apposta per renderlo difficile da teen) |
| Adulto (P3) | da tarare — soglia più bassa delle altre, così l'eccesso da adulto è più facile che da teen |

## Sistema Salute (v1 — sostituisce la vecchia media pesata)

**Salute = 100 − Ferite − Malus condizioni** (limitata 0–100).

### Ferite (0–100) — i danni degli eventi
- Salgono SOLO da eventi espliciti: i danni Salute scritti nelle schede missione diventano Ferite (es. M7 standard: +15 Ferite; M7 fallimento: +25; M3 fallimento: +10)
- Guarigione naturale: −5 Ferite al giorno (applicata al risveglio/primo accesso del giorno)
- **Infermeria** (in bagno): azione "Cura" — costo 15 monete, −30 Ferite, max 2 cure al giorno. Con Ferite = 0 il bottone è disattivato ("sta benone"). Scenetta di cura (kit medico nel lab / capsula rigenerante nella ship)

### Malus condizioni — lo stato di vita (ricalcolato live, sparisce curando la causa)
| Causa | Malus |
|---|---|
| Fame < 25 da più di 6 ore di gioco | +15 |
| Igiene < 25 da più di 6 ore di gioco | +15 |
| Energia < 25 da più di 6 ore di gioco | +15 |
| 2+ bisogni non puliti in casa | +10 |
| Dieta squilibrata (2 giorni con una sola categoria, o solo dolci) | +10 |
| Cap totale malus | 50 |

Nota (punto 8, aggiunta fondatore): lo sfinimento prolungato ammala il pet come fame/igiene basse — stesso tracking "sotto soglia da quando 6h+"; una dormita che riporta l'Energia sopra soglia azzera il tracking e il malus sparisce da solo.

### Effetti della Salute
| Soglia | Cosa succede |
|---|---|
| < 40 | sprite sofferente, avviso in partenza missione |
| < 25 | Felicità decade al doppio |
| = 0 prolungata (24 ore reali) | fase valigia (SOLO da teen in poi; il baby resta malaticcio e triste, mai valigia) |

Nota di design: le missioni non sono mai bloccate dalla Salute bassa (filosofia casual) — il gioco avvisa, non vieta.

## Missioni — pet baby (prototipo)

Niente tiro di dado. Il giocatore sceglie 1 missione al giorno da una rosa di 3 (su 10+ schede, in crescita nel P2, estrazione del giorno con copertura di almeno 3 stat diverse; il tutorial M0 è fuori rosa, solo giorno 1). Tre esiti deterministici:

| Esito | Frequenza | Come scatta |
|---|---|---|
| Standard | quasi sempre | default |
| Fallimento | raro | condizione sulla scheda (di solito personalità E stat molto bassa) |
| Super successo | raro | condizione sulla scheda (personalità O stat 3+) |

**Regole di precedenza (globali):**
1. Il super successo batte SEMPRE il fallimento (se un pet soddisfa entrambi, è super)
2. Tra più fallimenti (es. M6 A/B): vince il più specifico (A prima di B)
3. Tra più super (M7): Amicizia > Dominio > Intimidazione
4. Con perk di categoria attivo: super successo garantito — quello "generico" della scheda (per M7: Dominio), salvo condizioni di un super specifico soddisfatte
5. Le stat nelle condizioni = stat base + bonus passivi degli arredi PIAZZATI (v. cap sotto)

**Regola fissa**: il fallimento compensa sempre con qualcosa, in tema con la missione. Mai un "meno secco".

**Cooldown missioni** (playtest 4 lug 2026): una missione completata è esclusa dalla rosa per **3 giorni** (traccia data ultima esecuzione per id). Se le missioni disponibili scendono sotto la dimensione della rosa, si riammettono le completate più vecchie fino a riempirla — la rosa non è mai vuota. Numero tarabile.

**Perk per categoria** — arredo piazzato = niente fallimento e sempre super successo nella sua categoria (o tag). Effetto booleano. **I perk esistono SOLO nelle missioni che li assegnano** (decisione fondatore: se ogni categoria ne avesse uno non sarebbero speciali). Nel prototipo (P2):

| Categoria / tag | Nome perk | Da dove viene |
|---|---|---|
| Videogioco | Player One | M1, Coppa Arcade |
| Combattimento | Street Fighter | M3, Completo da martial artist |
| Sport | Tony Hawk | M8, Pattini da gara |
| Studio | Doc Brown | M9, Coppa della Fiera |
| tag `gara` | Sabotatore | M10, Telecomando Pirata — vale su TUTTE le missioni tag `gara` (overlap con Player One/Street Fighter/Tony Hawk innocuo, decisione fondatore 5 lug) |
| tag `inseguimento` | Parkour Master | M15, Scarpe da Parkour |
| passivo (verdure→Forza) | Popeye / Braccio di Ferro | M13, Trofeo d'Oro — NON è un vinci-categoria: mangiando verdure il pet prende anche +1 Forza. In IT il perk si chiama "Braccio di Ferro" |

Sociale e Consegne non hanno ancora perk. (Nota release EN: nomi-citazione da rivalutare — parodia o storpiatura, es. "Street Brawler".)

**Token DSL nuovi (batch missioni P2 baby M13-M16, da agganciare nel motore):** `tag=` sulle schede (usato da talenti e dai perk `gara`/`inseguimento`, oltre a `natura`/`invenzione`); `talento:X` nelle condizioni (la cond controlla se il pet HA un talento — es. Inventore/Energico/Idrofobico/Amante della Natura, non solo personalità+stat); `energiaMissione=0` (missione a costo energia nullo, es. montacarichi Nerd-Inventore); perk **passivo** (Popeye, non un vinci-categoria); **cibo multi-porzione** (Arrosto = 3 fette, v. cibi.md); **categoria nuova** `lavoretti`.

## Arredi e bonus passivi (PROPOSTA)

| Cosa | Valore |
|---|---|
| Slot arredo per stanza | 3 (cap naturale ai passivi) |
| Contano solo gli arredi PIAZZATI | sì (possederli non basta) |
| Cap contributo passivi per singola stat nelle condizioni missione | +2 |
| Vendita doppione | 50% del valore |

## Pacing stat RPG (PROPOSTA — evita che le soglie 3+ diventino banali)

| Cosa | Valore |
|---|---|
| Bonus stat del cibo | scatta solo per il PRIMO pasto del giorno di quella categoria (la dieta varia premia, lo spam no) |
| Allenamento | +1 alla stat scelta, 1/giorno |
| Missione standard | +1 (super: +2) |
| Crescita attesa | stat focalizzata a 3+ tra il giorno 2 e il 3 |
| Pasti al giorno | da tarare in playtest (punto delicato segnalato dal fondatore): col decadimento attuale ~2 pasti/giorno; se il ritmo pasti cambia, rivedere la regola del primo-pasto-per-categoria |

## Economia (v1)

| Cosa | Valore |
|---|---|
| Login giornaliero | 10 monete |
| Monete iniziali | 50 |
| Paghetta di ritorno missione | +5 monete fisse a ogni missione, in aggiunta ai reward della scheda (PROPOSTA: copre il rosso quotidiano) |
| Mancia post-missione | 1 moneta ogni 5 punti di Carisma |
| Costo pasto medio | ~8-12 monete (v. cibi.md) |
| Bilancio giornaliero atteso | entrate ~20-25 (login 10 + paghetta 5 + reward media 6 + mancia) · uscite ~18-25 (2 pasti ~16 + costi missione ~2 + infermeria ammortizzata ~7 nei giorni di combattimento) → circa pari, con le missioni-monete (M6) come giornate di guadagno |

## Allenamento (momento interazione)

| Cosa | Valore |
|---|---|
| Sessioni al giorno | 1 |
| Effetto | +1 alla stat scelta, +5 Felicità |
| Durata allenamento | 90 minuti di GIOCO come ATTIVITÀ A TEMPO (decisione fondatore 4 lug 2026): non è un'azione istantanea né un salto d'orologio secco — il pet si allena con un countdown, è "occupato" (niente coccole/pappa/altra missione finché non finisce), esattamente come una missione ma a casa. La stat/felicità/energia si applicano SOLO al completamento. Proposta 90 min, da tarare |
| Insegna parola | max 1 al giorno, +5 Felicità |
| Frequenza uso parola imparata nelle battute contestuali | 30% (alzata da 20% — il fondatore non la vedeva mai) |

## Stat iniziali alla generazione

| Cosa | Valore |
|---|---|
| Benessere | tutte a 70 |
| RPG | budget di 3 punti base assegnati a caso una alla volta (impilabili sulla stessa stat), poi bonus di 1 alla stat "firma" |
| Stat firma | gentile→Carisma, maleducato→**Velocità**, nerd→Intelligenza, sportivo→Forza (decisione fondatore 5 lug 2026: maleducato era Intelligenza, spostato a Velocità per differenziarlo dal nerd) |

Nota per il parser (content.js parseBilanciamento): la riga "RPG" sopra deve contenere ESATTAMENTE due numeri — il primo è il budget, il secondo (ultimo) è il bonus firma. Totale iniziale = budget + firma (oggi 3+1=4). Se si aggiungono altri numeri a quella riga, il parser li legge male: tenerla pulita.

## Energia e sonno

Quinta stat di benessere (v. GDD "Energia e sonno", decisione fondatore 4 lug 2026). Numeri v1 di Claude, da tarare.

| Cosa | Valore |
|---|---|
| Decadimento Energia (per ora di gioco attivo) | −2 |
| Costo missione | −8 per ora di durata |
| Costo allenamento | −10 |
| Soglia rifiuto (missioni e allenamento) | < 20 |
| Ora del letto (da qui inizia il sonno notturno) | 21 |
| Ora del crollo automatico (se sveglio e non a letto) | 23 |
| Riposino (prima delle 21) — durata max | 2 ore di gioco |
| Riposino — durata minima prima di poter svegliare | 1 ora di gioco |
| Recupero riposino | +15 Energia per ora dormita (2h piene = +30) |
| Sonno notturno (dalle 21) — durata max / sveglia autonoma | 8 ore di gioco |
| Sonno notturno — durata minima prima di poter svegliare | 5 ore di gioco |
| Energia al risveglio notturno (≥5h, riposo pieno) | 100 |
| Energia al risveglio notturno (crollato alle 23) | 70 |
| Energia al risveglio (crollato/dormito male) | 70 |

Note di design: sotto la soglia rifiuto, oltre a bloccare missioni/allenamento, la Felicità cala più in fretta (stessa regola delle altre stat critiche). Se il giocatore sveglia il pet prima delle 6 ore, l'Energia torna proporzionale alle ore dormite (min 30) invece del valore pieno: è una scelta del giocatore, non una punizione fissa.

## Scene missione (decisione fondatore)

Cartoline pixel art (stile rect-composition + sprite, come le stanze): **generiche** per standard e fallimento (una per categoria/tono), **dedicate** per ogni super successo (~10). Nell'app si arricchiscono fino alla copertura completa. Le righe "Scena" nelle schede sono il brief.

## Archivio — modello probabilistico (fase adulta/app, NON usato nel prototipo)

| Parametro | Valore |
|---|---|
| Probabilità base (requisiti esattamente soddisfatti) | 55% |
| Bonus per punto stat sopra la soglia principale | +2% (cap totale 90%) |
| Malus per punto sotto la soglia | −3% |
| Esito parziale | se il tiro manca il successo di ≤15 punti |
