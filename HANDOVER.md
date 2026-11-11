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

## Roles
Sneha: ASTRA, landing and navigation. Karishma: LUNARIS, QA. Kshitij: HALO, worlds and spacecraft. Anthariksha: JEZERO ECHO, mission control and challenges.
