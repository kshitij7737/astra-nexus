// NEXUS//04 game data. Every value is labelled:
//   published  = stated by NASA (source key in SOURCES of data.js)
//   team       = ASTRA team research documents (game design values)
//   conceptual = chosen for gameplay balance, not a NASA value
// Component sizes follow the LUNARIS design document (Small / Large options).

export const G0 = 9.80665;
export const ISP = 300; // s, conceptual (LUNARIS Part 7)

export const COMMON = {
  bus: { kg: 160, w: 180, cr: 250, label: 'Spacecraft bus', tag: 'team' },
  propHardware: { kg: 40, cr: 60, tag: 'team' },
  budget: 1200, // credits, team
  propCostPerKg: 1, // credits, conceptual
  heaterW: 25, // extra load in eclipse, conceptual
  derating: 0.8, // array derating, team (LUNARIS Part 7)
  battEff: 0.9, // team
  radioEff: 0.8, // team
  options: {
    solar: [
      { id: 'S', label: 'Small', kg: 20, w: 1200, cr: 80 },
      { id: 'L', label: 'Large', kg: 30, w: 1800, cr: 140 },
    ],
    battery: [
      { id: 'S', label: 'Small', kg: 5, wh: 100, cr: 40 },
      { id: 'L', label: 'Large', kg: 10, wh: 500, cr: 90 },
    ],
    radio: [
      { id: 'S', label: 'Small', kg: 15, mbps: 2, w: 80, cr: 60 },
      { id: 'L', label: 'Large', kg: 20, mbps: 20, w: 100, cr: 120 },
    ],
    recorder: [
      { id: 'S', label: 'Small', kg: 2, gbit: 4, cr: 30 },
      { id: 'L', label: 'Large', kg: 5, gbit: 16, cr: 70 },
    ],
    launch: [
      { id: 'A', label: 'Launch A', wetKg: 550, cr: 180 },
      { id: 'B', label: 'Launch B', wetKg: 750, cr: 240 },
    ],
  },
};

const RANKS = [
  [95, 'Flight Director'], [80, 'Mission Lead'], [60, 'Flight Controller'], [40, 'Systems Engineer'], [0, 'Trainee'],
];
export const rankFor = s => RANKS.find(([min]) => s >= min)[1];
export const gradeFor = s => s >= 95 ? 'S' : s >= 80 ? 'A' : s >= 60 ? 'B' : s >= 40 ? 'C' : 'F';

