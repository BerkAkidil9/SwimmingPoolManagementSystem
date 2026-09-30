import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.env.MEASUREMENT_OUTPUT || path.join(root, 'docs/cv-metrics-evidence/local-measurements'));
const require = createRequire(path.join(root, 'backend/package.json'));
const { createCoverageMap } = require('istanbul-lib-coverage');
const read = name => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
const write = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2)+'\n');
const median = values => { const v = [...values].sort((a,b)=>a-b); return v.length % 2 ? v[(v.length-1)/2] : (v[v.length/2-1]+v[v.length/2])/2; };
const range = values => ({ median: median(values), min: Math.min(...values), max: Math.max(...values) });
const result = { environment: read('environment.json'), tests: {}, coverage: {}, bundle: {}, accessibility: {}, lighthouse: [], load: [] };
for (const name of ['backend-unit','backend-integration','frontend-tests']) {
  const j = read(name+'.json');
  result.tests[name] = { passed: j.numPassedTests, failed: j.numFailedTests, pending: j.numPendingTests, suites: j.numTotalTestSuites, passedSuites:j.numPassedTestSuites, success:j.success };
}
result.tests.e2e = read('e2e.json').stats;
for (const name of ['backend-unit','backend-integration','frontend']) result.coverage[name] = read(name+'-coverage/coverage-summary.json').total;
// Merge instrumented counters, never add percentages or counts from overlapping files.
const merged = createCoverageMap({});
for(const name of ['backend-unit','backend-integration']) {
  const raw=read(name+'-coverage/coverage-final.json');
  for(const [name, data] of Object.entries(raw)) {
    const normalized='backend/'+name.split('/backend/').at(-1);
    merged.addFileCoverage({...data,path:normalized});
  }
}
result.coverage['backend-combined'] = merged.getCoverageSummary().toJSON();
write('backend-combined-coverage.json', { total: result.coverage['backend-combined'], files: Object.fromEntries(merged.files().map(f=>[f,merged.fileCoverageFor(f).toSummary().toJSON()])) });
const bundle=read('bundle.json');
result.bundle={ entrypoints:bundle.entrypoints.map(name=>bundle.assets.find(a=>a.path===name)),
  totalJs:bundle.assets.filter(a=>a.path.endsWith('.js')).reduce((s,a)=>({bytes:s.bytes+a.bytes,gzipBytes:s.gzipBytes+a.gzipBytes,brotliBytes:s.brotliBytes+a.brotliBytes}),{bytes:0,gzipBytes:0,brotliBytes:0}),
  allAssetsExcludingSourceMaps:bundle.runtimeTotals };
const axe=read('accessibility.json');
result.accessibility={ scanCount:axe.length, routes:[...new Set(axe.map(a=>a.route))],
  uniqueViolationRules:[...new Set(axe.flatMap(a=>a.axe.violations.map(v=>v.id)))],
  scans:axe.map(a=>({route:a.route,viewport:a.viewport,finalUrl:a.finalUrl,errors:a.errors,
    horizontalOverflow:a.layout.scrollWidth>a.layout.width,scrollWidth:a.layout.scrollWidth,
    violations:a.axe.violations.map(v=>({id:v.id,impact:v.impact,affectedNodes:v.nodes.length})),
    incompleteRules:a.axe.incomplete.length,passedRules:a.axe.passes.length})) };
const lh=read('lighthouse-summary.json');
for(const route of [...new Set(lh.map(x=>x.route))]) {
  const all=lh.filter(x=>x.route===route), valid=all.filter(x=>!x.runtimeError && Object.values(x.scores).every(v=>typeof v==='number'));
  result.lighthouse.push({route,attempted:all.length,valid:valid.length,
    scores: valid.length ? Object.fromEntries(Object.keys(valid[0].scores).map(k=>[k,range(valid.map(x=>x.scores[k]*100))])) : {},
    metrics: valid.length ? Object.fromEntries(Object.keys(valid[0].metrics).map(k=>[k,range(valid.map(x=>x.metrics[k]))])) : {} });
}
const loads=read('load-results.json');
for(const endpoint of [...new Set(loads.map(x=>x.endpoint))]) for(const connections of [...new Set(loads.map(x=>x.connections))]) {
  const runs=loads.filter(x=>x.endpoint===endpoint&&x.connections===connections);
  result.load.push({ endpoint, connections, runs:runs.length, recordsPerResponse:runs[0].fixtureResponseRecords,
    requestsPerSecond:range(runs.map(x=>x.requests.average)), latencyP50Ms:range(runs.map(x=>x.latency.p50)), latencyP99Ms:range(runs.map(x=>x.latency.p99)),
    totalRequests:runs.reduce((s,x)=>s+x.requests.total,0), errors:runs.reduce((s,x)=>s+x.errors,0), timeouts:runs.reduce((s,x)=>s+x.timeouts,0),
    non2xx:runs.reduce((s,x)=>s+(x.non2xx||0),0), mismatches:runs.reduce((s,x)=>s+x.mismatches,0), durations:runs.map(x=>x.duration) });
}
write('summary.json',result);
console.log(JSON.stringify(result,null,2));
