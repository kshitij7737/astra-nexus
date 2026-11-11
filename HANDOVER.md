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

## Roles
Sneha: ASTRA, landing and navigation. Karishma: LUNARIS, QA. Kshitij: HALO, worlds and spacecraft. Anthariksha: JEZERO ECHO, mission control and challenges.
