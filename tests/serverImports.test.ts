// The Vercel functions (api/**) run as plain Node ESM: every relative import must name the file
// with its extension ("./payableSummary.js"), or the function crashes on start with ERR_MODULE_NOT_FOUND.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');

function entries(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? entries(full) : name.endsWith('.ts') ? [full] : [];
  });
}

describe('Vercel functions', () => {
  it('import local files with their .js extension', () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    const queue = entries(path.join(root, 'api'));
    while (queue.length) {
      const file = queue.shift()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/^\s*(?:import|export)(?!\s+type\b)[^'"]*?from\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) {
        const spec = m[1];
        if (spec.endsWith('.json')) continue;
        if (!spec.endsWith('.js')) {
          missing.push(`${path.relative(root, file)} -> ${spec}`);
          continue;
        }
        queue.push(path.resolve(path.dirname(file), spec.replace(/\.js$/, '.ts')));
      }
    }
    expect(seen.size).toBeGreaterThan(5);
    expect(missing).toEqual([]);
  });
});
