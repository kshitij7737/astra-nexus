// ASTRA mission science content. Every factual value carries a source key.
// Labels used across the site:
//   fact         published by NASA or an instrument team, source linked
//   derived      calculated from sourced inputs with the formula shown
//   illustrative artistic or simplified, not measured data
//   conceptual   ASTRA team design choice, not NASA flight hardware

export const SOURCES = {
  apophis: { title: 'NASA Science: Apophis', url: 'https://science.nasa.gov/solar-system/asteroids/apophis/' },
  apophisFacts: { title: 'NASA Science: Apophis Facts', url: 'https://science.nasa.gov/solar-system/asteroids/apophis-facts/' },
  apexSvs: { title: 'NASA SVS: Apophis 2029 Earth Flyby', url: 'https://svs.gsfc.nasa.gov/20414' },
  apexUA: { title: 'University of Arizona: OSIRIS-REx flies on as OSIRIS-APEX', url: 'https://news.arizona.edu/story/osiris-rex-flies-osiris-apex-explore-second-asteroid' },
  lro: { title: 'NASA Science: Lunar Reconnaissance Orbiter', url: 'https://science.nasa.gov/mission/lro/' },
  lroInst: { title: 'NASA Science: LRO Spacecraft and Instruments', url: 'https://science.nasa.gov/mission/lro/spacecraft-and-instruments/' },
  lroNtrs: { title: 'NASA NTRS: LRO instrument suite', url: 'https://ntrs.nasa.gov/citations/20110013489' },
  lroPds: { title: 'PDS Geosciences: LRO archive', url: 'https://pds-geosciences.wustl.edu/missions/lro/' },
  lroSys: { title: 'D. Everett, NASA GSFC: LRO Systems Overview (INCOSE 2010)', url: 'https://www.incose-cc.org/s/2010_06_16_Everett_LRO_Systems_Overview.pdf' },
  crater: { title: 'CRaTER on LRO (University of New Hampshire)', url: 'https://crater.unh.edu/' },
  modis: { title: 'NASA GSFC: MODIS on Terra and Aqua', url: 'https://ael.gsfc.nasa.gov/earth/acd/projects' },
  aura: { title: 'Schoeberl et al., Overview of the EOS Aura Mission (IEEE TGRS 2006)', url: 'https://typeset.io/pdf/overview-of-the-eos-aura-mission-4gli3401vb.pdf' },
  omiData: { title: 'NASA Earthdata: Aura data products', url: 'https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/aura/data-access-tools' },
  airs: { title: 'HAQAST: Pathfinder data tables for air quality', url: 'https://haqast.org/pathfinder-data-tables-for-air-quality/' },
  atrain: { title: 'NASA Climate: Earth missions (Aqua, Aura, Terra)', url: 'https://webarchive.library.unt.edu/web/20161224191722/http://climate.nasa.gov/nasa_role/missions' },
  power: { title: 'NASA POWER project', url: 'https://power.larc.nasa.gov/' },
  noaaLayers: { title: 'NOAA JetStream: Layers of the Atmosphere', url: 'https://www.noaa.gov/jetstream/atmosphere/layers-of-atmosphere' },
  mroUsgs: { title: 'USGS Astrogeology: MRO Mission', url: 'https://astrogeology.usgs.gov/docs/concepts/missions/mro' },
  ctxMsss: { title: 'Malin Space Science Systems: CTX description', url: 'https://www.msss.com/mro/ctx/ctx_description.html' },
  mroHuman: { title: 'Fieseler et al., MRO Capabilities in Support of Human Mars Missions', url: 'https://engrxiv.org/preprint/download/4921/8404/6980' },
  mroInst: { title: 'NASA JPL (archived): MRO Instruments', url: 'https://webarchive.library.unt.edu/web/20130316063209/http://mars.jpl.nasa.gov/mro/mission/instruments' },
  factEarth: { title: 'NASA NSSDCA: Earth Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html' },
  factMars: { title: 'NASA NSSDCA: Mars Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html' },
  factMoon: { title: 'NASA NSSDCA: Moon Fact Sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' },
};

