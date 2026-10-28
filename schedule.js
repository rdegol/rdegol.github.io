// Premier Plan home games. date = local (Eastern) game date, time = Eastern puck drop.
// result: null = unplayed / unknown, 'W' = Panthers win, 'L' = regulation loss,
// 'OTL' = overtime or shootout loss.
const games = [
  { date: '2026-10-10', time: '6:00 PM', abbr: 'min', opponent: 'Minnesota Wild',       result: null, score: null },
  { date: '2026-10-17', time: '6:00 PM', abbr: 'sea', opponent: 'Seattle Kraken',       result: null, score: null },
  { date: '2026-10-30', time: '7:00 PM', abbr: 'wpg', opponent: 'Winnipeg Jets',        result: null, score: null },
  { date: '2026-11-12', time: '7:30 PM', abbr: 'det', opponent: 'Detroit Red Wings',    result: null, score: null },
  { date: '2026-11-21', time: '6:00 PM', abbr: 'buf', opponent: 'Buffalo Sabres',       result: null, score: null },
  { date: '2026-11-25', time: '7:00 PM', abbr: 'ott', opponent: 'Ottawa Senators',      result: null, score: null },
  { date: '2026-11-28', time: '6:00 PM', abbr: 'tb',  opponent: 'Tampa Bay Lightning',  result: null, score: null },
  { date: '2026-12-08', time: '7:00 PM', abbr: 'bos', opponent: 'Boston Bruins',        result: null, score: null },
  { date: '2026-12-19', time: '1:00 PM', abbr: 'cgy', opponent: 'Calgary Flames',       result: null, score: null },
  { date: '2026-12-26', time: '6:00 PM', abbr: 'tb',  opponent: 'Tampa Bay Lightning',  result: null, score: null },
  { date: '2026-12-28', time: '7:00 PM', abbr: 'nsh', opponent: 'Nashville Predators',  result: null, score: null },
  { date: '2027-01-02', time: '1:00 PM', abbr: 'mtl', opponent: 'Montreal Canadiens',   result: null, score: null },
  { date: '2027-01-16', time: '6:00 PM', abbr: 'vgk', opponent: 'Vegas Golden Knights', result: null, score: null },
  { date: '2027-01-24', time: '6:00 PM', abbr: 'la',  opponent: 'Los Angeles Kings',    result: null, score: null },
  { date: '2027-02-12', time: '7:00 PM', abbr: 'col', opponent: 'Colorado Avalanche',   result: null, score: null },
  { date: '2027-02-13', time: '6:00 PM', abbr: 'dal', opponent: 'Dallas Stars',         result: null, score: null },
  { date: '2027-02-20', time: '5:00 PM', abbr: 'ana', opponent: 'Anaheim Ducks',        result: null, score: null },
  { date: '2027-03-06', time: '7:00 PM', abbr: 'tor', opponent: 'Toronto Maple Leafs',  result: null, score: null },
  { date: '2027-03-12', time: '7:00 PM', abbr: 'nyi', opponent: 'New York Islanders',   result: null, score: null },
  { date: '2027-03-25', time: '7:00 PM', abbr: 'nyr', opponent: 'New York Rangers',     result: null, score: null },
  { date: '2027-03-27', time: '6:00 PM', abbr: 'phi', opponent: 'Philadelphia Flyers',  result: null, score: null },
  { date: '2027-04-01', time: '7:00 PM', abbr: 'tor', opponent: 'Toronto Maple Leafs',  result: null, score: null },
  { date: '2027-04-06', time: '7:15 PM', abbr: 'mtl', opponent: 'Montreal Canadiens',   result: null, score: null },
  { date: '2027-04-09', time: '7:00 PM', abbr: 'bos', opponent: 'Boston Bruins',        result: null, score: null },
  { date: '2027-04-10', time: '6:00 PM', abbr: 'car', opponent: 'Carolina Hurricanes',  result: null, score: null },
];

// ESPN's public API sends CORS headers, so it can be called straight from the page.
// season=2027 is ESPN's label for the 2026-27 season.
const SCHEDULE_URL = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/fla/schedule?season=2027';

const logoUrl = abbr =>
  `https://a.espncdn.com/combiner/i?img=/i/teamlogos/nhl/500/scoreboard/${abbr}.png&h=200&w=200`;

// 'YYYY-MM-DD' -> 'MM/DD'
const shortDate = iso => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;

// Eastern calendar date (YYYY-MM-DD) of a Date, so an ESPN UTC timestamp like
// 2026-11-13T00:30Z matches the 11/12 game.
const easternDate = d =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d);

function render() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (const g of games) {
    const card = document.createElement('div');
    const resultClass = { W: ' win', L: ' loss', OTL: ' otl' }[g.result] || '';
    card.className = 'card' + resultClass;
    card.innerHTML = `
      <img class="logo" src="${logoUrl(g.abbr)}" alt="${g.opponent} logo" loading="lazy" />
      <div class="opponent">${g.opponent}</div>
      <div class="date">${shortDate(g.date)}</div>
      <div class="time">${g.time} ET</div>
      ${g.result ? `<div class="result">${g.result} ${g.score}</div>` : ''}`;
    grid.appendChild(card);
  }
}

async function loadResults() {
  const today = easternDate(new Date());
  const past = games.filter(g => g.date < today);
  if (!past.length) return;

  const res = await fetch(SCHEDULE_URL);
  if (!res.ok) throw new Error(`ESPN schedule request failed: ${res.status}`);
  const data = await res.json();

  for (const event of data.events || []) {
    const comp = event.competitions[0];
    if (!comp.status.type.completed) continue;

    const home = comp.competitors.find(c => c.homeAway === 'home');
    const away = comp.competitors.find(c => c.homeAway === 'away');
    if (home.team.abbreviation !== 'FLA') continue;

    const game = past.find(g =>
      g.date === easternDate(new Date(event.date)) &&
      g.abbr === away.team.abbreviation.toLowerCase());
    if (!game) continue;

    // altDetail is 'OT' or 'SO' for games decided after regulation, absent otherwise.
    const extra = comp.status.type.altDetail;
    const suffix = extra ? ` (${extra})` : '';
    game.result = home.winner ? 'W' : extra ? 'OTL' : 'L';
    game.score = `${home.score.displayValue}–${away.score.displayValue}${suffix}`;
  }
}

render();
loadResults()
  .then(render)
  .catch(err => console.warn('Could not load results; showing schedule only.', err));
