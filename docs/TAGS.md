# Feature: Document Tags

## Status: In Development

## Autor: Sebastian Berger

## Erstellt: 2026-02-27

---

## 1. Zielsetzung

Die Verschlagwortung (Tagging) von Dokumenten soll die Auffindbarkeit und thematische Strukturierung von Inhalten verbessern, ohne die bestehende Collection-Hierarchie zu ersetzen. Tags sind eine orthogonale Klassifikation – ein Dokument kann in einer Collection liegen *und* mehrere thematische Tags tragen.

Zusätzlich soll das System kompatibel mit dem Obsidian-Ökosystem sein: Ein bestehendes Plugin pushes Obsidian-Notizen nach Outline. Dabei enthaltene Tags (YAML-Frontmatter + Inline-Hashtags) sollen automatisch übernommen werden.

Mittelfristiges Ziel: "Intelligente Ordner" (Smart Collections), die dynamisch alle Dokumente mit bestimmten Tags anzeigen.

---

## 2. Referenz: Obsidian Tag-System

Um das richtige Design zu treffen, wurde Obsidians Tag-Ansatz analysiert. Die Erkenntnisse beeinflussen direkt das Outline-Design.

### 2.1 Wie Obsidian Tags implementiert

Obsidian kennt zwei gleichwertige Tag-Quellen:

```markdown
---
tags: [projekt, kunde-xyz, status/aktiv]
---
# Titel

Dies ist ein Teil von #marketing und bezieht sich auf #vertrieb/strategie.
```

- **Frontmatter-Tags** (`tags:` in YAML): Klassifizieren das *gesamte Dokument*
- **Inline-Tags** (`#word` im Text): Markieren einen *spezifischen Abschnitt oder Gedanken*

Beide erscheinen im Tag-Panel und sind gleichwertig als Suchfilter nutzbar.

**Nested Tags** via `/`: `#project/website-redesign` – Suche nach `#project` findet alle Subtags automatisch.

**Syntax-Regeln:** Gültig: Buchstaben (Unicode), Zahlen, `_`, `-`, `/`. Ungültig: Spaces, reine Zahlen (`#2024`), Sonderzeichen. Case-insensitive in der Suche.

### 2.2 Das bekannte Problem von Obsidians Ansatz

Da Tags im Dateiinhalt stecken, ist Umbenennung eines Tags eine manuelle Massenbearbeitung aller Dateien. Die Obsidian-Community bezeichnet das als ihren größten Pain Point. Dies ist ein bekanntes Designproblem, das wir in Outline **nicht reproduzieren** dürfen.

---

## 3. Design-Entscheidung: Reines Klassifikationssystem

Tags in Outline sind **ausschließlich ein Klassifikationssystem** – keine Navigationsmethode, kein Inline-Annotationsmechanismus. Diese Entscheidung basiert auf folgender Analyse:

- Outline hat bereits eine vollwertige Dokument-Verlinkung (`[[Dokument]]`). Inline-Tags (`#tag` im Text) würden ein zweites, schwächeres Navigationssystem einführen, das dasselbe leistet wie ein Tag-Filter in der Dokumentliste – den wir ohnehin bauen.
- Inline-Tags im ProseMirror-Editor erfordern eine eigene Extension (eigener Node-Typ, Autocomplete, Cursor-Handling) mit hohem Aufwand für geringen Mehrwert.
- Bidirektionale Synchronisation zwischen Text-Content und Tag-Metadaten ist in kollaborativen Y.js-Umgebungen fehleranfällig.

**Entscheidung: Keine Inline-Tags, keine Nested Tags. Tags sind Metadaten-Entitäten, verwaltet in der Sidebar.**

---

## 4. Obsidian-Kompatibilität: Import-Split

Die Obsidian-Integration wird auf zwei Ebenen gelöst – jede Ebene dort, wo sie semantisch hingehört:

