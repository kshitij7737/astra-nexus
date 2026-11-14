export const series = [
  ['nebula','Nebula'],
  ['stars','Star Life'],
  ['planets','Planet Formation'],
  ['black-holes','Black Holes'],
  ['lensing','Gravitational Lensing'],
  ['universe','Universe Tour'],
];

export function questLink(id) {
  return id==='nebula'?'nova.html?v=12':'nova.html?v=12'+'&quest='+encodeURIComponent(id);
}
