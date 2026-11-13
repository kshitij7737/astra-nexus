# Cosmic Explorer implementation and review

## Experience map

| Chapter | Scene sequence | Handoff |
|---|---|---|
| Nebulae | Approach, dust, returned stellar material, nursery, protostar, return | The planetary-nebula and supernova-remnant examples lead back to the separate nursery process. The chapter links to the protostar scene. |
| Star life | Cloud, collapse, protostar, fusion, mass-dependent futures, remnant | Protostar opens Planet Formation. Later scenes link to Black Holes. |
| Planet formation | Disk, temperature, collisions, planetesimals, protoplanets, systems | The link to the stellar timeline returns to the protostar scene. |
| Black holes | Inference, stellar origin, horizon, disk, warped light, evidence | The optional binary demonstration is inside the evidence stage. General lensing is a separate chapter. |
| Lensing | Geometry, paths, alignment, images, delay, applications | Brightness and arrival timing are separate explanatory panels. The next chapter is Cosmic Scales. |
| Cosmic scales | Earth and Moon, Solar System, nearby stars, Milky Way, Local Group, horizon | The journey ends with a question and a link back to the hub. |

## Layout and scene state

Desktop places the scene and controls above a two-column story and lab panel. At narrow widths the story and lab stack, the chapter strip scrolls, and the evidence panel follows both. The viewer has discrete previous and next controls. When a stage offers observational imagery, the viewer separates it from the diagram or 3D model.

Scene slugs, cross-links, feature descriptions, and completion copy are in `js/cosmic-revision.js`. Scene headlines and learning captions are in `js/cosmic-data.js`. Camera positions, lighting, object placement, and motion are in `js/cosmic-art.js`. The canvas diagrams in `js/cosmic-diagram.js` preserve the main stages and controls without WebGL. The stage controller handles the guided clock, zoom, switching views, keyboard actions, and fallback.

Progress and stellar archetype selections last for the current page session. The chapter hub can reopen the current scene. There are no accounts or new analytics. Required content is written on screen. The two locally served reference clips are silent and user-initiated.

## Interaction review

| Interaction | Input, response and reset |
|---|---|
| Guided tour | Play advances after the authored dwell time. Pause stops stage timing and freezes the 3D frame. Scene arrows and the slider select a stage. |
| Free look | Drag or use arrow keys. The wheel, zoom buttons, and plus/minus keys adjust bounded zoom. Escape exits. Reset view restores the stage camera and preserves model selections. |
| Still mode | Prefers reduced motion by default. Scene arrows and static reading remain available. |
| Feature markers | Turn on Labels, activate a named marker, or use Inspect a feature. Selected features have an on-screen name and explanation. |
| Collision lab | Stick, Bounce, or Fragment selects a representative outcome. Replay restarts the illustration. The 2D diagram shows the selected result. |
| Lensing | The offset slider runs from 0 to 100 in model units. Exact alignment yields the challenge ring. The off-axis pulse shows order without computing a physical delay. |
| Evidence | Expand images in a dialog, play silent reference video on demand, or follow official source links. The Taurus image supports a larger scrollable view. |

## Asset and science review

The source page lists the evidence media, original links, published credits, rights basis, derived filenames, and scene placements. The source-backed scale table identifies the measurement convention for each numerical anchor. Raw source files were used to generate optimized web files. The original media remain available at their publishers’ links.

The specific SVS 4K approach and binary clips and the original optics diagram are linked references. The locally playable black-hole clip comes from NASA’s official edge-on visualisation. Its full source credit is shown next to the clip. The live Trace light guide is schematic.

## Acceptance and sign-off

Use modern desktop Chrome, Firefox, or Safari and supported mobile browsers as the device matrix. Check mobile and desktop with reduced motion, diagrams, and WebGL2. For performance sign-off measure the 36 stages, stage changes, and memory on the team’s selected real devices. Near 60 FPS on desktop and 30 FPS on mobile are evaluation targets. Independent science and device sign-off remain team review items.