| Was | Wo | Begründung |
| --- | -- | ---------- |
| YAML `tags:` → Outline-Tags beim Markdown-Import | **Outline-nativ** | YAML-Frontmatter ist kein Obsidian-Feature, sondern ein offener Standard (Jekyll, Hugo, Pandoc). Alle Markdown-Nutzer profitieren. |
| Inline `#tags` im Text → Outline-Tags beim Push | **Plugin-seitig** | Inline-Hashtags als Tags sind Obsidian-spezifische Semantik. Die Extraktion ist trivial (~3 Zeilen Regex im Plugin). |
| Outline-Tags → YAML `tags:` beim Markdown-Export | **Outline-nativ** | Rückweg für Obsidian-Kompatibilität, generisch nützlich. |

Der Plugin-Extraktor für Inline-Tags:

```javascript
const inlineTags = content
  .match(/#([a-zA-Z\u00C0-\u024F][a-zA-Z0-9_\-]*)/g)
  ?.map(t => t.slice(1).toLowerCase()) ?? [];
```

---

## 5. Anforderungen

### 5.1 Funktionale Anforderungen

| ID   | Anforderung | Priorität |
| ---- | ----------- | --------- |
| F-01 | Ein Dokument kann 0–N Tags tragen | Hoch |
| F-02 | Tags haben einen Namen (max. 64 Zeichen) | Hoch |
| F-03 | Tag-Namen sind innerhalb eines Teams eindeutig (case-insensitive, gespeichert als lowercase) | Hoch |
| F-04 | Beim Tippen eines Tag-Namens erscheinen Vorschläge aus bestehenden Team-Tags (Autocomplete) | Hoch |
| F-05 | Neue Tags können direkt beim Taggen eines Dokuments erstellt werden | Hoch |
| F-06 | Tags können in der Dokumentliste und Suche als Filter verwendet werden | Hoch |
| F-07 | Tags sind in der Dokumentansicht in der Sidebar als Badges sichtbar | Hoch |
| F-08 | Team-Admins können Tags umbenennen (wirkt teamweit) | Hoch |
| F-09 | Team-Admins können Tags löschen – mit zweistufigem Schutzmechanismus | Hoch |
| F-10 | Tags werden in der UI einheitlich hervorgehoben (systemseitig, kein Farbwahl durch User) | Hoch |
| F-11 | Tags werden beim Markdown-Export als YAML-Frontmatter mitgeführt | Mittel |
| F-12 | YAML `tags:` beim Markdown-Import werden als Outline-Tags gesetzt | Mittel |
| F-13 | Tag-Aktionen erzeugen Events (für Webhooks und Activity-Log) | Mittel |
| F-14 | `documents.addTag` akzeptiert Tag per Name (upsert: neu anlegen falls unbekannt) | Hoch |
| F-15 | Tags bleiben beim Duplizieren eines Dokuments erhalten | Mittel |
| F-16 | Tags bleiben beim Verschieben zwischen Collections erhalten | Mittel |

### 5.2 Nicht-Anforderungen (dauerhaft ausgeschlossen)

- **Inline-Tags** (`#tag` im Dokumententext) – kein Mehrwert gegenüber Dokument-Verlinkung + Tag-Filter
- **Nested/Hierarchische Tags** (`#project/sub`) – unnötige Komplexität
- **Per-User-Tags** – Tags sind immer team-weit normalisiert

### 5.3 Nicht-Anforderungen (Out of Scope, spätere Phase)

- Smart Collections auf Tag-Basis (Phase 3)
- Tags in tsvector-Volltext-Index (Phase 3)

---

## 6. Tag-Löschung: Schutzmechanismus

Das Löschen eines globalen Tags entfernt ihn aus **allen Dokumenten des Teams**. Das ist eine destruktive, teamweite Operation. Der Schutzmechanismus:

### Zweistufiger API-Delete

```text
Stufe 1: GET  /api/tags/:id/usage
         → { documentCount: 47, sampleTitles: ["Projektplan Q1", "Roadmap 2026", ...] }

Stufe 2: DELETE /api/tags/:id  { confirm: true }
         → löscht Tag (soft) + alle document_tags (hard) + loggt Event mit affectedCount
```

