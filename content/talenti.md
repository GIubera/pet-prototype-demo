# Talenti — perk di personalità/evoluzione (P2, Blocco 9)

Sistema NUOVO e distinto dai **perk di categoria** (Player One/Street Fighter/Tony Hawk, che vengono dagli arredi e valgono sulle missioni). I **talenti** definiscono la BUILD del pet: due pet della stessa personalità devono poter giocare diversi.

## Come funziona

- Ogni personalità ha una **terna per stadio**: 3 talenti tra cui se ne estrae **1**.
  - **Nascita**: estrai 1 dalla terna Nascita.
  - **Evoluzione baby→teen**: estrai 1 dalla terna Teen.
- **Cumulativi**: i talenti presi restano tutti attivi insieme (un teen ne ha 2 attivi).
- **Estrazione 45 / 45 / 10**: i due talenti ⚪ normali hanno il 45% ciascuno, il 🟡 raro il 10% (sapore "shiny"). I rari sono volutamente più forti.
- **Niente terna Adulto in P2** (l'evoluzione del prototipo è solo baby→teen; le terne adulto si aggiungono quando arriva lo stadio adulto — v. "Come estendere").
- I talenti possono toccare le missioni (bonus monete, durata, stat) ma **non** copiano il booleano "niente fallimento + sempre super" dei perk-categoria — TRANNE i due talenti a tag tematico qui sotto (Amante della Natura, Inventore), che lo concedono su un TAG di missione (natura/invenzione), non su una categoria. Seguono la stessa precedenza dei perk (super batte fallimento) già scritta in bilanciamento.md.

## Legenda colonna `Dati` (brief per il parser P2)

Convenzioni allineate al DSL di missioni.md. Token separati da ` ; `. I nomi finali si fissano in implementazione, come per le missioni.
- Stat/risorse: `forza+1`, `velocita+2`, `int+1`, `carisma+1`, `fel+3`, `energia+5`, `monete+5`, `ferite-10`
- `passivo=` bonus permanente a una stat · `bonus_cibo=` · `bonus_allenamento=` · `bonus_missione=` (per categoria) · `ogni_missione=` (qualsiasi)
- `perk_tag=` booleano no-fallimento + super garantito sulle missioni con quel tag
- `blocca_cibo=` / `blocca_categoria=` restrizioni · `x0.5`/`x1.5`/`x2`/`x3` moltiplicatori · `se <cond>:` condizione

---

## Sportivo — firma Forza

### Nascita (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Fissato con la Dieta | ⚪ normale | Non tocca i dolci; +1 stat extra da ogni cibo salutare (carne/verdura/pesce). | `blocca_cibo=dolce ; bonus_cibo=salutare:+1stat` |
| Energico | ⚪ normale | Decay Energia dimezzato (−2→−1/h) e l'allenamento DÀ +5 Energia invece di toglierne 10. | `energia_decay=x0.5 ; allenamento_energia=+5` |
| Predestinato | 🟡 raro | Può allenarsi 2 volte al giorno (due attività separate): crescita RPG doppia. | `allenamenti_giorno=2` |

### Teen (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Braccia di Ferro | ⚪ normale | I cibi carne danno +1 extra Forza e l'allenamento Forza dà +1 extra. | `bonus_cibo=carne:forza+1 ; bonus_allenamento=forza:+1` |
| Spirito Agonistico | ⚪ normale | Vede tutto come una gara: +1 Forza extra da ogni missione completata. | `ogni_missione=forza+1` |
| Fisico Bestiale | 🟡 raro | +2 Forza passivo permanente, mai rifiuto per Energia bassa, allenamento a metà tempo (45 min). | `passivo=forza+2 ; ignora_rifiuto_energia ; allenamento_durata=x0.5` |

---

## Gentile — firma Carisma

### Nascita (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Amante della Natura | ⚪ normale | Missioni a tag natura/animali: niente fallimento + super garantito; +1 stat extra dai cibi vegani (verdura). | `perk_tag=natura ; bonus_cibo=verdura:+1stat` |
| Pacifista | ⚪ normale | Non può fare missioni Combattimento (escluse dalla rosa); +1 Carisma extra nelle missioni Sociale. | `blocca_categoria=combattimento ; bonus_missione=sociale:carisma+1` |
| Cuore Magnetico | 🟡 raro | Mance post-missione ×3, login giornaliero +10 monete e +5 monete extra da ogni missione. | `mancia=x3 ; login=monete+10 ; ogni_missione=monete+5` |

### Teen (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Coccolone | ⚪ normale | Cap coccole giornaliere 5→8 e ogni coccola dà +3 Felicità in più. | `cap_coccole=8 ; coccola=fel+3` |
| Infermiere Provetto | ⚪ normale | Infermeria costa −5 e cura +10 Ferite in più (−30→−40); 1 auto-cura −10 Ferite a ogni risveglio. | `infermeria_costo=-5 ; infermeria_cura=+10 ; risveglio=ferite-10` |
| Anima Candida | 🟡 raro | Non perde MAI Salute dai malus condizioni e ogni notte azzera le Ferite (gli resta solo la via Felicità per la valigia). | `immune_malus_condizioni ; notte=ferite=0` |

---

## Nerd — firma Intelligenza

### Nascita (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Idrofobico | ⚪ normale | Relazione Igiene↔Felicità invertita (più sporco = più felice); con Igiene <50 → +2 Int passivo. Il malus Salute da sporco resta (è il contrappeso). | `igiene_felicita=inverti ; se igiene<50: passivo=int+2 ; nota=malus_salute_sporco_resta` |
| Sete di Sapere | ⚪ normale | +1 allenamento Intelligenza gratis al giorno (azione extra istantanea, non brucia il turno di allenamento normale). | `allenamento_extra=int (istantaneo, 1/giorno)` |
| Inventore | 🟡 raro | 1 volta a settimana salta l'allenamento e inventa 1 oggetto casuale (Pool Inventore sotto); super garantito nelle missioni a tag invenzione. | `invenzione=1/settimana (pool_inventore) ; perk_tag=invenzione` |

### Teen (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Topo di Biblioteca | ⚪ normale | Missioni Studio: +1 Int extra e −1 ora di durata. | `bonus_missione=studio:int+1,durata-1h` |
| Mente Analitica | ⚪ normale | Impara da tutto: ogni allenamento, di qualsiasi stat, dà +1 Int in più. | `bonus_allenamento=qualsiasi:int+1` |
| Cervellone | 🟡 raro | +3 Int passivo permanente e può imparare fino a 4 parole al giorno (invece di 1), usate nel 50% delle battute. | `passivo=int+3 ; parole_giorno=4 ; uso_parola=50%` |

---

## Maleducato — firma Velocità

### Nascita (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Cleptomane | ⚪ normale | 1 oggetto gratis al giorno dal negozio (max 15 monete di valore); +50% monete dalle missioni che danno monete. | `furto=1/giorno (max 15 monete) ; bonus_missione_monete=x1.5` |
| Bad Loser | ⚪ normale | Nei fallimenti causati dal suo carattere: reward di consolazione ×2 ma −10 Felicità extra. | `se fallimento_carattere: reward=x2, fel-10` |
| Fulmine di Quartiere | 🟡 raro | +2 Velocità passivo permanente e tutte le missioni durano −1 ora (troppo impaziente per restare via). | `passivo=velocita+2 ; missione_durata=-1h` |

### Teen (estrai 1)
| Talento | Rarità | Effetto | Dati |
|---|---|---|---|
| Faccia di Bronzo | ⚪ normale | Non perde mai Felicità dai fallimenti missione (annulla anche il malus di Bad Loser → combo voluta). | `fallimento=fel-0` |
| Mani Lestre | ⚪ normale | +1 Velocità extra da ogni missione completata. | `ogni_missione=velocita+1` |
| Boss di Quartiere | 🟡 raro | 1 oggetto gratis al giorno senza tetto di valore (anche arredi rari) e +50% monete da tutte le missioni. | `furto=1/giorno (nessun tetto) ; bonus_missione_monete=x1.5 (tutte)` |

---

## Pool Inventore (talento Nerd raro)

Esce 1 oggetto a caso, 1 volta a settimana, saltando l'allenamento.

| # | Oggetto | Effetto |
|---|---|---|
| 1 | Batteria carica | +30 Energia subito |
| 2 | Chip di memoria | arredo, +1 Int passivo |
| 3 | Ventola overcloccata | arredo, +1 Velocità passivo |
| 4 | Gruzzolo di bulloni | +20 monete |
| 5 | Snack riciclato | cibo, +1 Int (verdura) |
| 6 | Torcia laser | arredo raro decorativo, +2 Felicità passiva |
| 7 | Prototipo fallato | nessun bonus, ma vendibile a 15 monete (a volte l'invenzione flippa) |

---

## Dipendenze / da fare in P2

- **Tag missioni** (Blocco 3): due talenti richiedono tag tematici sulle missioni, che oggi NON esistono come categorie. Quando si scrivono le nuove missioni P2, taggarne alcune:
  - `natura` (animali/verde) → per **Amante della Natura** (proposta: 2-3 missioni).
  - `invenzione` (laboratorio/gadget) → per **Inventore** (proposta: 1-2 missioni).
  Finché i tag non esistono, di quei due talenti funziona comunque la parte non-missione (bonus cibo vegani; invenzione settimanale).
- **Scheda personaggio** (Blocco 9): schermata tipo scheda gdr che mostra i talenti presi (nascita + evoluzioni) accanto a stat e perk-categoria. Serve perché con talenti cumulativi il pet diventa troppo ricco da leggere dal solo HUD.
- Alcuni effetti nuovi (immunità malus, moltiplicatori mance, furto giornaliero, allenamenti multipli) toccano sistemi P1 esistenti: vanno agganciati in implementazione, non sono coperti dal motore P1.

## Come estendere (Blocco 5 e stadio adulto)

- **Nuove personalità** (Blocco 5): aggiungere una sezione `## <Nome> — firma <Stat>` con le sue due terne (Nascita, Teen), stesso formato. La stat firma va coordinata con bilanciamento.md.
- **Stadio adulto** (fase app): aggiungere a ogni personalità una terza terna `### Adulto (estrai 1)`. Il parser deve trattare gli stadi come lista aperta, non come coppia fissa baby/teen.
