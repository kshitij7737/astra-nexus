const esoRights='https://www.eso.org/public/copyright/';
const nasaRights='https://www.nasa.gov/nasa-brand-center/images-and-media/';
const esoImage=(id, file, title, credit, note, alt, format='tif')=>({
  id,file:file+'.webp',title,credit,note,alt,kind:'Actual observation',
  source:'https://www.eso.org/public/images/'+id+'/',
  original:'https://cdn.eso.org/images/'+(format==='jpg'?'large/':'original/')+id+'.'+format,
  rights:esoRights, terms:'CC BY 4.0', edits:'Resized and encoded as WebP. Original composition and color retained.',
});
const nasa=(id,title,note,original,source,credit,kind='Scientific visualisation')=>({
  id,title,note,source,original,credit,kind,rights:nasaRights,terms:'NASA media guidelines',
  edits:'Official source reference. View the original at NASA.',
});
const nasaGoddard='NASA’s Goddard Space Flight Center/Jeremy Schnittman';
export const assets = {
  'hl-tauri':esoImage('eso1436a','hl-tauri','HL Tauri’s rings and gaps','ALMA (ESO/NAOJ/NRAO)','Millimetre emission maps the disk’s dust. Several processes can form rings and gaps.','A bright disk crossed by concentric dark gaps.'),
  water:esoImage('eso2404a','water','Water vapour in HL Tauri','ALMA (ESO/NAOJ/NRAO)/S. Facchini et al.','Blue encodes water vapour. Red shows dust emission from earlier ALMA observations. These colors represent different data layers.','Blue water-vapour emission inside red dust rings.'),
  pds70:esoImage('eso1821a','pds70','The newborn planet PDS 70b','ESO/A. Müller et al.','The bright point to the right of center is PDS 70b. A coronagraph masks the star’s glare and produces the dark center.','A disk surrounding a dark coronagraph mask with a bright point on the right.'),
  disks:esoImage('eso2405a','disks','Ten disks in three clouds','ESO/C. Ginski, A. Garufi, P.-G. Valegård et al.','These are ten different systems. The panels are rescaled, so their apparent diameters cannot be compared directly.','Ten separate observations of young stellar disks.'),
  taurus:esoImage('eso2405c','taurus','The Taurus disk gallery','ESO/A.Garufi et al.; IRAS','This gallery shows separate disks and their locations in the Taurus cloud. Expand the image to inspect individual systems.','A map of the Taurus cloud surrounded by individual disk observations.','jpg'),
  trojan:esoImage('eso2311a','trojan','A possible co-orbital feature at PDS 70','ALMA (ESO/NAOJ/NRAO)/Balsalobre-Ruza et al.','An ALMA image shows a dust concentration along PDS 70b’s orbit. Its interpretation remains tentative.','An annotated ALMA image with an orbit and a marked dust concentration.'),
  'planet-growth':{
    id:'PF-06',file:'planet-growth.webp',video:'planet-growth.mp4',title:'A planet growing inside a disk',kind:'Artist’s impression',credit:'ESO/M.Kornmesser',
    note:'This animation imagines a growing planet gathering material. The clip is silent.',
    alt:'Illustrated planet embedded in a dusty disk.',
    source:'https://www.eso.org/public/videos/cs0025e/',original:'https://cdn.eso.org/videos/ultra_hd_h265/cs0025e.mp4',
    rights:esoRights,terms:'CC BY 4.0',edits:'4K source transcoded to 960 px H.264. Audio omitted. WebP poster extracted from the animation.',
  },
  m87:{
    id:'BH-01',file:'m87-original.webp',title:'M87* in radio light',kind:'Actual observation',credit:'Event Horizon Telescope Collaboration',
    note:'The bright ring is emission from hot material. The central darkness is the apparent shadow; the event horizon is a smaller boundary.',
    alt:'An uneven orange ring of radio emission surrounding a dark shadow.',
    source:'https://www.nao.ac.jp/en/news/sp/20190410-eht/images.html',
    original:'https://www.nao.ac.jp/en/news/sp/20190410-eht/images/20190410-eht-m87bh.jpg',
    rights:'https://www.nao.ac.jp/en/news/sp/20190410-eht/images.html',terms:'NAOJ EHT press kit credit terms',
    edits:'Original 7416 × 4320 image resized and encoded as WebP.',
  },
  'sgr-a':{
    id:'BH-02',file:'sgr-a.webp',alt:'A softly resolved bright radio ring surrounding a dark center.',title:'Sagittarius A* in radio light',kind:'Actual observation',credit:'EHT Collaboration',
    note:'The EHT image represents an average of reconstructions from observations of the black hole at the Milky Way’s center.',
    source:'https://www.eso.org/public/images/eso2208-eht-mwa/',original:'https://cdn.eso.org/images/original/eso2208-eht-mwa.tif',
    rights:esoRights,terms:'CC BY 4.0',edits:'4076 × 4076 original resized and encoded as WebP.',
  },
  'bh-anatomy':{
    ...nasa('BH-03','Anatomy of a simulated black hole','Identify the accretion disk, photon ring, shadow, far-side disk image and brightness asymmetry.','https://www.nasa.gov/wp-content/uploads/2019/09/bh_labeled.jpg','https://svs.gsfc.nasa.gov/13326/',nasaGoddard),
    file:'bh-anatomy.webp',alt:'NASA’s annotated simulation identifies five features around a black-hole shadow.',
    edits:'3851 × 2166 original resized and encoded as WebP. All labels retained.',
  },
  'bh-optics':nasa('BH-04','A warped look at black-hole optics','NASA’s diagram traces direct and bent light paths. The model’s Trace light guide explains the same distinction schematically.','https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013326/BH_optics_explained.jpg','https://svs.gsfc.nasa.gov/13326/',nasaGoddard,'Scientific diagram'),
  'bh-edge':{
    ...nasa('BH-05A','Accretion disk from the edge','In this NASA visualisation, bent light reveals the far side of the hot disk above and below the shadow. The clip is silent.','https://www.nasa.gov/wp-content/uploads/2019/09/bh_accretiondisk_sim_stationary_websize.gif','https://www.nasa.gov/universe/nasa-visualization-shows-a-black-holes-warped-world/',nasaGoddard),
    file:'bh-edge.webp',video:'bh-edge.mp4',alt:'A bright disk crosses a dark shadow, with its far side lensed into arcs.',
    edits:'The 4.7-second official edge-on GIF transcoded to 960 px H.264, with a WebP poster.',
  },
  'bh-approach':nasa('BH-05','Approaching a black hole','NASA’s cinematic approach shows a simulated disk and the effects of distorted light paths.','https://svs.gsfc.nasa.gov/vis/a010000/a014600/a014619/1-Approaching_a_black_hole-4K.mp4','https://svs.gsfc.nasa.gov/14619/','NASA/JPL-Caltech/R. Hurt (IPAC)'),
  'bh-binary':nasa('BH-06','Two supermassive black holes','This simulation shows light emitted around two orbiting black holes. The Explorer’s optional merger model demonstrates a separate gravitational-wave concept.','https://svs.gsfc.nasa.gov/vis/a010000/a013000/a013086/SMBH_Sim_Thin0_4kFull.mp4','https://svs.gsfc.nasa.gov/13086/',"NASA's Goddard Space Flight Center/Scott Noble; simulation data, d’Ascoli et al. 2018",'Scientific simulation'),
};
export const assetPath = file=>'textures/cosmic/evidence/'+file;
export const evidenceByScene = {
  planets:[['hl-tauri'],['water'],['planet-growth'],['disks'],['pds70','planet-growth','trojan'],['disks','taurus']],
  'black-holes':[['bh-edge','bh-approach'],[],['bh-anatomy'],['bh-anatomy','bh-edge'],['bh-optics','bh-edge'],['m87','sgr-a','bh-binary']],
};
