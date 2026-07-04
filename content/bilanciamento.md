# Bilanciamento — v1 (post-sessione missioni)

Il codice legge QUESTO file: cambiare un numero qui cambia il gioco. Le sezioni marcate PROPOSTA sono in attesa di conferma del fondatore.

## Decadimento stat benessere (per ora di gioco attivo; di notte in pausa)

| Stat | Calo/ora | Note |
|---|---|---|
| Fame | −6 | ~2 pasti al giorno per stare sopra 50 |
| Igiene | −3 | −15 extra se ci sono bisogni non puliti |
| Felicità | −2 | −5/ora se Fame o Igiene sotto 25; raddoppia se Salute < 25 |
| Salute | v. sezione Sistema Salute | non decade da sola: è 100 − Ferite − Malus condizioni |

## Soglie

| Cosa | Valore |
|---|---|
| Stat "critica" (sprite triste, notifiche) | < 25 |
| Variante magra | media Fame ultimi 2 giorni < 30 |
| Variante ciccione | >5 pasti/giorno per 2 giorni o >3 dolci/giorno |
| Overlay sporco | Igiene < 30 |
| Malus missione da Salute | Salute < 40 → sprite sofferente + avviso prima di partire in missione |

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
| 2+ bisogni non puliti in casa | +10 |
| Dieta squilibrata (2 giorni con una sola categoria, o solo dolci) | +10 |
| Cap totale malus | 50 |

### Effetti della Salute
| Soglia | Cosa succede |
|---|---|
| < 40 | sprite sofferente, avviso in partenza missione |
| < 25 | Felicità decade al doppio |
| = 0 prolungata (24 ore reali) | fase valigia (SOLO da teen in poi; il baby resta malaticcio e triste, mai valigia) |

Nota di design: le missioni non sono mai bloccate dalla Salute bassa (filosofia casual) — il gioco avvisa, non vieta.

## Missioni — pet baby (prototipo)

Niente tiro di dado. Il giocatore sceglie 1 missione al giorno da una rosa di 4 (su 8 schede, estrazione del giorno con copertura di almeno 3 stat diverse; il tutorial M0 è fuori rosa, solo giorno 1). Tre esiti deterministici:

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

**Perk per categoria** — arredo piazzato = niente fallimento e sempre super successo nella sua categoria. Effetto booleano. **I perk esistono SOLO nelle missioni che li assegnano** (decisione fondatore: se ogni categoria ne avesse uno non sarebbero speciali). Nel prototipo sono tre:

| Categoria | Nome perk | Da dove viene |
|---|---|---|
| Videogioco | Player One | M1, Coppa Arcade |
| Combattimento | Street Fighter | M3, Completo da martial artist |
| Sport | Tony Hawk | M8, Pattini da gara |

Sociale, Studio e Consegne non hanno perk. (Nota release EN: nomi-citazione da rivalutare — parodia o storpiatura, es. "Street Brawler".)

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
| Insegna parola | max 1 al giorno, +5 Felicità |

## Stat iniziali alla generazione

| Cosa | Valore |
|---|---|
| Benessere | tutte a 70 |
| RPG | 0 punti base + casuale 0-3 per stat, poi +1 alla stat "firma" della personalità |
| Stat firma | gentile→Carisma, maleducato→Intelligenza, nerd→Intelligenza, sportivo→Forza — nerd e maleducato differenziati via item del tutorial (GameBit vs Fumetto sarcastico) |

## Scene missione (decisione fondatore)

Cartoline pixel art (stile rect-composition + sprite, come le stanze): **generiche** per standard e fallimento (una per categoria/tono), **dedicate** per ogni super successo (~10). Nell'app si arricchiscono fino alla copertura completa. Le righe "Scena" nelle schede sono il brief.

## Archivio — modello probabilistico (fase adulta/app, NON usato nel prototipo)

| Parametro | Valore |
|---|---|
| Probabilità base (requisiti esattamente soddisfatti) | 55% |
| Bonus per punto stat sopra la soglia principale | +2% (cap totale 90%) |
| Malus per punto sotto la soglia | −3% |
| Esito parziale | se il tiro manca il successo di ≤15 punti |