// ---------------------------------------------------------------------------
export const GAME = {
  astra: {
    id: 'astra', budget: 1200, name: 'ASTRA', world: 'Apophis', owner: 'Sneha', accent: '#4aa8ff',
    tagline: 'Watch an asteroid change as Earth pulls on it.',
    body: { name: 'Apophis', radiusKm: 0.17, kind: 'asteroid' },
    solarAU: 1.0,
    // No gravity model: Apophis mass is not in the team's checked sources. Survey loop period is conceptual.
    orbitOptions: [
      { id: 'near', label: '5 km standoff', periodMin: 180, eclipse: 0, pass: [0.2, 0.28], contact: [0, 1], dataMul: 1.25, dvMaint: 80, note: 'Sharper data, more station-keeping' },
      { id: 'far', label: '20 km standoff', periodMin: 180, eclipse: 0, pass: [0.2, 0.28], contact: [0, 1], dataMul: 1.0, dvMaint: 30, note: 'Safer, softer images' },
    ],
    contactNote: 'Deep Space Network contact assumed for the whole loop (conceptual).',
    radioMul: 0.15, // deep-space link penalty, conceptual
    dvRequired: 450, // m/s rendezvous + operations, conceptual
    orbits: 14,
    flybyOrbit: 7, // close approach happens here (story beat)
    instruments: [
      { id: 'cam', name: 'Camera', heritage: 'OCAMS', kg: 18, w: 40, mbps: 12, cr: 90, src: 'apexUA' },
      { id: 'alt', name: 'Laser altimeter', heritage: 'OLA', kg: 20, w: 60, mbps: 0.5, cr: 90, src: 'apexUA' },
      { id: 'vis', name: 'Spectrometer', heritage: 'OVIRS', kg: 17, w: 30, mbps: 4, cr: 80, src: 'apexUA' },
      { id: 'tes', name: 'Thermal spectrometer', heritage: 'OTES', kg: 6, w: 15, mbps: 0.4, cr: 60, src: 'apexUA' },
    ],
    objectives: [
      { id: 'before', label: 'Map Apophis before the Earth pass', inst: ['cam', 'alt'], need: 20, phase: 'pre', w: 30 , why: "A close pass by Earth can change an asteroid's spin and maybe its surface. This map is the \"before\" picture." },
      { id: 'after', label: 'Map it again after the pass', inst: ['cam', 'alt'], need: 20, phase: 'post', w: 35 , why: "Comparing after with before shows what Earth's gravity changed. That is the main goal of NASA's real OSIRIS-APEX plan." },
      { id: 'surface', label: 'Read surface minerals and heat', inst: ['vis', 'tes'], need: 10, phase: 'all', w: 25 , why: "Colours and heat reveal what the surface is made of and how loose or rocky it is." },
    ],
    events: [
      { orbit: 5, title: 'Close approach in two loops',
        text: 'Earth\'s gravity will tug on Apophis on 13 April 2029. Navigation asks: hold position or pull back for the pass?',
        options: [
          { label: 'Pull back to a safe distance', effect: { skipPasses: 1 }, result: 'Safe and steady. You miss one survey loop.' },
          { label: 'Hold close and keep watching', effect: { dvCost: 120, dataBoost: 1.3, orbits: 2 }, result: 'Thrusters work hard to hold station. Data is richer, propellant margin shrinks.' },
        ] },
      { orbit: 10, title: 'Stir the surface?',
        text: 'NASA says OSIRIS-APEX may fire its thrusters near the surface to expose what lies below. Try it?',
        options: [
          { label: 'Fire thrusters near the surface', effect: { dvCost: 60, bonusData: { inst: 'vis', gbit: 1.5 } }, result: 'Dust lifts. The spectrometer catches fresh material.' },
          { label: 'Skip it, save propellant', effect: {}, result: 'You keep your margin.' },
        ] },
    ],
    challenges: [
      { orbit: 3, q: 'NASA says Apophis will pass about how far from Earth\'s surface?', a: ['About 32,000 km', 'About 384,000 km', 'About 3,200 km'], correct: 0, src: 'apophis',
        why: 'Closer than the ring of geosynchronous satellites, about 32,000 km.' },
      { orbit: 12, q: 'Why do scientists want "before" and "after" maps?', a: ['To see if Earth\'s gravity changed its spin or surface', 'To measure its colour change in sunlight', 'To check if it gained mass'], correct: 0, src: 'apexSvs',
        why: 'OSIRIS-APEX will look for physical changes caused by the encounter.' },
    ],
    discoveries: [
      { id: 'a1', title: 'A once-in-7,500-years visit', text: 'Asteroids this size pass this close about once every 7,500 years (scientists\' estimate).', src: 'apexUA', unlock: 'before' },
      { id: 'a2', title: 'Visible without a telescope', text: 'The 2029 pass should be visible from the Eastern Hemisphere with the naked eye.', src: 'apophisFacts', unlock: 'after' },
      { id: 'a3', title: 'A second asteroid for a veteran', text: 'OSIRIS-APEX is the spacecraft that returned a sample from Bennu in 2023.', src: 'apophisFacts', unlock: 'surface' },
    ],
    compare: [
      ['Reference spacecraft', 'OSIRIS-APEX (formerly OSIRIS-REx)', 'apophisFacts'],
      ['Apophis size', 'About 340 m wide', 'apophisFacts'],
      ['Arrival', 'Shortly after the April 2029 pass', 'apexSvs'],
    ],
    whatIf: 'In real life OSIRIS-APEX arrives just after the close approach. ASTRA imagines an earlier arrival so you can see before and after.',
  },

  lunaris: {
    id: 'lunaris', budget: 1300, name: 'LUNARIS', world: 'Moon', owner: 'Karishma', accent: '#9fe0ea',
    tagline: 'Read the coldest craters on the Moon.',
    body: { name: 'Moon', radiusKm: 1737.4, mu: 4900, kind: 'moon' },
    solarAU: 1.0,
    orbitOptions: [
      { id: '50', label: '50 km orbit', altKm: 50, pass: [0.30, 0.36], contact: [0.0, 0.5], dataMul: 1.25, dvMaint: 200, note: 'LRO mapping altitude, sharper' },
      { id: '100', label: '100 km orbit', altKm: 100, pass: [0.30, 0.36], contact: [0.0, 0.5], dataMul: 1.0, dvMaint: 80, note: 'Team game orbit' },
    ],
    contactNote: 'Earth contact for half of each orbit (conceptual).',
    radioMul: 1,
    dvRequired: 800, // m/s lunar orbit insertion, conceptual (LRO budget was 1,270 m/s per team doc)
    orbits: 14,
    instruments: [
      { id: 'cam', name: 'Camera', heritage: 'LROC', kg: 12, w: 30, mbps: 12, cr: 90, src: 'lroNtrs' },
      { id: 'alt', name: 'Laser altimeter', heritage: 'LOLA', kg: 14, w: 35, mbps: 0.5, cr: 80, src: 'lroSys' },
      { id: 'rad', name: 'Radiometer', heritage: 'Diviner', kg: 10, w: 25, mbps: 1, cr: 70, src: 'lroSys' },
      { id: 'sar', name: 'Radar', heritage: 'Mini-RF', kg: 15, w: 110, mbps: 16, cr: 110, src: 'lroInst' },
      { id: 'neu', name: 'Neutron detector', heritage: 'LEND', kg: 20, w: 15, mbps: 0.15, cr: 60, src: 'lroInst' },
    ],
    objectives: [
      { id: 'terrain', label: 'Image the crater and its rim', inst: ['cam', 'alt'], need: 14, phase: 'all', w: 30 , why: "Detailed images and heights show the shape of craters near the pole that sunlight never reaches." },
      { id: 'temp', label: 'Map its temperature', inst: ['rad'], need: 1.5, phase: 'all', w: 30 , why: "Ground this cold can trap ice for billions of years. LRO's Diviner measured some of the coldest temperatures in the Solar System here." },
      { id: 'ice', label: 'Look for signs of ice', inst: ['sar', 'neu'], need: 6, phase: 'all', w: 30 , why: "Radar and neutron readings can hint at ice. They are clues, not proof: confirming ice needs more than one method." },
    ],
    events: [
      { orbit: 4, title: 'Low sun over the rim',
        text: 'Sunlight is grazing Shackleton\'s rim this orbit. The camera could catch long shadows that show the slopes.',
        options: [
          { label: 'Extend the imaging pass', effect: { bonusData: { inst: 'cam', gbit: 2 }, battCost: 60 }, result: 'Long shadows recorded. Battery took a hit.' },
          { label: 'Stay on plan', effect: {}, result: 'Steady as she goes.' },
        ] },
      { orbit: 9, title: 'Ground antenna reassigned',
        text: 'A higher-priority mission needs the antenna. Your next two contacts are cut in half.',
        options: [
          { label: 'Compress data (lossy, smaller files)', effect: { compress: 0.6, orbits: 2, value: 0.85 }, result: 'Files shrink. A little detail is lost.' },
          { label: 'Wait it out', effect: { contactMul: 0.5, orbits: 2 }, result: 'Data piles up on the recorder.' },
        ] },
    ],
    challenges: [
      { orbit: 3, q: 'Why can ice survive in permanently shadowed craters?', a: ['They never see sunlight, so they stay extremely cold', 'Lunar gravity is strongest there', 'The exosphere is thicker at the poles'], correct: 0, src: 'lroInst',
        why: 'No direct sunlight means cold traps. Diviner has measured about 35 K in some.' },
      { orbit: 11, q: 'Your radar sees a bright echo. Can you announce "ice found here"?', a: ['No. A claim about one crater needs direct measurement', 'Yes, radar echoes always mean ice'], correct: 0, src: 'lroInst',
        why: 'Rough rock can also echo brightly. Claims need more than one line of evidence.' },
    ],
    discoveries: [
      { id: 'l1', title: 'About 35 kelvin', text: 'Diviner has measured temperatures down to about 35 K inside shadowed craters.', src: 'lroSys', unlock: 'temp' },
      { id: 'l2', title: 'The longest watch', text: 'LRO launched in June 2009 and is the longest-lived lunar orbiter.', src: 'lro', unlock: 'terrain' },
      { id: 'l3', title: 'Hunting hydrogen', text: 'LEND counts neutrons to map hydrogen, a possible sign of ice.', src: 'lroInst', unlock: 'ice' },
    ],
    compare: [
      ['Reference spacecraft', 'Lunar Reconnaissance Orbiter', 'lro'],
      ['LRO mapping orbit', 'About 50 km polar orbit', 'lroInst'],
      ['LRO instruments', 'Seven, including Mini-RF', 'lroNtrs'],
    ],
  },

  earth: {
    id: 'earth', budget: 1100, name: 'HALO', world: 'Earth', owner: 'Kshitij', accent: '#a78bfa',
    tagline: 'Watch the thin blue line that keeps us alive.',
    body: { name: 'Earth', radiusKm: 6371, mu: 398600, kind: 'earth' },
    solarAU: 1.0,
    orbitOptions: [
      { id: '705', label: '705 km sun-synchronous', altKm: 705, pass: [0.15, 0.24], contact: [0.30, 0.40], dataMul: 1.0, dvMaint: 60, note: 'Aura heritage orbit' },
      { id: '500', label: '500 km', altKm: 500, pass: [0.15, 0.23], contact: [0.30, 0.38], dataMul: 1.1, dvMaint: 140, note: 'Sharper, more drag to fight' },
    ],
    contactNote: 'One ground-station pass per orbit (conceptual).',
    radioMul: 1,
    dvRequired: 120, // m/s orbit maintenance, conceptual (launcher delivers to orbit)
    orbits: 16,
    instruments: [
      { id: 'img', name: 'Imager', heritage: 'MODIS', kg: 22, w: 45, mbps: 10, cr: 100, src: 'modis' },
      { id: 'uv', name: 'UV spectrometer', heritage: 'OMI', kg: 16, w: 35, mbps: 1.0, cr: 80, src: 'omiData' },
      { id: 'ir', name: 'Infrared sounder', heritage: 'AIRS', kg: 25, w: 60, mbps: 3, cr: 100, src: 'airs' },
      { id: 'limb', name: 'Limb sounder', heritage: 'MLS', kg: 18, w: 50, mbps: 1, cr: 70, src: 'aura' },
    ],
    objectives: [
      { id: 'aerosol', label: 'Track dust and haze', inst: ['img', 'uv'], need: 8, phase: 'all', w: 30 , why: "Dust and haze change how much sunlight reaches the ground and affect the air we breathe." },
      { id: 'ozone', label: 'Measure ozone over Antarctica', inst: ['uv', 'limb'], need: 1.8, phase: 'all', w: 30 , why: "The ozone layer blocks harmful ultraviolet light. Satellites track the Antarctic ozone hole every southern spring." },
      { id: 'profile', label: 'Profile temperature and water vapour', inst: ['ir'], need: 3, phase: 'all', w: 30 , why: "Temperature and water vapour at different heights drive the weather and feed forecasts." },
    ],
    events: [
      { orbit: 4, title: 'Clouds over the Indo-Gangetic Plain',
        text: 'Thick cloud blocks the imager\'s view of haze. The UV spectrometer can still sense absorbing aerosols above clouds.',
        options: [
          { label: 'Switch to UV aerosol mode', effect: { bonusData: { inst: 'uv', gbit: 0.6 } }, result: 'Smart call. UV sees what the imager cannot.' },
          { label: 'Wait for clear skies', effect: { skipInst: 'img', orbits: 1 }, result: 'One orbit of imager data lost to cloud.' },
        ] },
      { orbit: 10, title: 'Ozone season',
        text: 'Each southern spring, ozone over Antarctica drops. Dedicate extra passes?',
        options: [
          { label: 'Yes, prioritise ozone', effect: { bonusData: { inst: 'uv', gbit: 0.8 }, battCost: 40 }, result: 'Extra ozone coverage logged.' },
          { label: 'Keep the normal plan', effect: {}, result: 'Plan unchanged.' },
        ] },
    ],
    challenges: [
      { orbit: 3, q: 'MODIS on Terra and Aqua covers the whole Earth how often?', a: ['Every 1 to 2 days', 'Once a month', 'Every hour'], correct: 0, src: 'modis',
        why: 'Wide swaths give near-global coverage every one to two days.' },
      { orbit: 12, q: 'A pixel shows no aerosol value. What should the map do?', a: ['Show it as missing, not zero', 'Fill it with zero', 'Copy the neighbour'], correct: 0, src: 'omiData',
        why: 'Missing data is not clean air. Treating gaps as zero is a classic error.' },
    ],
    discoveries: [
      { id: 'e1', title: 'Seeing above the clouds', text: 'OMI maps ozone, NO2, SO2 and aerosols with 13 x 24 km pixels.', src: 'omiData', unlock: 'ozone' },
      { id: 'e2', title: 'A planet every two days', text: 'MODIS sees the whole Earth every 1 to 2 days in 36 bands.', src: 'modis', unlock: 'aerosol' },
      { id: 'e3', title: '2,378 channels', text: 'AIRS splits infrared light into 2,378 channels to profile the air.', src: 'airs', unlock: 'profile' },
    ],
    compare: [
      ['Reference spacecraft', 'NASA Aura (A-Train)', 'aura'],
      ['Aura orbit', '705 km sun-synchronous, launched 2004', 'aura'],
      ['MODIS coverage', 'Whole Earth every 1 to 2 days', 'modis'],
    ],
  },

  mars: {
    id: 'mars', budget: 1400, name: 'JEZERO ECHO', world: 'Mars', owner: 'Anthariksha', accent: '#d0674c', accent2: '#a9d4ff',
    tagline: 'Read an ancient lake from orbit.',
    body: { name: 'Mars', radiusKm: 3389.5, mu: 42828, kind: 'mars' },
    solarAU: 1.524,
    orbitOptions: [
      { id: '300', label: '300 km orbit', altKm: 300, pass: [0.28, 0.34], contact: [0.0, 0.35], dataMul: 1.2, dvMaint: 150, note: 'Sharper images' },
      { id: '400', label: '400 km orbit', altKm: 400, pass: [0.28, 0.35], contact: [0.0, 0.37], dataMul: 1.0, dvMaint: 80, note: 'Gentler on fuel' },
    ],
    contactNote: 'Deep Space Network pass each orbit; rates reduced for Mars distance (conceptual).',
    radioMul: 0.3, // conceptual; MRO peak was 6 Mb/s (published)
    dvRequired: 700, // m/s Mars orbit insertion, conceptual; assumes aerobraking finishes the job, as MRO did
    orbits: 14,
    instruments: [
      { id: 'ctx', name: 'Context camera', heritage: 'CTX', kg: 4, w: 10, mbps: 4, cr: 70, src: 'ctxMsss' },
      { id: 'hir', name: 'High-res camera', heritage: 'HiRISE', kg: 65, w: 60, mbps: 14, cr: 160, src: 'mroHuman' },
      { id: 'cri', name: 'Mineral spectrometer', heritage: 'CRISM', kg: 33, w: 45, mbps: 6, cr: 120, src: 'mroUsgs' },
      { id: 'uhf', name: 'Relay radio', heritage: 'Electra', kg: 12, w: 30, mbps: 0.5, cr: 60, src: 'mroInst' },
    ],
    objectives: [
      { id: 'context', label: 'Map Jezero in context', inst: ['ctx'], need: 3, phase: 'all', w: 25 , why: "A wide map shows Jezero's rim, the old river channel and the fan-shaped delta together." },
      { id: 'delta', label: 'Zoom into the river delta', inst: ['hir'], need: 5, phase: 'all', w: 35 , why: "Layers in the delta look like sediment dropped by flowing water, evidence that a lake once filled the crater." },
      { id: 'minerals', label: 'Find water-formed minerals', inst: ['cri'], need: 3, phase: 'all', w: 30 , why: "Clays and carbonates form in water. Spotting them from orbit supports the ancient-lake idea and helped choose Jezero for Perseverance." },
    ],
    events: [
      { orbit: 4, title: 'Dust storm rising',
        text: 'A regional dust storm is building over Jezero. Images will be hazy for two orbits.',
        options: [
          { label: 'Pause imaging, save power', effect: { skipPasses: 2, battBonus: true }, result: 'Batteries stay topped up while the dust settles.' },
          { label: 'Image anyway', effect: { value: 0.5, orbits: 2 }, result: 'Data collected, but half of it is too hazy to use.' },
        ] },
      { orbit: 8, title: 'Perseverance calling',
        text: 'The rover below has fresh data and asks for a relay. It will use part of your next contact.',
        options: [
          { label: 'Relay the rover\'s data', effect: { contactMul: 0.7, orbits: 1, relay: true }, result: 'Rover data on its way to Earth. Teamwork across worlds.' },
          { label: 'Decline, protect your own downlink', effect: {}, result: 'Your bandwidth stays yours.' },
        ] },
    ],
    challenges: [
      { orbit: 3, q: 'Why pair a context camera with a high-resolution camera?', a: ['Wide images show where the close-ups fit', 'They use the same detector', 'To double the data rate'], correct: 0, src: 'ctxMsss',
        why: 'CTX maps wide strips so HiRISE close-ups have context.' },
      { orbit: 11, q: 'A delta in a crater suggests what?', a: ['A river once flowed into a lake', 'A volcano erupted there', 'Wind carved it recently'], correct: 0, src: 'mroUsgs',
        why: 'Jezero\'s delta formed where an ancient river met a lake.' },
    ],
    discoveries: [
      { id: 'm1', title: 'Sharpest eye at Mars', text: 'HiRISE resolves 25 to 30 cm per pixel from orbit.', src: 'mroHuman', unlock: 'delta' },
      { id: 'm2', title: 'An ancient lake', text: 'Jezero crater held a lake with a river delta. Perseverance landed there.', src: 'mroUsgs', unlock: 'context' },
      { id: 'm3', title: 'Signals across worlds', text: 'MRO\'s Electra radio relays data from rovers on the surface.', src: 'mroInst', unlock: 'minerals' },
    ],
    compare: [
      ['Reference spacecraft', 'Mars Reconnaissance Orbiter', 'mroUsgs'],
      ['MRO power', 'About 2 kW from twin arrays', 'mroHuman'],
      ['MRO downlink', 'Up to 6 Mb/s', 'mroHuman'],
    ],
  },
};
export const ORDER = ['astra', 'lunaris', 'earth', 'mars'];

