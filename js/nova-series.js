export const series = [
  ['nebula','Nebula'],
  ['stars','Star Life'],
  ['planets','Planet Formation'],
  ['black-holes','Black Holes'],
  ['lensing','Gravitational Lensing'],
  ['universe','Universe Tour'],
];

export function questLink(id) {
  return id==='nebula'?'nova.html?v=13':'nova.html?v=13'+'&quest='+encodeURIComponent(id);
}
