const fs = require('node:fs');
const path = require('node:path');

const routeRoot = path.join(process.cwd(), 'src', 'app');
const nodeBuiltins = [
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'diagnostics_channel',
  'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
  'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'trace_events',
  'tty', 'url', 'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
];
const builtinPattern = nodeBuiltins.join('|');
const nodeImportPattern = new RegExp(
  `\\b(?:from\\s*|require\\s*\\(\\s*|import\\s*\\(\\s*)['"](?:node:)?(?:${builtinPattern})(?:/[^'"]*)?['"]`,
  'g',
);
const testImportPattern = /@testing-library\/|jest-expo|(?:^|[^\w])jest(?:[./\s]|$)/gm;
const testFilePattern = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const jestSetupFilePattern = /(?:^|[._-])jest(?:[._-]|$)|jest\.setup/i;
const violations = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    const relative = path.relative(process.cwd(), file);
    if (testFilePattern.test(entry.name) || jestSetupFilePattern.test(entry.name)) {
      violations.push(`${relative}: test/spec or Jest setup files do not belong in src/app`);
      continue;
    }
    const source = fs.readFileSync(file, 'utf8');
    if (testImportPattern.test(source)) {
      violations.push(`${relative}: Jest or testing-library imports do not belong in src/app`);
    }
    testImportPattern.lastIndex = 0;
    if (nodeImportPattern.test(source)) {
      violations.push(`${relative}: Node builtin imports do not belong in src/app`);
    }
    nodeImportPattern.lastIndex = 0;
  }
}

visit(routeRoot);

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
}
