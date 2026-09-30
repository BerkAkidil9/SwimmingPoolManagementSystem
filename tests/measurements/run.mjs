import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import autocannon from 'autocannon';

// All writes and loads target a disposable copy and a new loopback PostgreSQL cluster.
// Application files and existing tests are copied without modification.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const work = process.env.MEASUREMENT_WORKDIR || fs.mkdtempSync(path.join(os.tmpdir(), 'swim-measurements-'));
const out = path.resolve(process.env.MEASUREMENT_OUTPUT || path.join(root, 'docs/cv-metrics-evidence/local-measurements'));
const phase = process.env.MEASUREMENT_PHASE || 'all';
const apiPort = 3301, uiPort = 3300, pgPort = 55439;
const api = `http://localhost:${apiPort}`, ui = `http://localhost:${uiPort}`;
fs.mkdirSync(out, { recursive: true });
const req = createRequire(path.join(root, 'backend/package.json'));
const children = [];
const summary = { startedAt: new Date().toISOString(), phase, stages: {} };
const scrub = text => String(text).replaceAll(fs.realpathSync(work), '<isolated-workspace>').replaceAll(work, '<isolated-workspace>').replaceAll(root, '<repository>');
const save = (name, data) => fs.writeFileSync(path.join(out, name), scrub(JSON.stringify(data, null, 2)) + '\n');
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}
const baseEnv = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SystemRoot'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const env = { ...baseEnv, TZ: 'Europe/Istanbul', NODE_ENV: 'test', CI: 'true',
  GOOGLE_CLIENT_ID: 'measurement-local-placeholder', GOOGLE_CLIENT_SECRET: 'measurement-local-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_measurement_placeholder', SESSION_SECRET: 'local-measurement-session-secret-not-for-deployment',
  USE_R2: 'false', FRONTEND_URL: ui, BACKEND_URL: api, PORT: String(apiPort),
  REACT_APP_API_URL: api, REACT_APP_STRIPE_PUBLISHABLE_KEY: 'pk_test_measurement_placeholder',
  TEST_DATABASE_URL: `postgresql://postgres:measurement@127.0.0.1:${pgPort}/swim_measurement`,
  DATABASE_URL: `postgresql://postgres:measurement@127.0.0.1:${pgPort}/swim_measurement`,
  TEST_DB_HOST: '127.0.0.1', TEST_DB_PORT: String(pgPort), TEST_DB_NAME: 'swim_measurement',
  TEST_DB_USER: 'postgres', TEST_DB_PASSWORD: 'measurement' };