`DELETE` ohne `confirm: true` liefert HTTP 400 mit Nutzungsvorschau zurück – kein versehentliches Löschen möglich.

### Frontend-Dialog

```text
⚠️ Tag "Marketing" löschen?

Dieser Tag ist in 47 Dokumenten verwendet:
  • Projektplan Q1 2026
  • Roadmap Marketing 2026
  • Kundenanalyse ACME
  • ... und 44 weitere

Das Löschen entfernt den Tag aus allen diesen Dokumenten.
Diese Aktion kann nicht rückgängig gemacht werden.

[ Abbrechen ]  [ Tag löschen ]
```

### Soft Delete vs. Hard Delete

- **`tags`-Tabelle**: Soft Delete (`deletedAt`) – Admin kann den Tag theoretisch wiederherstellen
- **`document_tags`-Tabelle**: Hard Delete – die Dokument-Verknüpfungen sind beim Löschen unwiderruflich weg

> **Bewusster Trade-off:** Wenn ein Tag wiederhergestellt wird, sind die Dokument-Verknüpfungen verloren. Das ist akzeptiert, da eine Wiederherstellung ein Ausnahmefall ist und die Komplexität einer reversiblen Relation-Löschung nicht rechtfertigt.

---

## 7. Datenmodell

### 7.1 Tabellendesign

```text
tags
├── id          UUID, PK
├── teamId      UUID, FK → teams.id, NOT NULL, CASCADE DELETE
├── createdById UUID, FK → users.id, SET NULL on delete
├── name        VARCHAR(64), NOT NULL  (gespeichert als lowercase)
├── createdAt   TIMESTAMP
├── updatedAt   TIMESTAMP
├── deletedAt   TIMESTAMP              (Soft Delete / paranoid)
└── UNIQUE(teamId, name)               (name bereits lowercase → kein LOWER() nötig)

document_tags
├── id          UUID, PK
├── documentId  UUID, FK → documents.id, NOT NULL, CASCADE DELETE
├── tagId       UUID, FK → tags.id, NOT NULL, CASCADE DELETE
├── createdById UUID, FK → users.id, SET NULL on delete
├── createdAt   TIMESTAMP
└── UNIQUE(documentId, tagId)
```

### 7.2 Indexstrategie

```sql
CREATE INDEX idx_tags_team_id   ON tags(teamId) WHERE deletedAt IS NULL;
CREATE INDEX idx_tags_team_name ON tags(teamId, name) WHERE deletedAt IS NULL;
CREATE INDEX idx_document_tags_tag_id      ON document_tags(tagId);
CREATE INDEX idx_document_tags_document_id ON document_tags(documentId);
```

---

## 8. Berechtigungsmodell (Security)

### 8.1 Tag-Sichtbarkeit vs. Team-Membership

Tags werden **niemals isoliert abgerufen** – immer eingebettet im Dokument-Response. Damit sieht jeder, der ein Dokument lesen darf, auch dessen Tags – unabhängig von Team-Mitgliedschaft (Guests, Share-Links).

Der `GET /api/tags`-Endpunkt (Team-Tag-Liste für Autocomplete) erfordert dagegen Team-Mitgliedschaft und ist für Guests gesperrt – Guests können keine Tags setzen.

### 8.2 Policy-Matrix

| Aktion | Akteur | Bedingung |
| ------ | ------ | --------- |
| Tags eines Dokuments lesen | Jeder | `can(actor, "read", document)` |
| Team-Tag-Liste abrufen (Autocomplete) | Team-Member | Team-Mitgliedschaft, kein Guest |
| Tag zu Dokument hinzufügen | Editor | `can(actor, "update", document)` |
| Tag von Dokument entfernen | Editor | `can(actor, "update", document)` |
| Neuen Tag erstellen | Editor | `can(actor, "update", document)` + kein Viewer |
| Tag umbenennen | **Team-Admin** | `isTeamAdmin(actor)` – wirkt auf alle Dokumente |
| Tag löschen | **Team-Admin** | `isTeamAdmin(actor)` + `confirm: true` |

