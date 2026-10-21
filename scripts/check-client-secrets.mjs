import { readFileSync, readdirSync, existsSync } from 'node:fs';

const names = ['YOUTUBE_API_KEY', 'VITE_YOUTUBE_API_KEY', 'INSTAGRAM_ACCESS_TOKEN', 'FACEBOOK_PAGE_ACCESS_TOKEN'];
const local = {};
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) local[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
const bundles = readdirSync('dist/assets').filter(name => name.endsWith('.js')).map(name => readFileSync(`dist/assets/${name}`, 'utf8')).join('\n');
for (const name of names) {
  for (const value of [process.env[name], local[name]]) {
    if (value?.length > 8 && bundles.includes(value)) throw new Error(`Private credential ${name} was bundled into client JavaScript`);
  }
}
console.log('PASS: configured social API credentials are absent from client JavaScript.');
