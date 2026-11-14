export const objectives = {
  nebula: ['Find a protostar', 'Reveal hidden stars'],
  stars: ['Explore the massive-star ending', 'Inspect the fusion core'],
  planets: ['Make grains stick', 'Reveal the water-ice line'],
  'black-holes': ['Compare black-hole masses', 'Trace bent light'],
  lensing: ['Align an Einstein ring', 'Compare arrival paths'],
  universe: ['Reach the observable horizon', 'Compare distance units'],
};

const key = 'nexus-cosmic-objectives';
let session = {};
export function readObjectives() {
  try { return JSON.parse(localStorage.getItem(key)) || session; }
  catch { return session; }
}
export function completeObjective(chapter,index) {
  const progress=readObjectives();
  const completed=progress[chapter]||[];
  if(completed.includes(index))return;
  session={...progress,[chapter]:[...completed,index]};
  try { localStorage.setItem(key,JSON.stringify(session)); } catch {}
}

export const discoveries = {
  nebula: 'Infrared light can reveal protostars embedded in dust.',
  stars: 'A star’s initial mass helps determine how it ends its life.',
  planets: 'Grain collisions can build or erode the solids in a young disk.',
  'black-holes': 'The observed shadow is larger than the event horizon.',
  lensing: 'A symmetric lens can form a ring when the source is aligned.',
  universe: 'Cosmic expansion makes present-day distances differ from light-travel times.',
};
