import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(ROOT, 'data', 'raw', 'release');
const TEMPLATE = path.join(ROOT, 'dashboard-template.html');
const OUTPUT = path.join(ROOT, 'dashboard.html');
const RELEASE = 'v2026.20.0';
const EXPECTED_SHA256 = '0760d50ecb9fad9f267e14ceece73891c2095c812a71d024d0cfbda1f02b3863';
const ZIP = path.join(ROOT, 'data', 'raw', 'f1db-csv.zip');
const FIRST_YEAR = 2010;
const LAST_YEAR = 2025;

function parseCsv(file) {
  const input = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = rows.shift();
  if (!headers?.length) throw new Error(`CSV sem cabeçalho: ${file}`);
  return rows.filter(r => r.length > 1 || r[0] !== '').map(values => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ''])));
}
function requiredFile(suffix) {
  const file = path.join(RAW, `f1db-${suffix}.csv`);
  if (!fs.existsSync(file)) throw new Error(`Arquivo esperado não encontrado: ${file}`);
  return file;
}
function numeric(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

if (!fs.existsSync(ZIP)) throw new Error('ZIP original não encontrado em data/raw; confira a etapa de download.');
const actualSha256 = crypto.createHash('sha256').update(fs.readFileSync(ZIP)).digest('hex');
if (actualSha256 !== EXPECTED_SHA256) throw new Error(`Checksum inesperado no arquivo F1DB: ${actualSha256}`);

const raceRows = parseCsv(requiredFile('races'));
const raceYears = new Map(raceRows.map(r => [r.id, numeric(r.year)]));
const drivers = new Map(parseCsv(requiredFile('drivers')).map(r => [r.id, r.name || r.fullName || r.id]));
const constructors = new Map(parseCsv(requiredFile('constructors')).map(r => [r.id, r.name || r.fullName || r.id]));
const results = parseCsv(requiredFile('races-race-results')).filter(r => {
  const year = numeric(r.year) ?? raceYears.get(r.raceId);
  return year >= FIRST_YEAR && year <= LAST_YEAR;
});
if (!results.length) throw new Error('Nenhum resultado foi encontrado no recorte 2010–2025.');

const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
const winDrivers = new Map(), winTeams = new Map(), winsByYearTeam = {}, raceIds = new Set(), driverIds = new Set(), teamIds = new Set();
const scatter = [], gridWinCounts = new Map();
for (const year of years) winsByYearTeam[year] = {};
let winnerCount = 0;
for (const r of results) {
  const year = numeric(r.year) ?? raceYears.get(r.raceId);
  const finish = numeric(r.positionNumber);
  const grid = numeric(r.gridPositionNumber);
  if (r.raceId) raceIds.add(r.raceId);
  if (r.driverId) driverIds.add(r.driverId);
  if (r.constructorId) teamIds.add(r.constructorId);
  if (finish !== null && grid !== null && finish > 0 && grid > 0 && grid <= 60 && finish <= 60) {
    scatter.push({ year, driver: drivers.get(r.driverId) || r.driverId, team: constructors.get(r.constructorId) || r.constructorId, grid, finish });
  }
  if (finish !== 1) continue;
  winnerCount++;
  if (r.driverId) winDrivers.set(r.driverId, (winDrivers.get(r.driverId) || 0) + 1);
  if (r.constructorId) {
    winTeams.set(r.constructorId, (winTeams.get(r.constructorId) || 0) + 1);
    winsByYearTeam[year][r.constructorId] = (winsByYearTeam[year][r.constructorId] || 0) + 1;
  }
  if (grid !== null && grid > 0) {
    const key = grid > 20 ? '21+' : String(grid);
    gridWinCounts.set(key, (gridWinCounts.get(key) || 0) + 1);
  }
}
const ranked = (counts, names) => [...counts.entries()]
  .map(([id, value]) => ({ id, name: names.get(id) || id, value }))
  .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR'));
const topTeams = ranked(winTeams, constructors);
const topDrivers = ranked(winDrivers, drivers).slice(0, 10);
const maxScatter = Math.max(20, ...scatter.flatMap(r => [r.grid, r.finish]));
const gridWins = Array.from({ length: 20 }, (_, i) => ({ label: String(i + 1), value: gridWinCounts.get(String(i + 1)) || 0 }));
gridWins.push({ label: '21+', value: gridWinCounts.get('21+') || 0 });
const data = {
  source: 'F1DB', release: RELEASE, firstYear: FIRST_YEAR, lastYear: LAST_YEAR,
  years, summary: { races: raceIds.size, drivers: driverIds.size, teams: teamIds.size, wins: winnerCount },
  topTeams, topDrivers, winsByYearTeam, scatter, scatterMax: maxScatter, gridWins
};
const template = fs.readFileSync(TEMPLATE, 'utf8');
const marker = '<script id="dashboard-data" type="application/json">__DASHBOARD_DATA__</script>';
if (!template.includes(marker)) throw new Error('Não foi encontrado o ponto de incorporação dos dados no template.');
const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const html = template.replace(marker, `<script id="dashboard-data" type="application/json">${json}</script>`);
fs.writeFileSync(OUTPUT, html, 'utf8');
console.log(`Dashboard gerado: ${OUTPUT}`);
console.log(`Release ${RELEASE} | checksum SHA-256 validado | ${results.length} resultados de corrida | ${raceIds.size} GPs | ${winnerCount} vitórias | dispersão: ${scatter.length} observações`);
console.log(`Temporadas: ${years[0]}–${years.at(-1)} | ${driverIds.size} pilotos | ${teamIds.size} construtores`);
