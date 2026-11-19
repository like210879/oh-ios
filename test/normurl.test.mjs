// Unit tests for the address parsing used by www/index.html.
// Run with: node test/normurl.test.mjs
import assert from 'node:assert/strict';

function normUrl(input) {
  let v = String(input || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
  try {
    const u = new URL(v);
    if (!u.port) u.port = u.protocol === 'https:' ? '443' : '8000';
    return u.origin;
  } catch (e) { return ''; }
}

const cases = [
  ['192.168.0.100', 'http://192.168.0.100:8000'],
  ['192.168.0.100:8000', 'http://192.168.0.100:8000'],
  ['http://192.168.1.58/', 'http://192.168.1.58:8000'],
  ['  laptop.local  ', 'http://laptop.local:8000'],
  ['http://10.0.0.5:8080', 'http://10.0.0.5:8080'],
  // 443 is the https default, so it is canonically absent from origin
  ['https://192.168.0.100', 'https://192.168.0.100'],
  ['https://foo.tailnet.ts.net:8443', 'https://foo.tailnet.ts.net:8443'],
  ['192.168.1.58', 'http://192.168.1.58:8000'],
  ['10.0.0.7', 'http://10.0.0.7:8000'],
  ['', ''],
  ['   ', ''],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = normUrl(input);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${JSON.stringify(input)} -> ${JSON.stringify(got)}` +
    (ok ? '' : `   expected ${JSON.stringify(expected)}`));
}

assert.equal(failed, 0, `${failed} case(s) failed`);
console.log(`\n${cases.length - failed}/${cases.length} passed`);
