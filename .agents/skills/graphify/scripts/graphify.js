#!/usr/bin/env node

/**
 * Graphify: Codebase Knowledge Graph Engine for Antigravity
 *
 * Fast, self-contained AST & dependency relationship graph analyzer.
 * Builds persistent, queryable structural maps of the codebase without external heavy dependencies.
 */

const fs = require('fs');
const path = require('path');

// Dynamically resolve repository root
let ROOT_DIR = path.resolve(__dirname, '../../../..');
if (!fs.existsSync(path.join(ROOT_DIR, 'package.json')) && fs.existsSync(path.join(ROOT_DIR, '..', 'package.json'))) {
  ROOT_DIR = path.resolve(ROOT_DIR, '..');
}
const GRAPH_DIR = path.join(ROOT_DIR, '.graphify');
const GRAPH_FILE = path.join(GRAPH_DIR, 'graph.json');

const TARGET_DIRS = ['frontend/src', 'backend/src', 'shared'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.sql'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Extract imported paths and declared export symbols using fast AST regex tokenization.
 */
function parseFile(filePath, content) {
  const relPath = normalizePath(path.relative(ROOT_DIR, filePath));
  const imports = [];
  const exports = [];

  // Match import statements: import ... from '...'
  const importRegex = /import\s+(?:(?:\{([^}]+)\})|(?:(\w+))|(?:\*\s+as\s+(\w+)))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const named = match[1] ? match[1].split(',').map((s) => s.trim().split(' as ')[0].trim()).filter(Boolean) : [];
    const def = match[2] ? [match[2].trim()] : [];
    const star = match[3] ? [match[3].trim()] : [];
    const source = match[4];

    imports.push({
      source,
      symbols: [...named, ...def, ...star],
    });
  }

  // Match dynamic imports
  const dynImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynImportRegex.exec(content)) !== null) {
    imports.push({ source: match[1], symbols: ['*dynamic*'] });
  }

  // Match exports: export function X, export const X, export type X, export interface X
  const exportRegex = /export\s+(?:default\s+)?(?:(?:function|const|class|type|interface|enum)\s+(\w+)|(?:\{([^}]+)\}))/g;
  while ((match = exportRegex.exec(content)) !== null) {
    if (match[1]) exports.push(match[1]);
    if (match[2]) {
      const symbols = match[2].split(',').map((s) => s.trim().split(' as ')[0].trim()).filter(Boolean);
      exports.push(...symbols);
    }
  }

  return {
    path: relPath,
    imports,
    exports: [...new Set(exports)],
    sizeBytes: content.length,
    lineCount: content.split('\n').length,
  };
}

function resolveImportTarget(sourcePath, importSource) {
  if (!importSource.startsWith('.')) {
    // Check for root-relative or shared alias
    if (importSource.startsWith('shared') || importSource.startsWith('../../shared')) {
      return 'shared/index.ts';
    }
    return null; // External npm package
  }

  const sourceDir = path.dirname(path.join(ROOT_DIR, sourcePath));
  const candidateBase = path.resolve(sourceDir, importSource);

  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
  for (const ext of extensions) {
    const full = candidateBase + ext;
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return normalizePath(path.relative(ROOT_DIR, full));
    }
  }

  return null;
}

function buildGraph() {
  console.log('🔍 [Graphify] Scanning codebase to construct knowledge graph...');
  const nodes = {};
  const edges = [];

  function scanDir(dir) {
    const fullDir = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(fullDir)) return;

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(fullDir, entry.name);
      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', 'dist-build', '.git', '.graphify'].includes(entry.name)) {
          scanDir(path.join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (EXTENSIONS.includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const fileData = parseFile(fullPath, content);
            nodes[fileData.path] = fileData;
          } catch {
            // ignore unreadable files
          }
        }
      }
    }
  }

  for (const dir of TARGET_DIRS) {
    scanDir(dir);
  }

  // Build edges
  for (const [filePath, fileData] of Object.entries(nodes)) {
    for (const imp of fileData.imports) {
      const resolvedTarget = resolveImportTarget(filePath, imp.source);
      if (resolvedTarget && nodes[resolvedTarget]) {
        edges.push({
          source: filePath,
          target: resolvedTarget,
          symbols: imp.symbols,
          type: 'imports',
        });
      }
    }
  }

  const graph = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    stats: {
      totalFiles: Object.keys(nodes).length,
      totalEdges: edges.length,
    },
    nodes,
    edges,
  };

  ensureDir(GRAPH_DIR);
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2), 'utf8');
  console.log(`✅ [Graphify] Knowledge graph built successfully!`);
  console.log(`   - Nodes (Files): ${graph.stats.totalFiles}`);
  console.log(`   - Edges (Dependencies): ${graph.stats.totalEdges}`);
  console.log(`   - Saved to: ${normalizePath(path.relative(ROOT_DIR, GRAPH_FILE))}`);
  return graph;
}