### 8.3 Datenisolation

Jede DB-Query auf `tags` trägt einen `teamId`-Filter als Sequelize-Scope – nicht nur in der Route. Cross-Team-Zugriff ist strukturell unmöglich.

---

## 9. API-Design

### 9.1 Endpunkte

```text
GET    /api/tags              → Team-Tag-Liste (?query= für Autocomplete)
POST   /api/tags              → Neuen Tag erstellen
PATCH  /api/tags/:id          → Tag umbenennen (nur Admin)
GET    /api/tags/:id/usage    → Anzahl betroffener Dokumente (vor Delete anzeigen)
DELETE /api/tags/:id          → Tag löschen, body: { confirm: true } (nur Admin)

POST   /api/documents.addTag     → Tag zu Dokument hinzufügen (per name oder id, upsert)
POST   /api/documents.removeTag  → Tag von Dokument entfernen
```

### 9.2 Dokument-Response (Erweiterung)

```typescript
{
  // ... bestehende Felder ...
  tags: Array<{
    id: string;
    name: string;
  }>;
}
```

Im `isPublic`-Modus (Share-Link): Tags werden mitgeliefert (`name`), aber **ohne `id`** – keine Enumeration interner Ressourcen möglich.

---

## 10. Frontend-Architektur

### 10.1 Modelle & Stores

- `app/models/Tag.ts` – MobX-Modell (id, name, teamId)
- `app/stores/TagsStore.ts` – CRUD, Caching, Autocomplete-Suche, Usage-Preview

### 10.2 Komponenten

- `TagBadge` – Badge mit systemseitiger Hervorhebung (Outline-Systemfarbe, keine User-Farbwahl), klickbar → öffnet Tag-Filter
- `TagInput` – Combobox in der Sidebar: Autocomplete bestehender Tags, Erstellen neuer Tags inline, Entfernen
- `TagDeleteDialog` – Zweistufiger Lösch-Dialog mit Dokumentenanzahl und Beispiel-Titeln
- `TagsSettings` – Admin-Seite in Settings: alle Team-Tags, Umbenennen, Löschen

### 10.3 Suche / Filter

- Tag-Filter in der Dokumentenliste
- URL-Parameter: `?tag=projektplanung`
- Mehrere Tags: `?tag=marketing&tag=q1-2026` (AND-Logik)

---

## 11. Implementierungsplan

### Phase 1 – Backend

- [ ] DB-Migration: `tags`-Tabelle
- [ ] DB-Migration: `document_tags`-Join-Tabelle
- [ ] Sequelize-Modell: `server/models/Tag.ts`
- [ ] Sequelize-Modell: `server/models/DocumentTag.ts`
- [ ] Relation `BelongsToMany` in `server/models/Document.ts`
- [ ] Policy: `server/policies/tag.ts`
- [ ] Presenter: `server/presenters/tag.ts`
- [ ] Tags in `server/presenters/document.ts` einbinden (inkl. `isPublic` ohne `id`)
- [ ] API-Route: `server/routes/api/tags/` (inkl. `/usage`-Endpunkt)
- [ ] API: `documents.addTag` (upsert by name), `documents.removeTag`
- [ ] Markdown-Importer: YAML `tags:` → Outline-Tags
- [ ] Markdown-Exporter: Outline-Tags → YAML `tags:`
- [ ] Tests: Policy + alle API-Endpunkte

### Phase 2 – Frontend

- [ ] `app/models/Tag.ts`
- [ ] `app/stores/TagsStore.ts`
- [ ] Komponente: `TagBadge`
- [ ] Komponente: `TagInput` (Sidebar)
- [ ] Komponente: `TagDeleteDialog`
- [ ] Seite: `TagsSettings` (Admin)
- [ ] Tag-Filter in Dokumentliste + Suche

### Phase 3 – Späteres Feature

- [ ] Smart Collections (dynamische Collection auf Tag-Basis)
- [ ] Tags in tsvector-Volltext-Index
