export const sceneIds = {
  nebula:['approach','dust','stellar-material','nursery','protostar','return'],
  stars:['cloud','collapse','protostar','fusion','futures','remnant'],
  planets:['disk','temperature','collisions','planetesimals','protoplanets','systems'],
  'black-holes':['find','origin','horizon','disk','warped-light','evidence'],
  lensing:['geometry','paths','alignment','images','delay','applications'],
  universe:['earth-moon','solar-system','nearby-stars','milky-way','local-group','horizon'],
};

export const summaries = {
  nebula:['Nebulae have different origins. Stars return material to space, and a separate collapse process can turn part of a cloud into a new star.','Continue with the protostar in A Star Through Time.'],
  stars:['A star’s mass helps determine its evolution. The two examples follow different stars through fusion and toward different remnants.','Revisit the young-star disk or follow the massive-star connection to black holes.'],
  planets:['Growth depends on collisions, disk conditions and gravity. Different starting conditions can produce different systems.','Return to the protostar stage of the stellar timeline.'],
  'black-holes':['The event horizon is a boundary. The shadow, hot gas, stellar motions and waves provide distinct ways to study black holes.','Use a different lens in Light Bent by Gravity.'],
  lensing:['The same background source can produce multiple images. Brightness and arrival time are separate effects.','Compare this geometry with the distances in the scale tour.'],
  universe:['A single view cannot show sizes and distances faithfully from Earth to the cosmic web. The observable horizon depends on the observer.','If you observed the universe from Andromeda, where would the center of your observable region be?'],
};

export const scales = [
  ['Earth to Moon','384,400 km','Mean orbital distance, center to center.','https://science.nasa.gov/moon/facts/'],
  ['Astronomical unit','149,597,870.7 km','Exact IAU definition. Earth’s distance from the Sun varies during its orbit.','https://iau-a3.gitlab.io/res.html'],
  ['Sun to Proxima Centauri','About 4.2 light-years','Approximate distance to the closest star beyond the Sun.','https://science.nasa.gov/asset/hubble/hubble-image-of-proxima-centauri/'],
  ['Milky Way stellar disk','About 100,000 light-years','Approximate disk diameter. Its diffuse halo extends farther.','https://science.nasa.gov/photojournal/amazing-andromeda-galaxy/'],
  ['Earth to Andromeda','About 2.5 million light-years','Approximate distance from Earth to the galaxy.','https://science.nasa.gov/asset/hubble/compass-and-scale-image-of-andromeda/'],
  ['Observable horizon','Observer-centered guide','The illustration shows an observing limit. In an expanding universe, light travel time and present-day distance are different quantities.','https://science.nasa.gov/universe/galaxies/large-scale-structures/'],
];

export const collisions = {
  stick:['Stick','Slow contact can let small grains adhere. The two example grains remain together.'],
  bounce:['Bounce','Some particles rebound and remain separate. Speed, composition and structure affect the outcome.'],
  fragment:['Fragment','An energetic impact can break the colliding solids into smaller pieces.'],
};

