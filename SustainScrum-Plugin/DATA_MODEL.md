# SustainScrum – Datenmodell und Rückverfolgbarkeit

Dieses Dokument beschreibt das Datenmodell der App und die empfohlene Jira-Konfiguration für Nachhaltigkeitsartefakte und Trace-Links.

## Übersicht

Das Datenmodell ist um die SustainScrum-Artefakte und die Notwendigkeit der Rückverfolgbarkeit herum organisiert:

1. **SuMM-Konfiguration**
2. **Nachhaltigkeitsgeschichte (SUS)** – Jira-Issue mit Links zu User Stories
3. **Nachhaltigkeitsbewertung von User Stories** – inkl. Links zu Begründungsaufzeichnungen
4. **Nachhaltigkeitsbegründungsaufzeichnung** – strukturierter Text + verknüpfte Issues
5. **Sprint-/Produkt-KPI-Bericht** – Dashboard

---

## 1. SuMM-Konfiguration

- Ausgewählte Nachhaltigkeitsdimensionen (Teilmenge der fünf SusAF-Dimensionen)
- Dimensionsgewichtungen (normalisierter Vektor)
- Optional: Nachhaltigkeitsgeschichten ↔ Dimensionszuordnung; Gewichtungsbeiträge der Stakeholder

**In der App:** Admin-Seite „SustainScrum Plugin“ → SuMM pro Projekt konfigurieren.

---

## 2. Nachhaltigkeitsgeschichte (SUS)

- **Jira-Issue vom Typ „Nachhaltigkeitsgeschichte“** (oder vergleichbarer Name)
- Felder (in Jira oder als Konvention): angestrebte Dimensionen, Ziel/Absicht, Akzeptanzkriterien, optionale KPI-Ziele
- **Links zu verwandten User Stories** (Rückverfolgbarkeit)

### Jira-Einrichtung (empfohlen)

1. **Issue Type anlegen**
   - In Jira: **Einstellungen** → **Probleme** → **Problemtypen** → neuer Typ z. B. **„Nachhaltigkeitsgeschichte“** (oder „Sustainability Story“ / „SUS“).
   - Diesen Typ dem gewünschten Projekt-Workflow hinzufügen.

2. **Link-Typ für Rückverfolgbarkeit**
   - **Einstellungen** → **System** → **Verknüpfungstypen**.
   - Standardtyp **„Relates“** reicht für SUS ↔ User Story; optional eigenen Typ z. B. **„Traces to“** / **„Implementiert Nachhaltigkeitsgeschichte“** anlegen.

**In der App:** Im Sustainability Panel wird bei jedem Issue der Abschnitt **„Traceability (Issue Links)“** angezeigt. Dort können Sie:
- verlinkte Issues (User Stories / SUS) sehen,
- über **„+ Add link“** und Suche einen Link hinzufügen (Jira-Standardtyp „Relates“),
- Links entfernen.

Die Verknüpfungen sind **First-Class-Jira-Links** (issuelinks) und in Jira sichtbar/nutzbar.

---

## 3. Nachhaltigkeitsbewertung von User Stories

- Pro User Story: Bewertungen pro Dimension (inkl. „irrelevant“ / Indifferent)
- Abgeleitete Indikatoren (SusAF-Scores, gewichteter KPI)
- **Links zu Begründungsaufzeichnungen** (siehe 4.)

**In der App:** Sustainability Panel → Assessment Wizard (Dimensionen + optional Justification). Die Bewertung wird pro Issue gespeichert; die Begründung (und ihre verknüpften Issues) werden mit der Bewertung abgelegt.

---

## 4. Nachhaltigkeitsbegründungsaufzeichnung

- Strukturierter Text: Kompromisse, in Betracht gezogene Alternativen, Begründungen
- **Explizite Links zu den betroffenen Issues** (User Stories und Nachhaltigkeitsgeschichten)

**In der App:** Im Assessment Wizard gibt es einen optionalen Schritt **„Nachhaltigkeitsbegründung“**:
- **Kompromisse**, **Alternativen**, **Begründung** (Textfelder)
- **Verknüpfte Issues:** Suche nach Key/Summary, Auswahl mehrerer Issues; diese werden als `linkedIssueKeys` in der Begründung gespeichert.

Die Begründung wird zusammen mit der Bewertung im App-Storage gespeichert (`assessment.justification`). Die „Links“ zu anderen Issues sind dabei referenzierte Issue-Keys (Rückverfolgbarkeit auf App-Ebene). Jira-Issue-Links (Abschnitt „Traceability“) bleiben weiterhin in Jira geführt.

---

## 5. Sprint-KPI-Bericht / Produkt-KPI-Bericht

- **Sprint-KPI-Bericht:** berechnete Indikatoren für den gewählten Sprint (Dashboard mit Sprint-Filter).
- **Produkt-KPI-Bericht:** aggregierte Indikatoren (Dashboard pro Projekt, ggf. ohne Sprint).

**In der App:** Sustainability Dashboard – Projekt und optional Sprint wählen; Übersicht, KPI-Details, Heatmap, Trends.

---

## Speicherorte

| Was | Wo |
|-----|-----|
| SuMM-Konfiguration | Forge Storage `summ:{projectKey}` |
| Bewertung pro Issue | Forge Storage `assessment:{issueKey}` (inkl. `justification` und `linkedIssueKeys`) |
| Index Bewertungen pro Projekt | Forge Storage `assessments:{projectKey}` |
| KPI-Verlauf (Trends) | Forge Storage `kpi-history:{projectKey}` |
| Issue-Links (SUS ↔ User Story) | **Jira** (issuelinks) – nicht im App-Storage |

---

## Kurzfassung Trace-Links

- **Jira-Links (Traceability):** Im Panel „Traceability (Issue Links)“ – Links zwischen dem aktuellen Issue und anderen Issues (z. B. SUS ↔ User Story). Werden in Jira angelegt und gelöscht (First-Class).
- **Begründung → Issues:** Im Assessment unter „Nachhaltigkeitsbegründung“ können Sie „Verknüpfte Issues“ angeben; diese werden als Liste von Issue-Keys in der Bewertung gespeichert (Rückverfolgbarkeit der Begründung zu den betroffenen Artefakten).

Optional können Sie in Jira die Issue-Typen **„Sustainability Need“** und **„Nachhaltigkeitsgeschichte“ (SUS)** sowie passende Link-Typen anlegen, um das Modell konsistent zu nutzen.
