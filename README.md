# RESCUE GE

Offlinefähige Nachschlage- und Arbeitshilfe (PWA) für den Rettungsdienst Gelsenkirchen.

> **Keine offizielle Freigabe.** Die medizinischen Inhalte sind maschinell aus der Textfassung des
> *Gemeinsamen Kompendiums Rettungsdienst 2026* übernommen und **nicht** durch die Ärztliche Leitung
> Rettungsdienst geprüft. Vor produktivem Einsatz ist eine Prüfung und Freigabe durch die ÄLRD erforderlich.
> Der Medikamentenrechner ist eine technische Unterstützung, keine medizinische Entscheidungsinstanz.

## Inhalt

| Bereich | Inhalt |
|---|---|
| Start | Globale Suche, Schnellzugriff (konfigurierbar), Favoriten, zuletzt geöffnet, Datenstand |
| SAA | 19 SAA invasive Maßnahmen (S. 27–45) mit GE-Kompetenzstufe aus den Kompetenzzeilen |
| Medikamente | 31 Medikamenten-SAA (S. 49–79) + 3 Medikamente nur aus BPR; GE-Kompetenz je Indikation aus den BPR-Kästen |
| Rechner | 21 gewichtsabhängige Rechenregeln, jede Zahl wörtlich belegt; widersprüchliche Regeln gesperrt |
| Krankheitsbilder / Reanimation | Leitsymptome, Krankheitsbilder, Trauma, ALS/PLS/NLS/Post-ROSC als Textauszug + Medikamentenkästen mit GE-Feld |
| Kliniken | Kliniken aus dem Leitfaden KoJ mit Zuweisungsregeln; Anruf- und Navigationslinks; **keine** Echtzeit-Verfügbarkeit |
| Lokales Wissen | DA Desinfektion, DB Doku-Stichworte, Leitfaden KoJ – getrennt von medizinischen Inhalten |
| Offene Fragen | Alle Unklarheiten und Widersprüche der Quellen |

Prüfstatus: *Geprüft* (nur nach menschlicher Freigabe – derzeit nie gesetzt), *Teilweise geprüft* (Text + GE-Kennzeichnung im Text gefunden, Sichtprüfung fehlt), *GE-Gültigkeit noch zu prüfen*, *Unvollständige Quelle*, *Widersprüchliche Quellen*, *Veraltet*.

## Sicherheit / Vertraulichkeit

- Alle Inhalte liegen nur verschlüsselt in `public/data.enc` (gzip → AES-256-GCM, Schlüssel per PBKDF2-SHA256 mit 600.000 Iterationen aus dem Passwort).
- Ohne Passwort zeigt die App nur den Sperrbildschirm. Entschlüsselt wird ausschließlich im Browser.
- Option „Auf diesem Gerät entsperrt bleiben“: speichert einen **nicht exportierbaren** WebCrypto-Schlüssel in IndexedDB. „Gerät vergessen“ in den Einstellungen löscht ihn.
- Klartextdaten (`data/`) sind per `.gitignore` ausgeschlossen und dürfen **nicht** in ein öffentliches Repository.
- `robots.txt` und `noindex` verhindern die Indexierung. Die Adresse selbst ist bei GitHub Pages öffentlich erreichbar, die Inhalte nicht.

## Installation auf dem iPhone

1. In Safari die Pages-Adresse öffnen (`https://<github-name>.github.io/rescue-ge/`).
2. Passwort eingeben, „Auf diesem Gerät entsperrt bleiben“ aktivieren.
3. Teilen-Symbol → **Zum Home-Bildschirm**.
4. App einmal online vom Home-Bildschirm öffnen. Danach funktioniert alles offline (Service Worker cached alle Dateien inkl. `data.enc`).
5. Neue Versionen werden beim nächsten Online-Start geladen; ein Banner „Aktualisieren“ erscheint.

## Technik

React 19 + TypeScript + Vite + Tailwind CSS 4, HashRouter (läuft auf jedem statischen Host), eigener Service Worker (`tools/gen-sw.mjs` erzeugt die Precache-Liste nach dem Build), IndexedDB für Schlüssel/Favoriten/Verlauf/Einstellungen. Keine externen Fonts/CDNs.

```
src/            Anwendungscode (keine medizinischen Inhalte im Code)
  lib/calc.ts   Rechenlogik (reine Mathematik)        lib/search.ts  Offline-Suche
  lib/crypto.ts Entschlüsselung                       lib/store.tsx  Daten, Favoriten, Einstellungen
tools/          extract_kompendium.py → build_dataset.py → encrypt.mjs → gen-sw.mjs
tests/          Rechner-Tests + Datenintegrität (läuft nur mit lokalem data/)
data/           (nicht im Repo) sources/, curated/, raw/, dataset.json
public/data.enc verschlüsselter Datensatz (wird committet)
```

Befehle: `npm ci`, `npm run dev`, `npm test`, `npm run build`. Deployment: GitHub Actions (`.github/workflows/pages.yml`) baut bei jedem Push auf `main` und veröffentlicht auf GitHub Pages.

## Datenpflege

Der Ordner `data/` liegt privat (Projektdateien), nicht im Repository.

```
data/sources/   Quelltexte: GemKompRD2026.pdf.txt, da-2026-10-002.txt, db-37-5-16.txt, leitfaden-koj.txt
data/curated/   von Hand gepflegt:
  med_competence.json  Zuordnung BPR-Medikamentenkasten (Zeilennummer) → Medikament
  calc_rules.json      Rechenregeln, jede mit wörtlichen Zitaten (quotes) und Kompetenzzeile
  issues.json          offene Fragen / Widersprüche
  local.json           Metadaten lokaler Dokumente      hospitals.json  Kliniken
  synonyms.json        Suchbegriffe
```

Ablauf bei neuen Dokumenten oder Versionen:

1. Quelltext nach `data/sources/` legen (neue Kompendiumsversion **unter neuem Namen**, alte nicht überschreiben).
2. Kuratierte Dateien ergänzen (z. B. neue Klinik in `hospitals.json`, neues Dokument in `local.json`).
3. `npm run data` – baut `data/dataset.json`. Der Build **bricht ab**, wenn ein Rechner-Zitat nicht wörtlich in der Quelle steht (schützt vor unbemerkten Änderungen durch eine neue Version).
4. `npm test` – Rechner- und Integritätstests.
5. `RESCUE_GE_PASSPHRASE='…' npm run encrypt` (oder `node tools/encrypt.mjs --ask`) → `public/data.enc`.
6. `git diff` prüfen, committen, pushen. Jeder Datensatz trägt `datasetVersion`, `generatedAt` und den SHA-256 jeder Quelldatei (sichtbar unter *Quellen* / *Einstellungen*).

Passwort ändern: Schritt 5 mit neuem Passwort ausführen und pushen; Geräte müssen danach einmal neu entsperren.

Rundung im Rechner: Dosis und Volumen auf 2 Nachkommastellen (kaufmännisch); Maximaldosis wird vor dem Runden angewendet; ungerundete Werte stehen im Rechenweg.