async function command(name, executable, args, cwd, extra = {}, timeout = 240000) {
  console.log(`START ${name}`);
  const start = performance.now();
  const log = fs.openSync(path.join(out, `${name}.txt`), 'w');
  const child = spawn(executable, args, { cwd, env: { ...env, ...extra }, stdio: ['ignore', log, log] });
  children.push(child);
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeout);
  const result = await new Promise(resolve => {
    child.once('error', error => resolve({ error: error.message, exitCode: null }));
    child.once('exit', (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timer); fs.closeSync(log);
  const record = { ...result, timedOut, durationSeconds: (performance.now() - start) / 1000,
    command: [executable, ...args], cwd: path.relative(work, cwd) };
  summary.stages[name] = record; save('run-summary.json', summary);
  console.log(`END ${name}: ${JSON.stringify(record)}`);
  return record;
}
async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Local service did not start: ${url}`);
}
async function prepare() {
  for (const dir of ['backend', 'frontend', 'tests/e2e']) {
    const dest = path.join(work, dir);
    if (!fs.existsSync(dest)) fs.cpSync(path.join(root, dir), dest, { recursive: true,
      filter: p => !['node_modules', 'build', 'coverage', 'uploads', 'data', 'playwright-report', 'test-results'].includes(path.basename(p)) && !path.basename(p).startsWith('.env') });
  }
  fs.mkdirSync(path.join(work, 'backend/uploads'), { recursive: true });
  for(const dir of ['backend','frontend','tests/e2e']) {
    if(fs.readdirSync(path.join(work,dir)).some(name=>name.startsWith('.env'))) {
      throw new Error(`Refusing an existing workspace containing environment files: ${dir}`);
    }
  }
  if (!fs.existsSync(path.join(work, 'backend/node_modules'))) fs.symlinkSync(path.join(root, 'backend/node_modules'), path.join(work, 'backend/node_modules'), 'dir');
  for (const dir of ['frontend', 'tests/e2e']) if (!fs.existsSync(path.join(work, dir, 'node_modules'))) {
    const r = await command(`install-${dir.replaceAll('/', '-')}`, 'npm', ['ci', '--no-audit', '--no-fund'], path.join(work, dir), {}, 600000);
    if (r.exitCode !== 0) throw new Error(`Dependency installation failed: ${dir}`);
  }
  // Do not allow application-side outgoing requests to payment/email/OAuth services.
  const guard = path.join(work, 'local-network-only.cjs');
  fs.writeFileSync(guard, `const net = require('node:net');
const original = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const a = Array.isArray(args[0]) ? args[0] : args;
  const options = a[0];
  const host = typeof options === 'object' ? options.host : (typeof a[1] === 'string' ? a[1] : undefined);
  if (host && !['localhost','127.0.0.1','::1'].includes(host)) throw new Error('Measurement blocked non-local connection: ' + host);
  return original.apply(this,args);
};\n`);
  env.NODE_OPTIONS = `--require=${guard}`;
  save('source-manifest.json', Object.fromEntries(['backend','frontend','tests/e2e'].flatMap(dir => {
    function sourceFiles(d) { return fs.readdirSync(d,{withFileTypes:true}).flatMap(e => e.name==='node_modules' || ['build','coverage','uploads','data','test-results','playwright-report','pgdata'].includes(e.name) ? [] : e.isDirectory() ? sourceFiles(path.join(d,e.name)) : [path.join(d,e.name)]); }
    return sourceFiles(path.join(work,dir)).filter(f=>!f.endsWith('measurement.config.cjs')).map(f=>[path.relative(work,f), createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);
  })));
}

let pg, server, db, browser;
try {
  await prepare();
  const toolsPkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json')));
  save('environment.json', { measuredAt: summary.startedAt, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    node: process.version, platform: os.platform(), release: os.release(), arch: os.arch(), cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), timezone: env.TZ, tools: toolsPkg.devDependencies,
    backendJest: req('jest/package.json').version, isolated: true,
    limitations: ['local host client/server/database; no production traffic', 'synthetic fixtures', 'outgoing application sockets restricted to loopback', 'browser external services blocked', 'no measured historical improvement'] });
  const { default: EmbeddedPostgres } = await import(pathToFileURL(req.resolve('embedded-postgres')));
  pg = new EmbeddedPostgres({ databaseDir: path.join(work, 'pgdata'), port: pgPort, user: 'postgres', password: 'measurement',
    persistent: true, postgresFlags: ['-h', '127.0.0.1', '-k', work], onLog: () => {}, onError: () => {} });
  if (!fs.existsSync(path.join(work, 'pgdata/PG_VERSION'))) await pg.initialise();
  await pg.start();
  try { await pg.createDatabase('swim_measurement'); } catch (e) { if (!String(e).includes('already exists')) throw e; }
  const { Client } = req('pg'); db = new Client({ connectionString: env.DATABASE_URL }); await db.connect();
  await db.query(fs.readFileSync(path.join(work, 'backend/sql/schema_postgres.sql'), 'utf8'));
  save('database.json', { version: (await db.query('SELECT version()')).rows[0].version, host: '127.0.0.1', port: pgPort, database: 'swim_measurement' });

  if (['all', 'tests'].includes(phase)) {
    const jest = path.join(root, 'backend/node_modules/jest/bin/jest.js');
    await command('backend-unit', process.execPath, [jest, '--runInBand', '--silent', '--coverage', '--coverageReporters=json-summary', '--coverageReporters=json', '--coverageReporters=text', `--coverageDirectory=${out}/backend-unit-coverage`, '--json', `--outputFile=${out}/backend-unit.json`], path.join(work, 'backend'));
    // Includes untested entrypoint, auth, storage, email and DB code omitted by the existing unit config.
    await command('backend-integration', process.execPath, [jest, '--config=jest.integration.config.js', '--runInBand', '--forceExit', '--silent', '--coverage', '--collectCoverageFrom=routes/**/*.js', '--collectCoverageFrom=middleware/**/*.js', '--collectCoverageFrom=utils/**/*.js', '--collectCoverageFrom=config/**/*.js', '--collectCoverageFrom=register.js', '--collectCoverageFrom=validations.js', '--collectCoverageFrom=index.js', '--coverageReporters=json-summary', '--coverageReporters=json', '--coverageReporters=text', `--coverageDirectory=${out}/backend-integration-coverage`, '--json', `--outputFile=${out}/backend-integration.json`], path.join(work, 'backend'));
    await command('frontend-tests', process.execPath, ['node_modules/react-scripts/bin/react-scripts.js', 'test', '--watchAll=false', '--runInBand', '--forceExit', '--silent', '--coverage', '--collectCoverageFrom=src/**/*.{js,jsx}', '--collectCoverageFrom=!src/**/*.test.{js,jsx}', '--collectCoverageFrom=!src/setupTests.js', '--collectCoverageFrom=!src/**/__tests__/**', '--coverageReporters=json-summary', '--coverageReporters=json', '--coverageReporters=text', `--coverageDirectory=${out}/frontend-coverage`, '--json', `--outputFile=${out}/frontend-tests.json`], path.join(work, 'frontend'));
  }
  if (['all', 'build'].includes(phase)) {
    await command('frontend-build', process.execPath, ['node_modules/react-scripts/bin/react-scripts.js', 'build'], path.join(work, 'frontend'), { NODE_ENV: 'production', CI: 'false' });
  }
  const build = path.join(work, 'frontend/build');
  if (fs.existsSync(path.join(build, 'asset-manifest.json'))) {
    const manifest = JSON.parse(fs.readFileSync(path.join(build, 'asset-manifest.json')));
    const assets = files(build).map(f => { const b = fs.readFileSync(f); return { path: path.relative(build, f), bytes: b.length, gzipBytes: gzipSync(b).length, brotliBytes: brotliCompressSync(b).length }; });
    save('bundle.json', { note: 'Compressed sizes calculated locally, not network transfer measurements. Source maps excluded from runtime totals.', entrypoints: manifest.entrypoints,
      assets, runtimeTotals: assets.filter(a => !a.path.endsWith('.map')).reduce((s,a) => ({ bytes: s.bytes+a.bytes, gzipBytes:s.gzipBytes+a.gzipBytes, brotliBytes:s.brotliBytes+a.brotliBytes }), {bytes:0,gzipBytes:0,brotliBytes:0}) });
  }

  if (['all', 'browser', 'load'].includes(phase)) {
    await db.query(fs.readFileSync(path.join(work, 'backend/sql/schema_postgres.sql'), 'utf8'));
    await db.query(`INSERT INTO "Pools" (name, capacity, rules, location) SELECT 'Measurement Pool ' || n, 50, 'Synthetic benchmark fixture', '41.0082,28.9784' FROM generate_series(1,10) n`);
    await db.query(`INSERT INTO sessions (pool_id,type,start_time,end_time,initial_capacity,session_date)
      SELECT p.id, CASE WHEN n % 2 = 0 THEN 'education'::package_type_enum ELSE 'free_swimming'::package_type_enum END,
      '10:00'::time, '11:00'::time, 50, CURRENT_DATE + n FROM "Pools" p CROSS JOIN generate_series(1,100) n`);
    const hash = await req('bcryptjs').hash('MeasurementPass123!', 10);
    const roles = ['user','admin','doctor','staff','coach'];
    for (const role of roles) await db.query(`INSERT INTO users (name,surname,email,password,role,email_verified,verification_status,health_status) VALUES ('Measurement','Fixture',$1,$2,$3,true,'approved','approved')`, [`${role}@measurement.invalid`, hash, role]);
    save('fixtures.json', { synthetic: true, pools: 10, sessions: 1000, users: 5, roles, reservations: 0, payments: 0 });
    const backendLogPath = path.join(work, 'backend-server.txt');
    const backendLog = fs.openSync(backendLogPath, 'w');
    const backend = spawn(process.execPath, ['index.js'], { cwd: path.join(work, 'backend'), env: { ...env, NODE_ENV: 'development' }, stdio: ['ignore', backendLog, backendLog] });
    children.push(backend); await waitFor(`${api}/pools`);
    if (phase !== 'load') {
      if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('Production build missing; browser measurements require successful build');
      const express = req('express'); const app = express();
      // Static production assets, no compression middleware. Network simulation belongs to Lighthouse.
      app.use(express.static(build)); app.get('*', (request, response) => response.sendFile(path.join(build, 'index.html')));
      server = await new Promise(resolve => { const s = app.listen(uiPort, '127.0.0.1', () => resolve(s)); });
      const configFile = path.join(work, 'tests/e2e/measurement.config.cjs');
      fs.writeFileSync(configFile, `const base=require('./playwright.config');module.exports={...base,retries:0,reporter:[['json',{outputFile:${JSON.stringify(path.join(out,'e2e.json'))}}]],outputDir:${JSON.stringify(path.join(out,'e2e-artifacts'))},use:{...base.use,channel:'chrome',launchOptions:{args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1']}}};`);
      await command('e2e', process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config=measurement.config.cjs'], path.join(work, 'tests/e2e'), {}, 240000);
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      save('browser-version.json', { browser: browser.version(), engine: 'Chromium via installed Google Chrome', viewports: [{width:1440,height:900},{width:390,height:844}] });
      const audits = [];
      for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
        const context = await browser.newContext({ viewport });
        await context.route('**/*', route => { const u = new URL(route.request().url()); return ['localhost','127.0.0.1'].includes(u.hostname) || u.protocol==='data:' ? route.continue() : route.abort(); });
        for (const route of ['/', '/login', '/register', '/forgot-password', '/education-package', '/free-swimming-package']) {
          const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
          await page.goto(ui+route, { waitUntil: 'networkidle' });
          const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
          const layout = await page.evaluate(() => ({ title: document.title, h1: [...document.querySelectorAll('h1')].map(x=>x.textContent), width: innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyTextLength: document.body.innerText.length }));
          audits.push({ route, viewport, finalUrl: page.url(), errors, layout, axe });
          console.log(`AXE ${route} ${viewport.width}: ${axe.violations.length} rules`);
          await page.close();
        }
        await context.close();
      }
      save('accessibility.json', audits);
      await browser.close(); browser = null;
      const lh = [];
      for (const route of ['/', '/login', '/register']) for (let repeat=1; repeat<=3; repeat++) {
        const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'] });
        try {
          const result = await lighthouse(ui+route, { port: chrome.port, logLevel: 'error', output: 'json', onlyCategories:['performance','accessibility','best-practices','seo'] });
          const name=`lighthouse-${route==='/'?'landing':route.slice(1)}-${repeat}.json`;
          save(name, result.lhr);
          lh.push({ route, repeat, report: name, runtimeError: result.lhr.runtimeError,
            scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([k,v])=>[k,v.score])),
            metrics: Object.fromEntries(['first-contentful-paint','largest-contentful-paint','speed-index','total-blocking-time','cumulative-layout-shift'].map(k=>[k,result.lhr.audits[k]?.numericValue])) });
          save('lighthouse-summary.json', lh); console.log(`LIGHTHOUSE ${route} ${repeat}: ${JSON.stringify(lh.at(-1).scores)}`);
        } finally { await chrome.kill(); }
      }
    }
    if (phase !== 'browser') {
      const login = await fetch(api+'/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'user@measurement.invalid',password:'MeasurementPass123!'})});
      if (!login.ok) throw new Error(`Load fixture login failed: ${login.status}`);
      const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
      const load=[];
      for (const endpoint of ['/pools','/api/member/sessions']) {
        const headers=endpoint.includes('/member/')?{cookie}:{};
        const check=await fetch(api+endpoint,{headers}); const body=await check.json();
        if (!check.ok || !Array.isArray(body) || body.length===0) throw new Error(`Load endpoint fixture invalid: ${endpoint}`);
        const checkLength = body.length;
        await autocannon({url:api+endpoint,headers,connections:5,duration:3,pipelining:1});
        for (const connections of [1,10,50]) for(let repeat=1;repeat<=3;repeat++) {
          const result=await autocannon({url:api+endpoint,headers,connections,duration:10,pipelining:1,
            verifyBody: body => { try {return JSON.parse(body).length===checkLength;}catch{return false;} }});
          load.push({endpoint,repeat,fixtureResponseRecords:body.length,...result});
          save('load-results.json',load); console.log(`LOAD ${endpoint} c=${connections} run=${repeat}: ${result.requests.average} req/s, errors=${result.errors}, non2xx=${result.non2xx}`);
        }
      }
    }
  }
} catch (error) {
  summary.error = { message: error.message, stack: error.stack }; console.error(error); process.exitCode=1;
} finally {
  if (browser) await browser.close().catch(()=>{});
  if (server) await new Promise(r=>server.close(r));
  for(const child of children) if (child.exitCode===null && !child.killed) {
    child.kill('SIGTERM');
    await new Promise(resolve=>{ child.once('exit',resolve); setTimeout(resolve,2000).unref(); });
  }
  if (db) await db.end().catch(()=>{});
  if (pg) await pg.stop().catch(()=>{});
  const logPath=path.join(work,'backend-server.txt');
  if(fs.existsSync(logPath)) {
    const log=fs.readFileSync(logPath,'utf8');
    fs.writeFileSync(path.join(out,'backend-server-tail.txt'),scrub(log.slice(-16000)));
    save('backend-log-metadata.json',{bytes:Buffer.byteLength(log),retainedTailCharacters:Math.min(log.length,16000),fullLog:'Temporary workspace backend-server.txt'});
  }
  // Redact local machine paths from persisted output without changing measured numbers.
  for(const f of files(out).filter(f=>/\.(json|txt)$/.test(f))) fs.writeFileSync(f,scrub(fs.readFileSync(f,'utf8')));
  summary.finishedAt=new Date().toISOString(); save('run-summary.json',summary);
  if(Object.values(summary.stages).some(stage=>stage.exitCode!==0 || stage.timedOut)) process.exitCode=1;
  console.log(`RESULTS ${out}`);
}
