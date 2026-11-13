// Credits are shown in the viewer and on the site sources page.
const webb = 'NASA, ESA, CSA, STScI';
export const observations = {
  carina: {
    title: 'Cosmic Cliffs, Carina Nebula', instrument: 'JWST · NIRCam · Infrared',
    credit: webb,
    link: 'https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/',
    alt: 'A sharply sculpted orange cloud wall and young stars in a blue infrared starfield.',
    note: 'Webb maps several infrared filters to visible colors. Young stars have carved a cavity in the gas.',
    focus: '58% 56%',
  },
  protostar: {
    title: 'L1527 and its protostar', instrument: 'JWST · NIRCam · Infrared',
    credit: webb + '; J. DePasquale, A. Pagan, A. Koekemoer (STScI)',
    link: 'https://science.nasa.gov/asset/webb/l1527-and-protostar-nircam-image/',
    alt: 'An orange and blue hourglass of gas separated by a dark disk around a young protostar.',
    note: 'The dark line at the waist is the edge-on disk. The bright lobes show where outflows have opened cavities.',
    focus: '50% 49%',
  },
  crab: {
    title: 'Crab Nebula', instrument: 'JWST · NIRCam + MIRI · Infrared',
    credit: webb + ', T. Temim (Princeton University)',
    link: 'https://esawebb.org/images/weic2417a/',
    alt: 'Fine branching filaments and luminous material around the remnant of a stellar explosion.',
    note: 'The Crab is a supernova remnant. A neutron star at its center powers the surrounding nebula.',
    focus: '50% 48%',
  },
  disk: {
    title: 'The disk around HH 30', instrument: 'JWST · Infrared',
    credit: 'ESA/Webb, NASA & CSA, Tazaki et al.',
    link: 'https://esawebb.org/images/potm2501c/',
    alt: 'A thin dark protoplanetary disk crossing between two luminous lobes of scattered light.',
    note: 'The disk lies edge-on to us. Dust hides the young star while scattered light reveals the material above and below the disk.',
    focus: '50% 49%',
  },
  lens: {
    title: 'Lensed quasar RX J1131−1231', instrument: 'JWST · MIRI · Infrared',
    credit: 'ESA/Webb, NASA & CSA, A. Nierenberg',
    link: 'https://esawebb.org/images/potm2406a/',
    alt: 'An apparent ring and bright lensed images surrounding a foreground galaxy.',
    note: 'A foreground galaxy stretches the quasar’s host into an arc and produces four images of the quasar. The interactive symmetric model is simpler than this observed system.',
    focus: '50% 50%',
  },
  'deep-field': {
    title: 'Webb’s First Deep Field', instrument: 'JWST · NIRCam · Infrared',
    credit: webb,
    link: 'https://esawebb.org/images/webb-first-deep-field/',
    alt: 'Thousands of faint galaxies and distorted orange arcs in the field around galaxy cluster SMACS 0723.',
    note: 'This is a small patch of sky in the direction of SMACS 0723. Many background galaxies appear stretched by the cluster’s gravity.',
    focus: '50% 49%',
  },
  'black-hole': {
    title: 'The black hole in M87', instrument: 'Event Horizon Telescope · Radio reconstruction',
    credit: 'Event Horizon Telescope Collaboration',
    link: 'https://science.nasa.gov/resource/first-image-of-a-black-hole/',
    alt: 'An uneven orange ring of radio emission surrounding a dark central shadow.',
    note: 'This reconstruction maps radio emission near the black hole in M87. The bright ring surrounds the shadow.',
    focus: '50% 48%',
  },
};

export function observationFor(chapter, beat, state) {
  if(chapter==='nebula'){
    if(beat===2) return state.branch==='massive' ? 'crab' : null;
    return beat>=4 || state.infrared ? 'protostar' : 'carina';
  }
  if(chapter==='stars') return beat===5 && state.branch==='massive' ? 'crab' : beat<=2 ? 'protostar' : null;
  if(chapter==='planets') return beat<2 ? 'disk' : null;
  if(chapter==='black-holes') return beat!==1 && beat!==5 ? 'black-hole' : null;
  if(chapter==='lensing') return beat===5 ? 'deep-field' : 'lens';
  return beat>=4 ? 'deep-field' : null;
}

export function imagePath(id) {
  return 'textures/cosmic/'+id+'.webp';
}
