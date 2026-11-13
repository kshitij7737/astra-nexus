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
      ['Material returned by stars', 'A Sun-like star can shed glowing outer layers. A massive star can send material outward in a supernova. Compare their remnants.'],
      ['Inside a stellar nursery', 'In a separate process, gravity pulls a dense pocket of a cold cloud inward. Follow the material already in this nursery as it begins to collapse.'],
      ['First protostar', 'A young object gathers material through a rotating disk. Some protostars drive outflows along opposite poles.'],
      ['Back to the cloud', 'The protostar is still embedded in its nursery. Continue to see what happens once fusion begins.'],
    ],
  },
  {
    id: 'stars', short: 'Star life', title: 'A Star Through Time', accent: '#83e2bd', bg: '#123b4a',
    intro: 'Follow two illustrative stars from collapse to fusion and see how their masses shape their futures.',
    source: 'https://science.nasa.gov/exoplanets/stars/',
    science: 'A planetary nebula is expelled stellar gas. It is unrelated to planet formation. Massive stars can leave neutron stars or black holes, and some collapse with little visible explosion.',
    labels: ['Cloud', 'Rotating disk', 'Core', 'Stellar remnant'],
    beats: [
      ['A cold cloud', 'Stars begin in dense pockets of molecular clouds. The scene follows just one pocket.'],
      ['Collapse and spin', 'The core contracts under gravity. As rotating material falls inward, a flattened disk can develop.'],
      ['A protostar forms', 'The center warms and brightens while material still falls in. This stage precedes sustained hydrogen fusion.'],
      ['Hydrogen fusion', 'Outward pressure balances inward gravity during the main sequence. The force overlay shows the directions schematically.'],
      ['Two mass-dependent pathways', 'A Sun-like star can expand into a red giant. A much more massive star can become a supergiant before core collapse.'],
      ['Remnant and recycled gas', 'Compare a white dwarf inside a planetary nebula with the irregular ejecta of a supernova around a compact remnant.'],
    ],
  },
  {
    id: 'planets', short: 'Planet formation', title: 'Worlds From Dust', accent: '#9be5dc', bg: '#143747',
    intro: 'Take a closer look at the young-star disk from Part 02. Follow its dust and compare the planetary systems it could produce.',
    source: 'https://science.nasa.gov/exoplanets/how-do-planets-form/',
    science: 'The ice line moves as disk conditions evolve. Sticking, fragmentation, drift, gravity and migration can all change the outcome. A ring or gap in a real disk does not prove a planet is there.',
    labels: ['Young star', 'Dust midplane', 'Gas envelope', 'Growing bodies'],
    beats: [
      ['A young star and disk', 'A broad gas envelope surrounds a thinner midplane where dust is concentrated. Switch camera angles to see the thickness.'],
      ['Hot inside, cool outside', 'The water-ice line marks an approximate region where water ice can persist in this model. Its location changes with disk conditions.'],
      ['Collision lab', 'Magnified view: some grains stick on contact. Others bounce, scatter or break apart. This is a representative collision, with sizes exaggerated.'],
      ['Planetesimals', 'Larger solid bodies can grow and interact gravitationally. Planetesimals are building blocks of planets.'],
      ['Growing worlds', 'Rocky ingredients dominate in warmer regions. Farther out, cooler conditions can allow more ice and gas to accumulate.'],
      ['Compare possible systems', 'As gas and dust disperse, planets may have migrated from where they formed. Compare two examples, then return to the young-star timeline.'],
    ],
  },
  {
    id: 'black-holes', short: 'Black holes', title: 'A Closer Look at a Black Hole', accent: '#ffd39b', bg: '#183c4b',
    intro: 'Follow one stellar-mass formation pathway, then compare the boundary, the shadow and the evidence. Other black holes can form through different pathways.',
    source: 'https://science.nasa.gov/universe/black-holes/anatomy/',
    science: 'An event horizon is a boundary, not a surface. The apparent shadow is larger than the horizon. The disk, warped arc and jets are illustrative. Jets arise from processes outside the horizon.',
    labels: ['Shadow', 'Accretion disk', 'Lensed far side', 'Optional jets'],
    beats: [
      ['Find the invisible', 'Fast stellar orbits can reveal mass concentrated in a small space, even when that object emits no light.'],
      ['A stellar origin', 'A massive star’s core can collapse into a black hole. A bright supernova is one possible outcome, not a requirement.'],
      ['The event horizon', 'Beyond this boundary, light cannot escape to a distant observer. The apparent shadow is a larger region shaped by light bending and surrounding emission.'],
      ['Bright matter outside', 'Gas can become hot enough to radiate as it spirals inward. Some disks emit visible light, ultraviolet light or X-rays.'],
      ['A warped view', 'Bent light can bring the far side of the disk into view above and below the dark shadow. The appearance changes with viewing angle.'],
      ['What astronomers observe', 'Compare radio images of hot matter around M87* and Sagittarius A*. Stellar orbits and gravitational waves provide other kinds of evidence.'],
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
      ['One flash, different arrivals', 'Use the Brightness and Arrival time controls to compare two separate effects of lensing.'],
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
      ['Solar System', 'The Solar System has eight planets. Their surface maps use mission imagery. One astronomical unit is about 150 million km, roughly the Earth–Sun distance.'],
      ['Nearby stars', 'Proxima Centauri is about 4.2 light-years away. A light-year is a distance: how far light travels in one year.'],
      ['Milky Way', 'Our Solar System sits in a smaller arm feature within a barred spiral galaxy. The marker is approximate.'],
      ['Local Group', 'The Milky Way and Andromeda are the two largest galaxies in this gravitationally associated group.'],
      ['Cosmic web and horizon', 'Galaxies gather along filaments. The translucent horizon is a limit on what can be observed from here. Space may extend beyond it.'],
    ],
  },
];

export const lensNames = { star: 'star', blackHole: 'black hole', galaxy: 'galaxy', cluster: 'galaxy cluster' };

export const initialSettings = {
  branch: 'sun', collision: 'stick', feature: '', trace: false, binary: false, lensLesson: 'brightness', infrared: false, forces: false, angle: 'oblique', thermal: false, paths: true,
  system: 'mixed', mass: 'stellar', jets: false, evidence: 'orbits', alignment: 66,
  lens: 'galaxy', observer: false, magnify: false, scale: true, compare: false,
};

export function lensState(alignment, lens) {
  const offset = Number(alignment) / 100;
  const radius = { star: 0.6, blackHole: 0.78, galaxy: 1, cluster: 1.32 }[lens];
  const root = Math.hypot(offset, 2 * radius);
  return { offset, radius, images: [(offset + root) / 2, (offset - root) / 2],
    appearance: offset === 0 ? 'Einstein ring' : offset <= 0.38 ? 'Stretched arcs' : 'Two images' };
}
