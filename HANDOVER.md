# NEXUS//04 handover

Live: https://kshitij7737.github.io/astra-nexus/

## Pages
- index.html: landing. Intro, 3D solar system that follows the story, four mission chapters, how it works, discovery archive, judges section. Code in js/landing.js and css/landing.css.
- play.html: the game (Brief, Build, Launch, Operate, Debrief). js/game.js, js/game3d.js, js/sim.js, numbers in js/game-data.js.
- explore.html: the mission worlds explorer. js/app.js, js/scene.js, js/data.js.
- sources.html: every source and licence.

## Editing
- Mission numbers, instruments, events and quiz questions: js/game-data.js. Every value has a source key from js/data.js.
- Progress is saved in the browser under the key nexus04.
- Run locally: python3 -m http.server, then open localhost:8000.

## Difficulty, failure and settings
- Difficulty (Cadet, Flight, Commander) and spacecraft faults live in js/game-data.js (DIFFICULTY, ANOMALIES).
- Ways to fail: rocket failure (odds shown in the builder and launch poll), missing orbit (not enough propellant), running out of propellant, spacecraft lost (health reaches 0 from battery blackouts and faults), or scoring under the difficulty's pass mark.
- Settings (camera and zoom sensitivity, invert, volume, speed, shake, fault countdown) are saved in the browser under nexus04.settings.

## Readiness, scoring and outcome
- The builder runs a full test flight of the real simulation on every change. GO / CAUTION / NO-GO comes from that run (js/game.js, readiness()), so GO means the sim agrees.
- "Suggest a build" uses RECOMMENDED in js/game-data.js: the best build per mission and difficulty, found by testing every combination of parts offline (tools script in the team notes). Re-run it if part values change.
- Outcome (js/sim.js result()): failure if the spacecraft is lost or the score is under the pass mark; success if all three objectives are complete; otherwise partial success. Badge, headline and summary all read this one value.
- Score: objective points (weight x share of data returned) + questions (0 to 10) - blackouts (3 each, max 15) - thrown-away data (1 per 20 Gbit, max 5). A lost spacecraft keeps 60%.

## Look and sound
- Spacecraft palette is locked (design handoff): warm gold body, blue arrays, white high-gain antenna. Mission accents never recolour the craft.
- js/craft.js builds the four concept spacecraft (shapes inspired by OSIRIS-APEX, LRO, Aura, MRO). Always labelled Conceptual, not NASA hardware. Builder parts carry data-part ids; hovering a catalogue row highlights that part via stage.inspect(id). Only instruments in the game config are drawn. Downlink and recorder change readouts only.
- Landing stops: one target per stop, one orbit ring, the stop's own craft on that ring pointed at the target, world name placed in open space, Jezero and south-pole markers marked approximate. Facts per stop live in CH in js/landing.js with a source link each.
- Accents: ASTRA ion blue #4aa8ff, LUNARIS silver-cyan #9fe0ea, HALO violet #a78bfa, JEZERO ECHO Mars red #d0674c with pale blue #a9d4ff.
- Music: js/music.js, generated with Web Audio. Moods: calm, launch, ops, tense.

## Performance and polish
- textures/sm holds half-size maps. js/scene.js picks them on phones, low-memory devices and data-saver mode.
- A thin bar at the top of the page shows imagery loading (css/nexus.css).
- The 3D stage lowers its render resolution automatically if frames get slow (js/game3d.js, tick()).
- Skip ahead (mission control) fast-forwards to the next decision, alarm or blackout.
- og.jpg and the og: tags in each page give the link a preview picture in chats. favicon.svg is the tab icon.
- LUNARIS budget is 1300 so that a fully GO build exists on every difficulty.

## Roles
Sneha: ASTRA, landing and navigation. Karishma: LUNARIS, QA. Kshitij: HALO, worlds and spacecraft. Anthariksha: JEZERO ECHO, mission control and challenges.
