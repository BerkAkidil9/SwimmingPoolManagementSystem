import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const [job = 'all', shard = '1/1'] = process.argv.slice(2);
if (!['quality', 'tests', 'all'].includes(job) || !/^[1-9]\d*\/[1-9]\d*$/.test(shard)) {
  throw new Error('Usage: node tooling/ci/run.mjs [quality|tests|all] [shard/total]');
}
const [shardIndex, shardCount] = shard.split('/').map(Number);
if (shardIndex > shardCount) throw new Error('Shard index exceeds shard count');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'swim-ci-'));
const reportBase = process.env.CI_REPORT_DIR || (process.env.RUNNER_WORKSPACE
  ? path.join(process.env.RUNNER_WORKSPACE, 'swimcenter-ci-reports')
  : path.join(os.tmpdir(), 'swimcenter-ci-reports'));
const runId = process.env.GITHUB_RUN_ID || `local-${Date.now()}`;
const reportDir = path.join(reportBase, runId, process.env.GITHUB_RUN_ATTEMPT || '1', `${job}-${shard.replace('/', '-')}`);
fs.mkdirSync(reportDir, { recursive: true });
const summary = { job, shard, workers: 2, node: process.version,
  runner: process.env.RUNNER_NAME || 'local', commit: process.env.CI_SOURCE_SHA || process.env.GITHUB_SHA || null,
  startedAt: new Date().toISOString(), stages: {} };
const abort = new AbortController();
process.once('SIGINT', () => abort.abort());
process.once('SIGTERM', () => abort.abort());

// Do not inherit deployment credentials or environment files from the Mac.
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'SystemRoot'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
// RUNNER_TEMP is cleared between jobs; keep downloads in this runner's tool cache.
const cacheDir = path.join(process.env.RUNNER_TOOL_CACHE || os.tmpdir(), 'swimcenter-ci-cache');
Object.assign(env, {
  CI: 'true', NODE_ENV: 'test', TZ: 'Europe/Istanbul', USE_R2: 'false',
  GOOGLE_CLIENT_ID: 'ci-local-placeholder', GOOGLE_CLIENT_SECRET: 'ci-local-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_ci_placeholder', STRIPE_PUBLISHABLE_KEY: 'pk_test_ci_placeholder',
  REACT_APP_STRIPE_PUBLISHABLE_KEY: 'pk_test_ci_placeholder', SESSION_SECRET: randomBytes(32).toString('hex'),
  npm_config_cache: path.join(cacheDir, 'npm'),
  PLAYWRIGHT_BROWSERS_PATH: path.join(cacheDir, 'playwright'),
});

let pg, preview, backend, socketDir;
const children = new Set();
const saveSummary = () => fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
function start(executable, args, cwd, stageEnv, logName) {
  const log = fs.openSync(path.join(reportDir, logName + '.log'), 'w');
  const child = spawn(executable, args, { cwd, env: stageEnv, detached: true, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  children.add(child);
  child.once('exit', () => children.delete(child));
  return child;
}
async function command(name, executable, args, cwd, extra = {}, timeout = 600000) {
  abort.signal.throwIfAborted();
  console.log(`START ${name}`);
  const started = Date.now();
  const child = start(executable, args, cwd, { ...env, ...extra }, name);
  const onAbort = () => stop(child);
  abort.signal.addEventListener('abort', onAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; stop(child); }, timeout);
  try {
    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve(signal ? 1 : code));
    });
    summary.stages[name] = { exitCode, timedOut, seconds: (Date.now() - started) / 1000 };
    saveSummary();
    console.log(`END ${name}: ${exitCode === 0 && !timedOut ? 'passed' : 'failed'}`);
    if (exitCode !== 0 || timedOut) {
      console.error(fs.readFileSync(path.join(reportDir, name + '.log'), 'utf8').slice(-12000));
      throw new Error(`${name} failed${timedOut ? ' (timeout)' : ''}`);
    }
  } finally {
    clearTimeout(timer);
    abort.signal.removeEventListener('abort', onAbort);
  }
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function waitFor(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    abort.signal.throwIfAborted();
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('Backend exited before readiness');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Backend readiness timed out');
}
async function install(project) {
  await command(`install-${project.replaceAll('/', '-')}`, 'npm', ['ci', '--prefer-offline', '--no-audit', '--no-fund'], path.join(work, project));
}

