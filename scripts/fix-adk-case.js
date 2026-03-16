const fs = require('fs');
const path = require('path');

const workspaces = [
  'client-agent',
  'merchant-agent',
];

function ensureFile(source, target) {
  if (!fs.existsSync(source)) return;
  if (fs.existsSync(target)) return;
  fs.copyFileSync(source, target);
}

function fixWorkspace(ws) {
  const base = path.join(__dirname, '..', ws, 'node_modules', 'adk-typescript', 'dist', 'sessions');
  const lowerJs = path.join(base, 'state.js');
  const lowerDts = path.join(base, 'state.d.ts');
  const upperJs = path.join(base, 'State.js');
  const upperDts = path.join(base, 'State.d.ts');

  if (fs.existsSync(base)) {
    ensureFile(lowerJs, upperJs);
    ensureFile(lowerDts, upperDts);

    const map = [
      ['baseSessionService', 'BaseSessionService'],
      ['databaseSessionService', 'DatabaseSessionService'],
      ['inMemorySessionService', 'InMemorySessionService'],
      ['vertexAiSessionService', 'VertexAiSessionService'],
      ['sessionUtils', 'SessionUtils'],
    ];

    for (const [lower, upper] of map) {
      ensureFile(path.join(base, `${lower}.js`), path.join(base, `${upper}.js`));
      ensureFile(path.join(base, `${lower}.d.ts`), path.join(base, `${upper}.d.ts`));
    }
  }

  const toolsBase = path.join(__dirname, '..', ws, 'node_modules', 'adk-typescript', 'dist', 'tools');
  const lowerToolJs = path.join(toolsBase, 'toolContext.js');
  const lowerToolDts = path.join(toolsBase, 'toolContext.d.ts');
  const upperToolJs = path.join(toolsBase, 'ToolContext.js');
  const upperToolDts = path.join(toolsBase, 'ToolContext.d.ts');

  if (fs.existsSync(toolsBase)) {
    ensureFile(lowerToolJs, upperToolJs);
    ensureFile(lowerToolDts, upperToolDts);
  }
}

for (const ws of workspaces) {
  fixWorkspace(ws);
}

console.log('✅ adk-typescript case-fix applied (State.js, ToolContext.js, Session*Service.js)');
