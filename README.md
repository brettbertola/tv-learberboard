# Superstar Coin Clash

An over-the-top, Rive-powered party scoreboard with a host control surface and a synchronized 16:9 TV display.

## What it does

- Edits the party title, team names, current coin totals, and per-round coin awards.
- Adds and removes teams and uses competition ranking for ties.
- Opens a dedicated `/tv` display and synchronizes updates between windows with `BroadcastChannel`.
- Persists the current party locally so a refresh does not erase the board.
- Drives Rive view-model values for the title, leader, score, round, animation energy, and coin-storm intensity.
- Includes animated auroras, rotating energy portals, a leader beacon, twinkling stars, score impacts, and coin rain.
- Honors the operating system's reduced-motion preference.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL for the host controls. Use **Open TV view** for the display window.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Rive source

The editable Rive CLI project lives in `rive/party-scoreboard`. Its text-based RML source is compiled to the runtime asset served from `public/rive/party-scoreboard.riv`.

```bash
rive doctor
cd rive/party-scoreboard
rive . --verify
rive inspect . --summary
rive . --screenshot --advance=1
```

After changing the RML, copy `rive/party-scoreboard/build/party-scoreboard.riv` to `public/rive/party-scoreboard.riv`.

The embedded Luckiest Guy font is distributed under Apache License 2.0; its license is included at `rive/party-scoreboard/FONT_LICENSE.txt`.
