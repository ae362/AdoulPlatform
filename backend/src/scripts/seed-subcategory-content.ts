import '../env';
import fs from 'node:fs';
import path from 'node:path';
import { supabase } from '../services/supabase';
import { TRPCError } from '@trpc/server';

function getFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function findRepoRoot(startDir: string) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    const frontendDir = path.join(dir, 'frontend');
    const migrationsDir = path.join(dir, 'migrations');
    if (fs.existsSync(frontendDir) && fs.existsSync(migrationsDir)) return dir;
    const next = path.dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return path.resolve(startDir);
}

function scanBalanced(source: string, openIndex: number, openChar: string, closeChar: string) {
  let depth = 0;
  let i = openIndex;
  let inString: null | "'" | '"' | '`' = null;
  let escape = false;

  for (; i < source.length; i++) {
    const ch = source[i];
    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }

    // skip line comments
    if (ch === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // skip block comments
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 1;
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;

    if (depth === 0 && i > openIndex) {
      return source.slice(openIndex, i + 1);
    }
  }

  throw new Error('Unbalanced expression while parsing seed data');
}

function extractSeedArrayLiteral(source: string) {
  const anchor = source.indexOf('const SEED');
  if (anchor === -1) throw new Error('SEED constant not found');
  const eq = source.indexOf('=', anchor);
  if (eq === -1) throw new Error('SEED initializer not found');
  const open = source.indexOf('[', eq);
  if (open === -1) throw new Error('SEED array opener not found');
  return scanBalanced(source, open, '[', ']');
}

function extractFallbackLiteral(source: string, name: 'heroTitle' | 'heroTagline' | 'heroKicker' | 'heroAccent') {
  const idx = source.indexOf(`const ${name}`);
  if (idx === -1) return undefined;
  const lineEnd = source.indexOf(';', idx);
  if (lineEnd === -1) return undefined;
  const stmt = source.slice(idx, lineEnd + 1);
  const coalesce = stmt.indexOf('??');
  if (coalesce === -1) return undefined;
  const expr = stmt.slice(coalesce + 2, stmt.length - 1).trim();
  try {
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${expr});`)() as string;
  } catch {
    return undefined;
  }
}

type SeedConfig = {
  key: string;
  section: 'knowledge' | 'news';
  file: string;
};

const SEED_CONFIGS: SeedConfig[] = [
  { key: 'content_professional_programs', section: 'knowledge', file: 'frontend/src/modules/knowledge/professionalPrograms.tsx' },
  { key: 'content_audiovisual_library', section: 'knowledge', file: 'frontend/src/modules/knowledge/audiovisualLibrary.tsx' },
  { key: 'content_digital_archive', section: 'knowledge', file: 'frontend/src/modules/knowledge/digitalArchive.tsx' },
  { key: 'content_meetings_dialogues', section: 'knowledge', file: 'frontend/src/modules/knowledge/meetingsDialogues.tsx' },
  { key: 'content_smart_reminder', section: 'news', file: 'frontend/src/modules/news/smartReminder.tsx' },
  { key: 'content_legal_news', section: 'news', file: 'frontend/src/modules/news/legalNews.tsx' },
  { key: 'content_legislative_changes', section: 'news', file: 'frontend/src/modules/news/legislativeChanges.tsx' },
];

async function seedOne(cfg: SeedConfig, opts: { force: boolean; merge: boolean }) {
  const { data: existing, error: existingError } = await supabase
    .from('cms_content')
    .select('key,value')
    .eq('key', cfg.key)
    .maybeSingle();

  if (existingError) throw existingError;

  const existingParsed = (() => {
    if (!existing?.value) return null;
    try {
      return JSON.parse(existing.value) as any;
    } catch {
      return null;
    }
  })();

  const repoRoot = findRepoRoot(process.cwd());
  const abs = path.join(repoRoot, cfg.file);
  if (!fs.existsSync(abs)) throw new Error(`Missing file: ${abs}`);

  const src = fs.readFileSync(abs, 'utf8');
  const seedArrayText = extractSeedArrayLiteral(src);
  // eslint-disable-next-line no-new-func
  const items = Function(`"use strict"; return (${seedArrayText});`)() as Array<Record<string, any>>;

  const hero: Record<string, any> = {
    ...(extractFallbackLiteral(src, 'heroTitle') ? { title: extractFallbackLiteral(src, 'heroTitle') } : {}),
    ...(extractFallbackLiteral(src, 'heroTagline') ? { tagline: extractFallbackLiteral(src, 'heroTagline') } : {}),
    ...(extractFallbackLiteral(src, 'heroKicker') ? { kicker: extractFallbackLiteral(src, 'heroKicker') } : {}),
    ...(extractFallbackLiteral(src, 'heroAccent') ? { accent: extractFallbackLiteral(src, 'heroAccent') } : {}),
  };

  if (!opts.force && existingParsed) {
    const existingItems = Array.isArray(existingParsed?.items) ? (existingParsed.items as Array<Record<string, any>>) : [];
    const existingHero = existingParsed?.hero && typeof existingParsed.hero === 'object' ? existingParsed.hero : {};

    if (existingItems.length && !opts.merge) {
      console.log(`[skip] ${cfg.key} already has items (${existingItems.length})`);
      return;
    }

    if (opts.merge) {
      const ids = new Set(existingItems.map((it) => String(it?.id ?? '')).filter(Boolean));
      const mergedItems = [...existingItems];
      let added = 0;
      for (const it of items) {
        const id = String((it as any)?.id ?? '');
        if (!id || ids.has(id)) continue;
        ids.add(id);
        mergedItems.push(it);
        added++;
      }

      const mergedHero: Record<string, any> = { ...existingHero };
      for (const k of Object.keys(hero)) {
        if (mergedHero[k] === undefined || mergedHero[k] === null || mergedHero[k] === '') mergedHero[k] = hero[k];
      }

      const payload = JSON.stringify({ hero: mergedHero, items: mergedItems });
      const now = new Date().toISOString();

      const { error: upsertError } = await supabase.from('cms_content').upsert(
        {
          key: cfg.key,
          value: payload,
          type: 'json',
          section: cfg.section,
          description: `Seeded subcategory content (merge): ${cfg.key}`,
          updated_at: now,
          updated_by: null,
        },
        { onConflict: 'key' },
      );

      if (upsertError) throw upsertError;
      console.log(`[ok] merged ${cfg.key}: +${added} (now ${mergedItems.length})`);
      return;
    }
  } else if (!opts.force && existing?.value && !existingParsed) {
    console.log(`[skip] ${cfg.key} already exists (non-JSON value)`);
    return;
  }

  const payload = JSON.stringify({ hero, items });
  const now = new Date().toISOString();

  const { error: upsertError } = await supabase.from('cms_content').upsert(
    {
      key: cfg.key,
      value: payload,
      type: 'json',
      section: cfg.section,
      description: `Seeded subcategory content: ${cfg.key}`,
      updated_at: now,
      updated_by: null,
    },
    { onConflict: 'key' },
  );

  if (upsertError) throw upsertError;
  console.log(`[ok] seeded ${cfg.key} (${items.length} items)`);
}

async function main() {
  const force = getFlag('force');
  const merge = getFlag('merge');
  const only = getArg('only'); // optional cms key

  try {
    const list = only ? SEED_CONFIGS.filter((c) => c.key === only) : SEED_CONFIGS;
    if (!list.length) throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown key: ${only}` });

    for (const cfg of list) {
      await seedOne(cfg, { force, merge });
    }

    console.log('Done.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();
