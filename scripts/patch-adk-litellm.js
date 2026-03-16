const fs = require('fs');
const path = require('path');

const workspaces = ['client-agent', 'merchant-agent'];

function patchFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;

  content = content.replace(
    "tool_call_id: part.functionResponse.id || '',",
    "tool_call_id: part.functionResponse.id || part.functionResponse.name || '',",
  );

  content = content.replace(
    "id: part.functionCall.id || '',",
    "id: part.functionCall.id || part.functionCall.name || '',",
  );

  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

let patched = 0;
for (const ws of workspaces) {
  const filePath = path.join(__dirname, '..', ws, 'node_modules', 'adk-typescript', 'dist', 'models', 'LiteLlm.js');
  if (patchFile(filePath)) patched++;
}

console.log(`✅ patched LiteLlm tool_call_id mapping in ${patched} workspace(s)`);