// ---------------------------------------------------------------------------
// Difficulty. Every risk is shown to the player before it can hurt them.
export const DIFFICULTY = {
  cadet: { id: 'cadet', label: 'Cadet', blurb: 'Learn the ropes. No launch failures, no surprise faults, gentle damage.', launchRisk: 0, anomalies: [], timer: 0, dmg: 0.5, failBelow: 25, budgetMul: 1.1 },
  flight: { id: 'flight', label: 'Flight', blurb: 'The real thing. Overloaded rockets can fail. One fault to handle against the clock.', launchRisk: 1, anomalies: [6], timer: 15, dmg: 1, failBelow: 40, budgetMul: 1 },
  commander: { id: 'commander', label: 'Commander', blurb: 'Tight budget, three faults, 9 seconds to react. The spacecraft can die.', launchRisk: 2, anomalies: [2, 6, 13], timer: 9, dmg: 1.5, failBelow: 50, budgetMul: 0.96 },
};

// Spacecraft faults (scenario events). Each is modelled on a kind of fault real missions have handled.
// If the timer runs out, the last option (do nothing) is applied.
export const ANOMALIES = [
  { id: 'wheel', title: 'Reaction wheel fault', text: 'One reaction wheel is grinding and pointing is drifting. Kepler lost two of its four wheels this way.',
    options: [
      { label: 'Switch to thruster control', effect: { dvCost: 45 }, result: 'Pointing is steady again. It cost propellant.' },
      { label: 'Power-cycle the wheel', effect: { skipPasses: 1, battCost: 30 }, result: 'Wheel recovered after a reboot. One pass missed.' },
      { label: 'Ignore it', effect: { health: -40, value: 0.7, orbits: 2 }, result: 'The wheel seized. Images are blurred and the spacecraft is damaged.' },
    ] },
  { id: 'flare', title: 'Solar particle storm', text: 'A burst of energetic particles from the Sun is arriving. Electronics are at risk.',
    options: [
      { label: 'Safe the instruments', effect: { skipPasses: 1 }, result: 'Instruments rode it out switched off. One pass lost, no harm done.' },
      { label: 'Keep observing', effect: { health: -30 }, result: 'You kept collecting, but radiation damaged the electronics.' },
      { label: 'Do nothing', effect: { health: -45 }, result: 'The storm hit with everything running. Serious damage.' },
    ] },
  { id: 'bitflip', title: 'Recorder memory errors', text: 'Radiation is flipping bits in the recorder. Stored data is being corrupted.',
    options: [
      { label: 'Run error correction', effect: { battCost: 45, skipPasses: 1 }, result: 'Memory scrubbed. Battery and one pass spent.' },
      { label: 'Downlink fast, then wipe', effect: { contactMul: 1.4, orbits: 1, health: -10 }, result: 'You pushed data home early. Minor wear on the radio.' },
      { label: 'Ignore it', effect: { health: -25, value: 0.6, orbits: 2 }, result: 'Corrupted files reached Earth. Some science is unusable.' },
    ] },
  { id: 'heater', title: 'Heater stuck on', text: 'A propellant-line heater will not switch off. It is draining the battery.',
    options: [
      { label: 'Switch to the backup circuit', effect: { battCost: 20 }, result: 'Backup heater online. Small battery cost.' },
      { label: 'Cut power to that zone', effect: { health: -15 }, result: 'Drain stopped, but a cold propellant line took some damage.' },
      { label: 'Let it run', effect: { battCost: 9999, health: -20 }, result: 'The battery drained flat.' },
    ] },
];

