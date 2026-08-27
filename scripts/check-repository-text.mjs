import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '--stage', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .map((entry) => {
    const match = /^(\d+) [0-9a-f]+ \d+\t(.+)$/u.exec(entry);
    if (!match) throw new Error(`Không đọc được git index entry: ${entry}`);
    return { mode: match[1], path: match[2] };
  });

const failures = [];
for (const file of tracked) {
  if (file.path.startsWith('ops/scripts/') && file.path.endsWith('.sh')) {
    const bytes = readFileSync(file.path);
    if (bytes.includes(Buffer.from('\r\n'))) failures.push(`${file.path}: phải dùng LF`);
    if (file.mode !== '100755') failures.push(`${file.path}: phải có Git mode 100755`);
  }
}

const readme = readFileSync('README.md');
if (
  (readme[0] === 0xff && readme[1] === 0xfe) ||
  (readme[0] === 0xfe && readme[1] === 0xff)
) {
  failures.push('README.md: không được dùng UTF-16 BOM');
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Repository text policy: OK\n');
}
