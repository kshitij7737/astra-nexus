export const chapters = [
  {
    id: 'nebula', short: 'Nebulae', title: 'Inside a Nebula', accent: '#c2aaff', bg: '#192650',
    intro: 'Look through a cloud of gas and dust to find the material from which stars begin.',
    source: 'https://spaceplace.nasa.gov/nebula/en/',
    science: 'Nebulae have different origins. The visible and infrared views here are illustrative encodings. Infrared observations can reveal young objects obscured at visible wavelengths.',
    labels: ['Gas filaments', 'Dust ridge', 'Lit cavity', 'Dense core', 'Bipolar outflow'],
    beats: [
      ['Approach the cloud', 'A nebula is a vast cloud of gas and dust. Nearby filaments shift faster than the distant star field as you approach.'],
      ['Look through the dust', 'Dark dust blocks some background light. Hot stars can illuminate the edges of cavities in the cloud.'],
      ['How star material spreads', 'A Sun-like star can shed glowing outer layers. A massive star can send material outward in a supernova. Compare their remnants.'],
      ['Inside a stellar nursery', 'Gravity can pull a dense pocket of a cold molecular cloud inward while the surrounding cloud remains diffuse.'],
      ['First protostar', 'A young object gathers material through a rotating disk. Some protostars drive outflows along opposite poles.'],
      ['Back to the cloud', 'The protostar is still embedded in its nursery. Continue to see what happens once fusion begins.'],
    ],
  },
  {
    id: 'stars', short: 'Star life', title: 'A Star Through Time', accent: '#83e2bd', bg: '#123b4a',
    intro: 'Follow a star from collapse to fusion, then choose the ending its mass makes possible.',
    source: 'https://science.nasa.gov/exoplanets/stars/',
    science: 'A planetary nebula is expelled stellar gas. It is unrelated to planet formation. Massive stars can leave neutron stars or black holes, and some collapse with little visible explosion.',
    labels: ['Cloud', 'Rotating disk', 'Core', 'Stellar remnant'],
    beats: [
      ['A cold cloud', 'Stars begin in dense pockets of molecular clouds. The scene follows just one pocket.'],
      ['Collapse and spin', 'The core contracts under gravity. As rotating material falls inward, a flattened disk can develop.'],
      ['A protostar forms', 'The center warms and brightens while material still falls in. This stage precedes sustained hydrogen fusion.'],
      ['Hydrogen fusion', 'Outward pressure balances inward gravity during the main sequence. The force overlay shows the directions schematically.'],
      ['Two stellar futures', 'A Sun-like star can expand into a red giant. A much more massive star can become a supergiant before core collapse.'],
      ['Remnant and recycled gas', 'Compare a white dwarf inside a planetary nebula with the irregular ejecta of a supernova around a compact remnant.'],
    ],
  },
  {
    id: 'planets', short: 'Planet formation', title: 'Worlds From Dust', accent: '#9be5dc', bg: '#143747',
    intro: 'Watch solids grow inside a young star’s disk, then compare two possible planetary systems.',
    source: 'https://science.nasa.gov/exoplanets/how-do-planets-form/',
    science: 'The ice line moves as disk conditions evolve. Sticking, fragmentation, drift, gravity and migration can all change the outcome. A ring or gap in a real disk does not prove a planet is there.',
    labels: ['Young star', 'Dust midplane', 'Gas envelope', 'Growing bodies'],
    beats: [
      ['A young star and disk', 'A broad gas envelope surrounds a thinner midplane where dust is concentrated. Switch camera angles to see the thickness.'],
      ['Hot inside, cool outside', 'The water-ice line marks an approximate region where water ice can persist in this model. Its location changes with disk conditions.'],
      ['Collision lab', 'Magnified view: some grains stick on contact. Others bounce, scatter or break apart. This is a representative collision, with sizes exaggerated.'],
      ['Planetesimals', 'Larger solid bodies can grow and interact gravitationally. Planetesimals are building blocks of planets.'],
      ['Growing worlds', 'Rocky ingredients dominate in warmer regions. Farther out, cooler conditions can allow more ice and gas to accumulate.'],
      ['A disk clears', 'As gas and dust disperse, the remaining planets may have migrated from where they formed. Compare two illustrative outcomes.'],
    ],
  },
  {
    id: 'black-holes', short: 'Black holes', title: 'A Closer Look at a Black Hole', accent: '#ffd39b', bg: '#183c4b',
    intro: 'Read the motion of stars, hot matter and bent light around a dark center.',
    source: 'https://science.nasa.gov/universe/black-holes/anatomy/',
    science: 'An event horizon is a boundary, not a surface. The apparent shadow is larger than the horizon. The disk, warped arc and jets are illustrative. Jets arise from processes outside the horizon.',
    labels: ['Shadow', 'Accretion disk', 'Lensed far side', 'Optional jets'],
    beats: [
      ['Find the invisible', 'Fast stellar orbits can reveal mass concentrated in a small space, even when that object emits no light.'],
      ['A stellar origin', 'A massive star’s core can collapse into a black hole. A bright supernova is one possible outcome, not a requirement.'],
      ['The event horizon', 'Beyond this boundary, light cannot escape to a distant observer. The camera stays outside.'],
      ['Bright matter outside', 'Gas can become hot enough to radiate as it spirals inward. Some disks emit visible light, ultraviolet light or X-rays.'],
      ['A warped view', 'Bent light can bring the far side of the disk into view above and below the dark shadow. The appearance changes with viewing angle.'],
      ['A separate merger example', 'Two black holes can spiral together and emit gravitational waves. The rising trace illustrates a chirp, not detector data.'],
    ],
  },
  {
    id: 'lensing', short: 'Gravitational lensing', title: 'Light Bent by Gravity', accent: '#98e8fc', bg: '#174052',
    intro: 'Move a distant source and see how a foreground mass changes the image reaching an observer.',
    source: 'https://www.nasa.gov/missions/euclid/euclid-discovers-einstein-ring-in-our-cosmic-backyard/',
    science: 'This is an idealized symmetric lens. Real mass distributions can produce asymmetric arcs and several images. Image brightness and arrival-time differences depend on geometry and mass.',
    labels: ['★ Background source', '● Foreground lens', '▲ Observer'],
    beats: [
      ['Source, lens, observer', 'The distant galaxy stays behind the foreground lens. Use the alignment slider to move the source across the line of sight.'],
      ['Follow the light', 'Curved lines represent example light paths. They are a teaching overlay and would not appear as luminous tracks in space.'],
      ['Alignment and rings', 'A nearly aligned source can stretch into arcs. Ideal alignment in this symmetric model produces an Einstein ring.'],
      ['Multiple images', 'Off-axis light can reach the observer along different paths. The apparent images come from one source.'],
      ['Magnification and delay', 'Images can differ in brightness and can show the same flash at different times. Use the pulse control to see the idea.'],
      ['A tool for astronomy', 'Galaxies and clusters can act as natural lenses. Astronomers model the distortions to learn about mass and distant sources.'],
    ],
  },
  {
    id: 'universe', short: 'Universe tour', title: 'A Journey Across Cosmic Scales', accent: '#a7dedf', bg: '#173653',
    intro: 'Pull back from Earth and follow the scale markers to the limit of what we can observe.',
    source: 'https://science.nasa.gov/universe/galaxies/large-scale-structures/',
    extra: 'https://science.nasa.gov/missions/hubble/hubble-eyes-a-scale-of-the-universe/',
    science: 'The Milky Way’s outside view is reconstructed for illustration. Large-scale filaments are not all bound together. The observable horizon is centered on the observer and does not mark an edge of all space.',
    scales: ['Earth–Moon · 384,400 km mean distance', 'Solar System · astronomical units', 'Nearby stars · light-years', 'Milky Way · about 100,000 light-years across', 'Local Group · Andromeda about 2.5 million light-years away', 'Cosmic web · megaparsecs and beyond'],
    labels: ['Current anchor', 'Scale changes between scenes'],
    beats: [
      ['Earth and Moon', 'The Moon orbits Earth at an average distance of about 384,400 km. Their separation is compressed in this view.'],
      ['Solar System', 'The Sun anchors eight planetary orbits. One astronomical unit is about 150 million km, roughly the Earth–Sun distance.'],
      ['Nearby stars', 'Proxima Centauri is about 4.2 light-years away. A light-year is a distance: how far light travels in one year.'],
      ['Milky Way', 'Our Solar System sits in a smaller arm feature within a barred spiral galaxy. The marker is approximate.'],
      ['Local Group', 'The Milky Way and Andromeda are the two largest galaxies in this gravitationally associated group.'],
      ['Cosmic web and horizon', 'Galaxies gather along filaments. The translucent horizon is a limit on what can be observed from here. Space may extend beyond it.'],
    ],
  },
];

export const lensNames = { star: 'star', blackHole: 'black hole', galaxy: 'galaxy', cluster: 'galaxy cluster' };

export const initialSettings = {
  branch: 'sun', infrared: false, forces: false, angle: 'oblique', thermal: false, paths: true,
  system: 'mixed', mass: 'stellar', jets: false, evidence: 'orbits', alignment: 66,
  lens: 'galaxy', observer: false, magnify: false, scale: true, compare: false,
};

export function lensState(alignment, lens) {
  const offset = Number(alignment) / 100;
  const radius = { star: 0.6, blackHole: 0.78, galaxy: 1, cluster: 1.32 }[lens];
  const root = Math.hypot(offset, 2 * radius);
  return { offset, radius, images: [(offset + root) / 2, (offset - root) / 2],
    appearance: offset <= 0.03 ? 'Einstein ring' : offset <= 0.38 ? 'Stretched arcs' : 'Two images' };
}
