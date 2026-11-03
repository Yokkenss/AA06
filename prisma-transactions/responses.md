# prisma-transaktionen

## 1. projekt einrichten

das projekt verwendet typescript, node.js, prisma 7 und die lokale mysql-datenbank `ecommerce`. die zugangsdaten stehen in `.env`, die nicht abgegeben wird. schema, verbindung und seed stammen aus den vorlagen.

```bash
npx prisma migrate dev --name init_db_tables
npx prisma generate
```

`users` speichert benutzer, `orders` bestellungen und `payments` zahlungen. ein benutzer kann mehrere bestellungen und zahlungen haben. jede bestellung gehört einem benutzer und kann mehrere zahlungen haben. jede zahlung gehört einem benutzer und einer bestellung.

## 2. seed-daten

```bash
npx tsx prisma/seed.ts
```

der seed erstellt bob mit id 1 und alice mit id 2, beide mit 0 bonuspunkten. bob erhält eine bestellung über 60 mit `ord-ref-0001` und die passende zahlung mit `pay-ref-0001`. der seed wird nur einmal auf einer leeren datenbank ausgeführt.

## 3. transaktion ausführen

```bash
npx tsx index.ts
```

`index.ts` erstellt für alice eine bestellung über 125, die zahlung und 5 bonuspunkte. alle änderungen stehen in einer transaktion.

mit `pay-ref-0001` scheitert schritt 2 an der bereits vorhandenen zahlungsreferenz. der rollback entfernt die neue bestellung. es bleibt bei einer bestellung und einer zahlung für bob, alices bonus bleibt 0.

nach der änderung auf `pay-ref-0002` werden alle drei schritte erfolgreich ausgeführt. danach gibt es zwei bestellungen und zwei zahlungen. alices bonus steigt von 0 auf 5. bei weiteren versuchen sind die festen referenzen bereits belegt.

## 4. verständnisfragen

### 1. was ist eine transaktion und was bedeutet acid?

eine transaktion fasst mehrere datenbankänderungen zusammen.

- atomicity: alle änderungen werden gespeichert oder alle zurückgerollt.
- consistency: die regeln der datenbank bleiben eingehalten.
- isolation: gleichzeitige transaktionen werden entsprechend dem isolationsniveau voneinander abgeschirmt.
- durability: bestätigte änderungen bleiben dauerhaft gespeichert.

### 2. warum sollen die drei schritte gemeinsam erfolgreich sein oder scheitern?

sie gehören zu einem bestellvorgang. es soll zum beispiel kein neuer auftrag ohne passende zahlung gespeichert bleiben.

### 3. was wäre ohne transaktion bei einem fehler?

bei einem zahlungsfehler bliebe die bestellung gespeichert. bei einem fehler beim bonus blieben bestellung und zahlung gespeichert, aber die bonuspunkte würden fehlen.

### 4. warum zuerst die bestellung und welche werte braucht die zahlung?

die zahlung braucht die bestell-id. sie übernimmt `createdOrder.id`, `createdOrder.amount` und `createdOrder.userId`. die vorlage verwendet die bestell-id auch als zahlungs-id.

### 5. was unterscheidet prisma und transaction?

`prisma` ist der normale client und startet die transaktion. `transaction` ist der client innerhalb der transaktion. alle drei änderungen verwenden ihn, damit sie gemeinsam gespeichert oder zurückgerollt werden.

### 6. wann wird der bonus erhöht?

bei einem betrag über 100 wird der bonus um 5 erhöht. bei genau 100 gibt es keinen bonus, weil die bedingung `createdOrder.amount > 100` lautet.

### 7. interaktive oder sequenzielle transaktion?

hier wird eine interaktive transaktion mit einer funktion verwendet. sie passt, weil die zahlung die neue bestell-id braucht und der bonus von einer bedingung abhängt. die sequenzielle form `prisma.$transaction([...])` führt eine vorbereitete liste von abfragen aus und passt, wenn die nötigen werte vorher bekannt sind.

### 8. was hat der rollback gezeigt?

verglichen wurden benutzer, bestellungen, zahlungen und alices bonus. vor und nach dem fehler gab es zwei benutzer, eine bestellung, eine zahlung und 0 bonuspunkte für alice. die neue bestellung wurde also zurückgerollt. nach dem erfolgreichen lauf gab es zwei bestellungen, zwei zahlungen und 5 bonuspunkte für alice.

### 9. kann ein rollback eine externe zahlung rückgängig machen?

nein, er betrifft nur die eigene datenbank. eine echte zahlung müsste beim zahlungsdienst separat storniert oder zurückerstattet werden. hier wird nur ein zahlungsdatensatz angelegt.