try {
  const ignored = new Set(['node_modules', 'build', 'coverage', 'uploads', 'data', 'pgdata', 'playwright-report', 'test-results', '.git']);
  for (const project of ['backend', 'frontend', 'tests/e2e', 'tests/measurements']) {
    fs.cpSync(path.join(root, project), path.join(work, project), { recursive: true,
      filter: p => !ignored.has(path.basename(p)) && !path.basename(p).startsWith('.env') });
  }
  for (const file of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(root, file), path.join(work, file));
  fs.mkdirSync(path.join(work, 'backend/uploads'), { recursive: true });

  if (job !== 'tests') {
    // Read all five lockfiles, including development dependencies; keep every report on failure.
    let auditFailed = false;
    for (const project of ['.', 'backend', 'frontend', 'tests/e2e', 'tests/measurements']) {
      try {
        await command(`audit-${project === '.' ? 'root' : project.replaceAll('/', '-')}`, 'npm',
          ['audit', '--package-lock-only', '--json'], path.join(work, project), {}, 180000);
      } catch (error) {
        if (abort.signal.aborted) throw error;
        auditFailed = true;
      }
    }
    if (auditFailed) throw new Error('One or more npm audits failed; see the individual audit logs');
    await install('frontend');
    await command('build', process.execPath, ['node_modules/vite/bin/vite.js', 'build'], path.join(work, 'frontend'), { NODE_ENV: 'production' });
  }

  if (job !== 'quality') {
    await install('backend');
    if (job === 'tests') await install('frontend');
    await install('tests/e2e');
    const backendDir = path.join(work, 'backend');
    const frontendDir = path.join(work, 'frontend');
    const require = createRequire(path.join(backendDir, 'package.json'));
    const { default: EmbeddedPostgres } = await import(pathToFileURL(require.resolve('embedded-postgres')));
    const dbPort = await freePort();
    socketDir = fs.mkdtempSync('/tmp/swim-ci-pg-');
    const password = randomBytes(16).toString('hex');
    pg = new EmbeddedPostgres({ databaseDir: path.join(work, 'pgdata'), port: dbPort,
      user: 'postgres', password, persistent: false,
      postgresFlags: ['-h', '127.0.0.1', '-k', socketDir], onLog: () => {}, onError: message => console.error(message) });
    await pg.initialise();
    await pg.start();
    const schema = fs.readFileSync(path.join(backendDir, 'sql/schema_postgres.sql'), 'utf8');
    const databaseNames = ['swim_ci_app', 'swim_ci_worker_1', 'swim_ci_worker_2'];
    const urls = [];
    for (const database of databaseNames) {
      await pg.createDatabase(database);
      const url = `postgresql://postgres:${password}@127.0.0.1:${dbPort}/${database}`;
      const client = new (require('pg').Client)({ connectionString: url });
      try { await client.connect(); await client.query(schema); } finally { await client.end(); }
      urls.push(url);
    }
    Object.assign(env, { DATABASE_URL: urls[0], TEST_DATABASE_URL: urls[0],
      TEST_DATABASE_URL_1: urls[1], TEST_DATABASE_URL_2: urls[2] });
    summary.databaseIsolation = { separateCluster: true, workerDatabases: databaseNames.slice(1) };

    const guard = path.join(work, 'local-network-only.cjs');
    fs.writeFileSync(guard, `const net=require('node:net');const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args;
const host=typeof a[0]==='object'?a[0].host:typeof a[1]==='string'?a[1]:undefined;
if(host&&!['localhost','127.0.0.1','::1'].includes(host))throw Error('CI blocked non-local application connection');
return connect.apply(this,args);};\n`);
    const localOnly = { NODE_OPTIONS: `--require=${guard}` };
    const jestArgs = ['--maxWorkers=2', `--shard=${shard}`, '--silent', '--json'];
    await command('backend-unit', process.execPath, ['node_modules/jest/bin/jest.js', ...jestArgs,
      `--outputFile=${path.join(reportDir, 'backend-unit.json')}`], backendDir, localOnly);
    await command('backend-integration', process.execPath, ['node_modules/jest/bin/jest.js',
      '--config=jest.integration.config.js', '--forceExit', ...jestArgs,
      `--outputFile=${path.join(reportDir, 'backend-integration.json')}`], backendDir, localOnly);
    await command('frontend-unit', process.execPath, ['node_modules/jest/bin/jest.js',
      '--watchAll=false', '--forceExit', ...jestArgs,
      `--outputFile=${path.join(reportDir, 'frontend-unit.json')}`], frontendDir, localOnly);

    const apiPort = await freePort();
    const uiPort = await freePort();
    const apiUrl = `http://127.0.0.1:${apiPort}`;
    const uiUrl = `http://127.0.0.1:${uiPort}`;
    Object.assign(env, { PORT: String(apiPort), BACKEND_URL: apiUrl, FRONTEND_URL: uiUrl, REACT_APP_API_URL: apiUrl });
    await command('browser-build', process.execPath, ['node_modules/vite/bin/vite.js', 'build'], frontendDir, { NODE_ENV: 'production' });
    backend = start(process.execPath, ['index.js'], backendDir, { ...env, ...localOnly, NODE_ENV: 'development' }, 'backend-server');
    await waitFor(apiUrl + '/pools', backend);
    const vite = await import(pathToFileURL(path.join(frontendDir, 'node_modules/vite/dist/node/index.js')));
    preview = await vite.preview({ root: frontendDir, preview: { port: uiPort, host: '127.0.0.1', strictPort: true } });
    const e2eDir = path.join(work, 'tests/e2e');
    await command('install-chromium', process.execPath, ['node_modules/@playwright/test/cli.js', 'install', 'chromium'], e2eDir);
    const configFile = path.join(e2eDir, 'ci.config.cjs');
    fs.writeFileSync(configFile, `const base=require('./playwright.config.js');module.exports={...base,retries:0,
reporter:[['list'],['json',{outputFile:${JSON.stringify(path.join(reportDir, 'e2e.json'))}}]],
outputDir:${JSON.stringify(path.join(reportDir, 'e2e-artifacts'))},use:{...base.use,baseURL:${JSON.stringify(uiUrl)},
launchOptions:{args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1']}}};\n`);
    await command('e2e', process.execPath, ['node_modules/@playwright/test/cli.js', 'test',
      '--config=ci.config.cjs', '--workers=2', `--shard=${shard}`], e2eDir);
  }
} catch (error) {
  summary.error = error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  if (preview) await new Promise(resolve => preview.httpServer.close(resolve));
  for (const child of children) stop(child);
  await Promise.all([...children].map(child => new Promise(resolve => {
    child.once('exit', resolve);
    setTimeout(resolve, 5000).unref();
  })));
  if (pg) await pg.stop().catch(error => { summary.cleanupError = error.message; process.exitCode = 1; });
  if (socketDir) fs.rmSync(socketDir, { recursive: true, force: true });
  fs.rmSync(work, { recursive: true, force: true });
  summary.finishedAt = new Date().toISOString();
  summary.success = !process.exitCode;
  saveSummary();
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Native CI: ${job} (${shard})\n\nRunner: ${summary.runner}; test workers: 2.\n\nResult: ${summary.success ? 'passed' : 'failed'}. Local reports: \`${reportDir}\`.\n`);
  }
  console.log(`REPORTS ${reportDir}`);
}