// Best tested build per mission and difficulty (searched over every combination of parts; see HANDOVER.md).
export const RECOMMENDED = {"astra": {"cadet": {"solar": "S", "battery": "S", "radio": "L", "recorder": "L", "launch": "A", "orbit": "far", "propKg": 60, "inst": ["cam", "vis"]}, "flight": {"solar": "S", "battery": "S", "radio": "L", "recorder": "L", "launch": "A", "orbit": "far", "propKg": 60, "inst": ["cam", "vis"]}, "commander": {"solar": "S", "battery": "S", "radio": "L", "recorder": "L", "launch": "A", "orbit": "far", "propKg": 60, "inst": ["cam", "vis"]}}, "lunaris": {"cadet": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "100", "propKg": 120, "inst": ["cam", "rad", "sar"]}, "flight": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "100", "propKg": 120, "inst": ["cam", "rad", "sar"]}, "commander": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "100", "propKg": 120, "inst": ["cam", "rad", "sar"]}}, "earth": {"cadet": {"solar": "S", "battery": "L", "radio": "L", "recorder": "S", "launch": "A", "orbit": "705", "propKg": 30, "inst": ["uv", "ir"]}, "flight": {"solar": "S", "battery": "L", "radio": "L", "recorder": "S", "launch": "A", "orbit": "705", "propKg": 30, "inst": ["uv", "ir"]}, "commander": {"solar": "S", "battery": "L", "radio": "L", "recorder": "S", "launch": "A", "orbit": "705", "propKg": 30, "inst": ["uv", "ir"]}}, "mars": {"cadet": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "400", "propKg": 120, "inst": ["ctx", "hir", "cri"]}, "flight": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "400", "propKg": 120, "inst": ["ctx", "hir", "cri"]}, "commander": {"solar": "S", "battery": "L", "radio": "L", "recorder": "L", "launch": "A", "orbit": "400", "propKg": 120, "inst": ["ctx", "hir", "cri"]}}};