export const features = {
  nebula:[
    ['gas','Gas filaments','Thin, irregular ridges trace gas lit by nearby stars.'],
    ['dust','Dust ridge','Dense dust can absorb and scatter visible light.'],
    ['cavity','Lit cavity','Radiation and outflows can clear cavities and light up their edges.'],
    ['core','Dense core','A dense part of a cold cloud can collapse under gravity.'],
    ['jets','Bipolar jets','Some protostars drive narrow outflows along the disk axis.'],
  ],
  stars:[
    ['cloud','Molecular cloud','A cold cloud supplies gas and dust.'],
    ['core','Dense core','As the core contracts, its rotation can become more noticeable.'],
    ['disk','Protostellar disk','Rotating material around the young star can settle into a disk.'],
    ['fusion','Fusion core','During the main sequence, hydrogen fusion powers the star.'],
  ],
  planets:[
    ['star','Young star','The star heats the surrounding disk most strongly close to the center.'],
    ['dust','Dust lane','Solid particles collect in a thinner layer around the disk’s midplane.'],
    ['gap','Ring or gap','Planets can shape gaps, and other disk processes can produce them too.'],
    ['protoplanet','Growing body','A protoplanet can gain material from its surroundings.'],
    ['orbit','Orbit','Orbit paths here show possible arrangements in compressed scale.'],
  ],
  'black-holes':[
    ['horizon','Event horizon','The event horizon is the boundary beyond which light cannot escape. The dotted guide is schematic.'],
    ['shadow','Apparent shadow','An observed dark region appears larger than the event horizon because gravity bends surrounding light.'],
    ['disk','Accretion disk','Orbiting matter can heat up and emit light outside the horizon.'],
    ['ring','Photon ring','Light can loop around the black hole and contribute narrow features near the shadow.'],
    ['far','Far-side disk image','Bent rays can make the far side of the disk visible above the shadow.'],
    ['beaming','Brightness asymmetry','Motion toward the observer can make part of the disk appear brighter through relativistic Doppler beaming.'],
  ],
  lensing:[
    ['source','Background source','One distant object supplies the light in both apparent images.'],
    ['lens','Foreground lens','Mass between the observer and source changes the light paths.'],
    ['observer','Observer','The observer sees light arriving from different directions.'],
  ],
  universe:[
    ['earth','Earth and Moon','Our first waypoint uses a compressed Earth–Moon separation.'],
    ['sun','Solar System','The Sun anchors eight orbits in this illustrative view.'],
    ['proxima','Nearby stars','The unit changes from astronomical units to light-years.'],
    ['galaxy','Milky Way','The exterior view is an illustration and the Sun’s marker is approximate.'],
    ['local','Local Group','The Milky Way and Andromeda are members of the Local Group.'],
    ['edge','Observable horizon','The guide shows the region we can observe from our position.'],
  ],
};

export const claims = [
  ['Nebulae and origins','Expelled stellar material and a collapsing nursery are distinct processes.','https://spaceplace.nasa.gov/nebula/en/'],
  ['Stellar mass and remnants','Initial mass shapes stellar evolution. Core collapse can produce a neutron star or a black hole.','https://science.nasa.gov/exoplanets/stars/'],
  ['Disk chemistry and collisions','The water-ice line depends on conditions. Grain collisions can grow or erode solids.','https://science.nasa.gov/exoplanets/how-do-planets-form/'],
  ['Disk gaps','Rings and gaps in HL Tauri reveal disk structure. The image alone does not identify a planet in every gap.','https://www.eso.org/public/images/eso1436a/'],
  ['Event horizon and shadow','The event horizon is a boundary. The larger apparent shadow depends on the light surrounding it.','https://science.nasa.gov/universe/black-holes/anatomy/'],
  ['Illustrative horizon radii','The non-spinning examples use a Schwarzschild radius of approximately 2.95 km per solar mass. The display rounds to one significant figure.','https://science.nasa.gov/universe/black-holes/anatomy/'],
  ['Gravitational-wave evidence','Merging compact objects can produce gravitational waves. The displayed chirp is illustrative.','https://www.ligo.caltech.edu/page/what-are-gw'],
  ['Image alignment and brightness','The point-lens model uses normalized offsets. Perfect symmetric alignment produces a ring. Brightness is described qualitatively.','https://science.nasa.gov/mission/hubble/multimedia/e-books/hubble-focus-gravitational-lenses/'],
  ['Lensing time delay','Light from a variable source can reach us at different times along different paths. The displayed sequence assigns no physical delay.','https://science.nasa.gov/mission/hubble/multimedia/e-books/hubble-focus-gravitational-lenses/'],
];

// Authored overlay positions relative to the model’s subject area.
export const sceneHotspots={
  nebula:[[],[['gas',49,33],['dust',37,60],['cavity',62,46]],[],[['core',52,51]],[['jets',54,33]],[]],
  stars:[[['cloud',52,48]],[['core',51,49]],[['disk',52,55]],[['fusion',52,48]],[],[]],
  planets:[[['star',51,50],['dust',66,57]],[['gap',64,53]],[],[],[['protoplanet',65,54]],[['orbit',63,59]]],
  'black-holes':[[],[],[['horizon',48,50],['shadow',62,50]],[['disk',68,59]],[['ring',51,42],['far',63,32],['beaming',67,59]],[]],
  lensing:[[['source',26,45],['lens',51,50],['observer',77,53]],[],[],[],[],[]],
  universe:[[['earth',44,51]],[['sun',52,49]],[['proxima',66,53]],[['galaxy',59,50]],[['local',61,50]],[['edge',63,36]]],
};
