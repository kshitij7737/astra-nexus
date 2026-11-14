export const series = [
  ['nebula','Nebula'],
  ['stars','Star Life'],
  ['planets','Planet Formation'],
  ['black-holes','Black Holes'],
  ['lensing','Gravitational Lensing'],
  ['universe','Universe Tour'],
];

export function questLink(id) {
  return id==='nebula'?'nova.html?v=15':'nova.html?v=15'+'&quest='+encodeURIComponent(id);
}
