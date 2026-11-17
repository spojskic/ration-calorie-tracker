/**
 * Enforces the house commit naming on pull requests: the PR title and every commit subject must be a
 * conventional commit (`type(scope): subject`). The PR title matters most: squash merges make it THE
 * commit message on main. Zero dependencies, so it runs anywhere (see the `conventions` job in ci.yml).
 *
 * Usage: check-conventions.mjs "<PR title>"   (commit subjects arrive on stdin, one per line)
 * Exit 0 when everything conforms; exit 1 with a per-item report otherwise.
 */

import { readFileSync } from 'node:fs';

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];

/** `type(scope)!: subject` — scope is lowercase (house style: app, ai, db, health, ...), subject non-empty. */
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9._/-]+\\))?!?:\\s\\S`);

const [title] = process.argv.slice(2);
if (!title) {
  console.error('Usage: check-conventions.mjs "<PR title>" (subjects on stdin)');
  process.exit(1);
}

const subjects = [title, ...readFileSync(0, 'utf8').split('\n').map((s) => s.trim())]
  .filter(Boolean)
  // Merge commits carry no convention (and squash merges mean there should not be any).
  .filter((s) => !s.startsWith('Merge '));

const offenders = subjects.filter((s) => !PATTERN.test(s));

if (offenders.length === 0) {
  console.log(`Conventions OK (${subjects.length} checked: PR title + commit subjects)`);
  process.exit(0);
}

console.error(`Not conventional-commit shaped (${offenders.length} of ${subjects.length}):`);
for (const s of offenders) console.error(`  ✗ ${s}`);
console.error(
  `\nExpected: <type>(<scope>): <subject>\nTypes: ${TYPES.join(', ')}\nScope optional, lowercase (e.g. app, ai, db, health).\n` +
    'The PR title becomes the commit message on merge (squash), so it follows the same rule.',
);
process.exit(1);