export const MISSIONS = [
  {
    id: 'astra', name: 'ASTRA', display: 'ASTRA', subtitle: 'Asteroid Apophis encounter',
    reference: 'Science reference: NASA OSIRIS-APEX at asteroid 99942 Apophis',
    owner: 'Research: Sneha', color: 0xb9a68e, accent: '#4aa8ff', glow: 0x4aa8ff,
    vertical: '99942 APOPHIS · 13 APR 2029',
    hero: {
      kicker: 'The close pass',
      headline: 'A 340 metre asteroid will pass about 32,000 km from Earth in 2029.',
      lede: '13 April 2029. About 32,000 km from Earth\'s surface.',
    },
    factsHeadline: 'Close enough to see without a telescope.',
    summary: 'Visible from the Eastern Hemisphere with the naked eye.',
    facts: [
      { k: 'Size', v: '340 m wide, 450 m long', src: 'apophisFacts' },
      { k: 'Closest pass', v: '13 Apr 2029, ~32,000 km', src: 'apophis' },
      { k: 'Shape', v: 'Not fully known, likely two-lobed', src: 'apophisFacts' },
      { k: 'OSIRIS-APEX', v: 'Arrives just after the pass', src: 'apexSvs' },
    ],
    world: { kind: 'asteroid', note: 'Asteroid shape is illustrative. NASA says the shape is not fully known; swap in the team\'s PDS shape model once Task 4 is approved.' },
    targets: [
      { name: 'Close-approach geometry', lat: 0, lon: 0, frame: 'Illustrative body-fixed frame', units: 'none', desc: 'Earth\'s gravity may reshape Apophis during the pass.', src: 'apexSvs', kind: 'illustrative' },
      { name: 'Thruster-disturbed surface', lat: 25, lon: 110, frame: 'Illustrative body-fixed frame', units: 'none', desc: 'OSIRIS-APEX may fire thrusters to expose what lies below.', src: 'apophis', kind: 'illustrative' },
      { name: 'Long axis', lat: 0, lon: 180, frame: 'Illustrative body-fixed frame', units: 'none', desc: 'At least 450 m end to end.', src: 'apophisFacts', kind: 'illustrative' },
    ],
    instruments: [
      { name: 'OCAMS', full: 'OSIRIS-REx Camera Suite', purpose: 'Maps and navigates.', specs: [], src: 'apexUA' },
      { name: 'OLA', full: 'OSIRIS-REx Laser Altimeter', purpose: 'Builds a 3D height map.', specs: [], src: 'apexUA' },
      { name: 'OVIRS', full: 'Visible and Infrared Spectrometer', purpose: 'Finds minerals and organics.', specs: [], src: 'apexUA' },
      { name: 'OTES', full: 'Thermal Emission Spectrometer', purpose: 'Reads surface heat.', specs: [], src: 'apexUA' },
    ],
    spacecraft: {
      ref: 'OSIRIS-APEX (formerly OSIRIS-REx)', model: 'apex',
      parts: [
        { name: 'Main bus', note: 'Box-shaped spacecraft body carrying avionics and propellant. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'Solar arrays (2)', note: 'Provide electrical power. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'High-gain antenna', note: 'Dish antenna for Earth communication. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'Instrument deck', note: 'Carries the OCAMS, OLA, OVIRS and OTES science instruments.', kind: 'fact', src: 'apexUA' },
        { name: 'Sampling arm', note: 'Collected the Bennu sample that returned to Earth in September 2023.', kind: 'fact', src: 'apophisFacts' },
      ],
    },
  },
  {
    id: 'lunaris', name: 'LUNARIS', display: 'LUNARIS', subtitle: 'Lunar polar orbiter',
    reference: 'Science reference: NASA Lunar Reconnaissance Orbiter (LRO)',
    owner: 'Research: Karishma', color: 0xb8b8b8, accent: '#9fe0ea', glow: 0x9fe0ea,
    vertical: 'LRO · IN ORBIT SINCE 2009',
    hero: {
      kicker: 'The longest watch',
      headline: 'Mapping the Moon from orbit since 2009.',
      lede: 'Seven instruments. One orbiter. Based on NASA\'s LRO.',
    },
    factsHeadline: 'The darkest craters hold the coldest ground.',
    summary: 'Down to about 35 K inside shadowed craters.',
    facts: [
      { k: 'Launched', v: '18 June 2009, still active', src: 'lro' },
      { k: 'Record', v: 'Longest-lived lunar orbiter', src: 'lro' },
      { k: 'Coldest ground', v: '~35 K', src: 'lroSys' },
      { k: 'Water ice', v: 'Searched for, not confirmed', src: 'lroInst' },
    ],
    world: { kind: 'moon', note: 'Global colour map from Solar System Scope (CC BY 4.0), built from NASA LRO imagery. Relief is shading from the same map, not LOLA elevation.' },
    targets: [
      { name: 'Shackleton crater', lat: -89.9, lon: 0, frame: 'Mean Earth / polar axis (IAU), planetocentric', units: 'degrees', desc: 'Permanently shadowed south-pole crater.', src: 'lroInst', kind: 'fact' },
      { name: 'Apollo 11 site', lat: 0.674, lon: 23.473, frame: 'Mean Earth / polar axis (IAU), planetocentric', units: 'degrees', desc: 'LROC can see the hardware left behind.', src: 'lroInst', kind: 'fact' },
      { name: 'Tycho crater', lat: -43.3, lon: -11.2, frame: 'Mean Earth / polar axis (IAU), planetocentric', units: 'degrees', desc: 'Young crater with bright rays.', src: 'lroPds', kind: 'fact' },
    ],
    instruments: [
      { name: 'LROC', full: 'Lunar Reconnaissance Orbiter Camera', purpose: 'Surface images.', specs: [], src: 'lroNtrs' },
      { name: 'LOLA', full: 'Lunar Orbiter Laser Altimeter', purpose: 'Height and slope.', specs: [], src: 'lroSys' },
      { name: 'Diviner', full: 'Diviner Lunar Radiometer Experiment', purpose: 'Surface temperature.', specs: ['Temperatures down to ~35 K'], src: 'lroSys' },
      { name: 'LAMP', full: 'Lyman-Alpha Mapping Project', purpose: 'UV maps of dark craters.', specs: [], src: 'lroNtrs' },
      { name: 'LEND', full: 'Lunar Exploration Neutron Detector', purpose: 'Hunts for hydrogen.', specs: [], src: 'lroInst' },
      { name: 'CRaTER', full: 'Cosmic Ray Telescope for the Effects of Radiation', purpose: 'Measures radiation.', specs: [], src: 'lroSys' },
      { name: 'Mini-RF', full: 'Miniature Radio Frequency (technology demo)', purpose: 'Radar for hidden ice.', specs: [], src: 'lroInst' },
    ],
    spacecraft: {
      ref: 'Lunar Reconnaissance Orbiter', model: 'lro',
      parts: [
        { name: 'Spacecraft bus', note: 'Carries power, computer, propulsion and instruments. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'Solar array', note: 'Single deployable array. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'High-gain antenna', note: 'Dish for data downlink. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'Instrument module', note: 'Seven instruments, integrated at NASA Goddard.', kind: 'fact', src: 'lroNtrs' },
      ],
    },
  },
  {
    id: 'earth', name: 'HALO', display: 'EARTH', subtitle: 'Atmospheric observation satellite',
    reference: 'Science reference: NASA Terra, Aqua and Aura, plus NASA POWER',
    owner: 'Research: Kshitij', color: 0x2a6fd6, accent: '#a78bfa', glow: 0xa78bfa,
    vertical: 'AURA · 705 KM SUN-SYNCHRONOUS',
    hero: {
      kicker: 'The thin blue line',
      headline: 'Four layers of air, watched from 705 kilometres up.',
      lede: 'Aerosols, gases and clouds, seen by NASA\'s Terra, Aqua and Aura.',
    },
    factsHeadline: 'The whole planet, every one to two days.',
    summary: 'MODIS sees the whole surface in 36 bands.',
    facts: [
      { k: 'MODIS', v: 'Whole Earth every 1 to 2 days', src: 'modis' },
      { k: 'Aura', v: 'Launched 2004, 705 km orbit', src: 'aura' },
      { k: 'OMI', v: 'Ozone, NO2, SO2 at 13 x 24 km', src: 'omiData' },
      { k: 'NASA POWER', v: 'Surface solar and weather data', src: 'power' },
    ],
    world: { kind: 'earth', note: 'Day side: NASA Blue Marble. Night lights: NASA Black Marble. Clouds are a real cloud map. The atmosphere shells are exaggerated for visibility; real layer altitudes are in the text.' },
    layers: [
      { name: 'Troposphere', top: 'about 6 km at the poles to 20 km at the equator', note: 'Weather and clouds.' },
      { name: 'Stratosphere', top: 'about 50 km', note: 'The ozone layer.' },
      { name: 'Mesosphere', top: 'about 85 km', note: 'Meteors burn up.' },
      { name: 'Thermosphere', top: 'about 600 km', note: 'Satellites orbit here.' },
    ],
    targets: [
      { name: 'Indo-Gangetic Plain', lat: 27.0, lon: 80.0, frame: 'WGS84 geodetic', units: 'degrees', desc: 'Watched for aerosols and NO2.', src: 'omiData', kind: 'fact' },
      { name: 'Sahara dust source', lat: 23.0, lon: 10.0, frame: 'WGS84 geodetic', units: 'degrees', desc: 'A major source of desert dust.', src: 'modis', kind: 'fact' },
      { name: 'Antarctic ozone', lat: -80.0, lon: 0.0, frame: 'WGS84 geodetic', units: 'degrees', desc: 'Seasonal ozone loss.', src: 'aura', kind: 'fact' },
    ],
    instruments: [
      { name: 'MODIS', full: 'Moderate Resolution Imaging Spectroradiometer', purpose: 'Clouds, aerosols, fires.', specs: ['36 bands'], src: 'modis' },
      { name: 'OMI', full: 'Ozone Monitoring Instrument (Aura)', purpose: 'Ozone and pollutant gases.', specs: ['13 x 24 km pixels'], src: 'omiData' },
      { name: 'AIRS', full: 'Atmospheric Infrared Sounder (Aqua)', purpose: 'Temperature and humidity.', specs: ['2,378 channels'], src: 'airs' },
      { name: 'MLS', full: 'Microwave Limb Sounder (Aura)', purpose: 'Gases by altitude.', specs: [], src: 'aura' },
      { name: 'POWER', full: 'NASA Prediction Of Worldwide Energy Resources', purpose: 'A dataset, not an instrument.', specs: [], src: 'power' },
    ],
    spacecraft: {
      ref: 'NASA Aura (reference). The ASTRA Earth satellite itself is conceptual', model: 'aura',
      parts: [
        { name: 'Spacecraft bus', note: 'Aura launched in 2004 into a 705 km sun-synchronous orbit.', kind: 'fact', src: 'aura' },
        { name: 'Solar array', note: 'Single wing. Geometry is illustrative.', kind: 'illustrative' },
        { name: 'Nadir instrument (OMI-like)', note: 'Points straight down to measure trace gases.', kind: 'fact', src: 'aura' },
        { name: 'Limb sounder (MLS-like)', note: 'Looks forward at the edge of the atmosphere.', kind: 'fact', src: 'aura' },
      ],
    },
  },
  {
    id: 'mars', name: 'JEZERO ECHO', display: 'MARS', subtitle: 'Jezero-focused reconnaissance orbiter',
    reference: 'Science reference: NASA Mars Reconnaissance Orbiter (MRO)',
    owner: 'Research: Anttariksha', color: 0xc1440e, accent: '#d0674c', glow: 0xd0674c,
    vertical: 'JEZERO · 18.38° N 77.58° E',
    hero: {
      kicker: 'The dry lake',
      headline: 'An ancient lake, read from orbit.',
      lede: 'Jezero crater, studied by an orbiter modelled on NASA\'s MRO.',
    },
    factsHeadline: 'Up to 25 centimetres per pixel, from Mars orbit.',
    summary: 'HiRISE is still the sharpest camera at Mars.',
    facts: [
      { k: 'Launched', v: '2005, still working', src: 'mroUsgs' },
      { k: 'Power', v: 'About 2 kW', src: 'mroHuman' },
      { k: 'Downlink', v: 'Up to 6 Mb/s', src: 'mroHuman' },
      { k: 'Relay', v: 'Passes on rover data', src: 'mroInst' },
    ],
    world: { kind: 'mars', note: 'Global colour map from Solar System Scope (CC BY 4.0), built from NASA Viking and MGS data. Relief is shading from the same map, not MOLA elevation.' },
    targets: [
      { name: 'Jezero crater', lat: 18.38, lon: 77.58, frame: 'Mars planetocentric, east-positive', units: 'degrees', desc: 'Ancient lake. Perseverance landed here.', src: 'mroUsgs', kind: 'fact' },
      { name: 'Valles Marineris', lat: -14.0, lon: -59.2, frame: 'Mars planetocentric, east-positive', units: 'degrees', desc: 'Vast canyon with layered walls.', src: 'mroInst', kind: 'fact' },
      { name: 'Olympus Mons', lat: 18.65, lon: -133.8, frame: 'Mars planetocentric, east-positive', units: 'degrees', desc: 'Largest volcano in the solar system.', src: 'factMars', kind: 'fact' },
    ],
    instruments: [
      { name: 'HiRISE', full: 'High Resolution Imaging Science Experiment', purpose: 'Sharpest camera at Mars.', specs: ['25 to 30 cm pixels'], src: 'mroHuman' },
      { name: 'CTX', full: 'Context Camera', purpose: 'Wide context images.', specs: ['6 m pixels'], src: 'ctxMsss' },
      { name: 'CRISM', full: 'Compact Reconnaissance Imaging Spectrometer for Mars', purpose: 'Maps minerals. Off since 2023.', specs: [], src: 'mroUsgs' },
      { name: 'SHARAD', full: 'Shallow Radar', purpose: 'Radar for buried ice.', specs: [], src: 'mroInst' },
      { name: 'MCS', full: 'Mars Climate Sounder', purpose: 'Temperature and dust.', specs: [], src: 'mroInst' },
      { name: 'MARCI', full: 'Mars Color Imager', purpose: 'Daily weather camera.', specs: [], src: 'mroUsgs' },
    ],
    spacecraft: {
      ref: 'Mars Reconnaissance Orbiter', model: 'mro',
      parts: [
        { name: 'Solar arrays (2)', note: 'Articulating arrays, about 2 kW.', kind: 'fact', src: 'mroHuman' },
        { name: 'High-gain antenna', note: '3 m dish, X-band, up to 6 Mb/s to the Deep Space Network.', kind: 'fact', src: 'mroHuman' },
        { name: 'HiRISE telescope', note: 'Large camera on the nadir deck.', kind: 'fact', src: 'mroHuman' },
        { name: 'Electra UHF', note: 'Relay radio for surface missions.', kind: 'fact', src: 'mroInst' },
      ],
    },
  },
];

// Conceptual builder. Only quantities with a documented formula and sourced
// constant produce numbers; everything else is shown as unavailable.
export const BUILDER = {
  solarConstant: { value: 1361, src: 'factEarth' },
  marsIrradiance: { value: 586.2, src: 'factMars' },
  arrayArea: { min: 2, max: 20, def: 8 },
  cellEff: [
    { label: 'Silicon (about 15%)', value: 0.15 },
    { label: 'Triple-junction GaAs (about 29%)', value: 0.29 },
  ],
  effNote: 'Cell efficiencies are typical teaching values; cite a datasheet before treating them as final.',
  dataVolume: { min: 1, max: 200, def: 40 },
  linkRates: [
    { label: 'X-band 6 Mb/s (MRO maximum)', value: 6, src: 'mroHuman' },
    { label: 'Conceptual 1 Mb/s', value: 1, src: null },
    { label: 'Conceptual 20 Mb/s', value: 20, src: null },
  ],
  instruments: ['Camera', 'Spectrometer', 'Laser altimeter', 'Radar', 'Radiometer'],
};

// Sourced constants for the orbital-period check (NSSDCA fact sheets).
export const BODIES = {
  earth: { mu: 398600, r: 6371.0, src: 'factEarth', def: 705, min: 200, max: 1000 },
  lunaris: { mu: 4900, r: 1737.4, src: 'factMoon', def: 50, min: 20, max: 200 },
  mars: { mu: 42828, r: 3389.5, src: 'factMars', def: 300, min: 200, max: 1000 },
};