function loadGraph() {
  if (!fs.existsSync(GRAPH_FILE)) {
    return buildGraph();
  }
  try {
    return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
  } catch {
    return buildGraph();
  }
}

function queryGraph(searchTerm) {
  const graph = loadGraph();
  const term = searchTerm.toLowerCase();

  console.log(`\n🔎 [Graphify Query] Searching for: "${searchTerm}"\n`);

  // Find matching nodes or symbols
  const matchingFiles = Object.keys(graph.nodes).filter((p) => p.toLowerCase().includes(term));
  const symbolMatches = [];

  for (const [filePath, node] of Object.entries(graph.nodes)) {
    const matchedExports = node.exports.filter((exp) => exp.toLowerCase().includes(term));
    if (matchedExports.length > 0) {
      symbolMatches.push({ filePath, symbols: matchedExports });
    }
  }

  if (matchingFiles.length === 0 && symbolMatches.length === 0) {
    console.log(`No direct matches found for "${searchTerm}".`);
    return;
  }

  const targetFile = matchingFiles[0] || symbolMatches[0]?.filePath;
  console.log(`🎯 Primary Target: ${targetFile}`);

  // Incoming connections (who imports this target)
  const incoming = graph.edges.filter((e) => e.target === targetFile);
  console.log(`\n📥 Inward Blast Radius (${incoming.length} dependent files):`);
  incoming.slice(0, 15).forEach((e) => {
    console.log(`   ← ${e.source} [uses: ${e.symbols.join(', ')}]`);
  });
  if (incoming.length > 15) console.log(`   ... and ${incoming.length - 15} more files`);

  // Outgoing connections (what does this target import)
  const outgoing = graph.edges.filter((e) => e.source === targetFile);
  console.log(`\n📤 Outward Dependencies (${outgoing.length} imported files):`);
  outgoing.slice(0, 15).forEach((e) => {
    console.log(`   → ${e.target} [uses: ${e.symbols.join(', ')}]`);
  });
  if (outgoing.length > 15) console.log(`   ... and ${outgoing.length - 15} more files`);

  // Declared exports
  const node = graph.nodes[targetFile];
  if (node && node.exports.length > 0) {
    console.log(`\n📦 Exported Symbols (${node.exports.length}):`);
    console.log(`   ${node.exports.join(', ')}`);
  }
}

function printStats() {
  const graph = loadGraph();
  console.log(`\n📊 [Graphify Codebase Structural Summary]`);
  console.log(`   - Total Monitored Files: ${graph.stats.totalFiles}`);
  console.log(`   - Total Cross-File Dependency Links: ${graph.stats.totalEdges}`);

  // Calculate highest connectivity hubs
  const inDegree = {};
  for (const edge of graph.edges) {
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  const topHubs = Object.entries(inDegree)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  console.log(`\n👑 Core Architectural Hubs (Highest Imported Modules):`);
  topHubs.forEach(([file, count], i) => {
    console.log(`   ${i + 1}. ${file} (${count} dependents)`);
  });
  console.log();
}

// CLI Command Dispatcher
const command = process.argv[2] || 'index';
const arg = process.argv[3];

if (command === 'index') {
  buildGraph();
} else if (command === 'query') {
  if (!arg) {
    console.error('Usage: node graphify.js query <symbol_or_path>');
    process.exit(1);
  }
  queryGraph(arg);
} else if (command === 'stats') {
  printStats();
} else {
  console.log('Usage:');
  console.log('  node graphify.js index       # Build/refresh code knowledge graph');
  console.log('  node graphify.js query <sym> # Query callers, dependencies, and blast radius');
  console.log('  node graphify.js stats       # Print architectural hubs and graph metrics');
}
