// Shared, keyboard-accessible flight manual. Native dialog restores focus on close.
const manual = document.createElement('dialog');
manual.id = 'flight-school';
manual.setAttribute('aria-labelledby', 'flight-title');
manual.innerHTML = `<header><span>FLIGHT SCHOOL / 01</span><button type="button" aria-label="Close how to play">✕</button></header>
<h2 id="flight-title">Your first mission starts here.</h2><p class="flight-lead">You are the flight director. Build a spacecraft that can collect science and send it home. No space knowledge required.</p>
<div class="flight-route"><span>BUILD</span><i>→</i><span>OBSERVE</span><i>→</i><span>SEND HOME</span></div>
<ol class="flight-lessons">
<li><b>Choose Cadet for your first flight</b><p>Cadet removes random launch failures and gives you more room in the budget. Pick a destination and read its objectives. In the builder, choose “Use a Cadet starter build” for a tested starting design.</p></li>
<li><b>Build around your objectives</b><p>Instruments are your spacecraft’s eyes. Equip the ones your objectives need. Solar panels make electricity, the battery keeps you alive in darkness, the recorder stores discoveries, and the radio sends them home.</p></li>
<li><b>Read the checks before launch</b><p>Stay within the rocket’s mass limit and your budget. Check battery capacity and propellant. A bigger part can help, but it also adds weight and cost. Fix red warnings, then review the launch poll.</p></li>
<li><b>Watch, pause and make decisions</b><p>Target passes collect data. Ground contact sends stored data home. During eclipse, the battery supplies power. Use Pause whenever you need thinking time. Read VEGA’s questions and choose a response.</p></li>
<li><b>Bring the science home</b><p>Collected data earns objective points when it reaches Earth. Read your debrief, change the component that held you back, and try to beat your score. Complete objectives to unlock discoveries.</p></li></ol>
<details><summary>What do the numbers mean?</summary><dl><dt>W · watts</dt><dd>How fast you generate or use electricity.</dd><dt>Wh · watt-hours</dt><dd>Stored energy. A 100 W load uses 100 Wh in one hour.</dd><dt>Gbit · gigabits</dt><dd>Amount of stored or returned data.</dd><dt>Mbit/s</dt><dd>Radio speed. More speed sends more data during a contact.</dd><dt>Δv · metres per second</dt><dd>Your fuel-powered ability to change velocity. Keep some spare for surprises.</dd></dl></details>
<details><summary>Controls and quick fixes</summary><p>Drag to rotate the spacecraft. Scroll to zoom. On mission control, Space pauses and 1, 2, 4 select speed. Touch players can use the on-screen buttons.</p><p><b>Battery empty?</b> Try a larger battery and check solar power. <b>Recorder full?</b> Improve your radio or storage. <b>Too heavy?</b> Choose lighter parts or a larger launcher. <b>Low score?</b> Check that the right instruments collected data and returned it.</p></details>
<p class="flight-evidence">NASA sources explain the destinations and real instruments. Component prices, faults, mission timing and scores are educational game choices. Open Sources and data for the references.</p>
<button class="flight-ready" type="button">Got it. Let’s fly.</button>`;
document.body.append(manual);
const close = () => manual.close();
manual.querySelector('header button').onclick = close;
manual.querySelector('.flight-ready').onclick = close;
for (const button of document.querySelectorAll('[data-flight-school]')) button.onclick = () => manual.showModal();
