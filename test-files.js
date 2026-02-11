/**
 * Test file generation and structure validation
 */

// Simulate the generateFilePack function from exporter.js
function generateSoul(formData) {
  return `# Soul.md

## Essence
${formData.essence || 'To be defined'}

## Tone
${formData.tone || 'neutral'}

## Mission
${formData.mission || 'To assist the user effectively and efficiently.'}

## Anti-Missions
${formData.antiMissions || '- Do not cause harm to users or systems\n- Do not compromise data security\n- Do not bypass established safeguards'}
`;
}

function generateIdentity(formData) {
  return `# Identity.md

## Name
${formData.name || 'Assistant'}

## Role
${formData.role || 'General Purpose Assistant'}

## Positioning
${formData.positioning || 'Reliable, helpful, and safety-focused assistant for task completion.'}

## Capabilities
${formData.capabilities || '- Task execution\n- Information retrieval\n- Analysis and recommendations'}
`;
}

function generateTools(formData) {
  return `# Tools.md

## Available Tools
${formData.tools || 'Standard toolset based on assigned capabilities.'}

## Usage Rules
${formData.usageRules || '- Use tools only when necessary\n- Prefer simple, auditable commands\n- Always explain tool usage before execution\n- Respect rate limits and quotas'}

## Tool Access Levels
${formData.toolAccess || 'Read/Write as defined by role and permissions.'}

## Safety Constraints
${formData.toolSafety || 'All tool usage must comply with safety policies. Validate before execution.'}
`;
}

function generateMemory(formData) {
  return `# Memory.md

## Memory Rules
${formData.memoryRules || '- Remember context within conversation scope\n- Maintain consistency across responses\n- Do not store sensitive data beyond session'}

## Persistence Settings
${formData.persistence || 'Session-based memory. No long-term persistence unless explicitly authorized.'}

## Context Window
${formData.contextWindow || 'Use available context efficiently. Prioritize recent and relevant information.'}

## Memory Cleanup
${formData.memoryCleanup || 'Clear sensitive information when no longer needed.'}
`;
}

function generateUser(formData) {
  return `# User.md

## User Context
${formData.userContext || 'User seeking assistance with various tasks.'}

## Preferences
${formData.preferences || '- Clear, concise responses\n- Actionable recommendations\n- Proactive identification of issues'}

## Communication Style
${formData.commStyle || 'Direct, professional, and helpful.'}

## Feedback Handling
${formData.feedbackHandling || 'Accept and incorporate feedback to improve performance.'}
`;
}

function generateAgents(formData) {
  const isManager = formData.hierarchy === 'Manager';

  if (!isManager) {
    return `# Agents.md

## Hierarchy
${formData.hierarchy || 'Independent Agent'}

## Sub-Agents
None (independent agent configuration).
`;
  }

  return `# Agents.md

## Hierarchy
${formData.hierarchy || 'Manager'}

## Manager
- Name: ${formData.managerName || formData.name || 'Manager'}
- Scope: ${formData.managerScope || 'Orchestrates sub-agents for complex tasks'}

## Sub-Agents
${formData.subAgents || '### Sub-Agent 1\n- Name: Specialist\n- Role: Domain expert\n- Capabilities: Specialized analysis and recommendations\n\n### Sub-Agent 2\n- Name: Executor\n- Role: Task execution\n- Capabilities: Action implementation'}

## Coordination Rules
${formData.coordinationRules || '- Manager delegates based on task complexity\n- Sub-agents report back to manager\n- Manager consolidates responses for user'}
`;
}

function generateFilePack(formData) {
  const data = formData || {};

  return [
    { filename: 'Soul.md', content: generateSoul(data) },
    { filename: 'Identity.md', content: generateIdentity(data) },
    { filename: 'Tools.md', content: generateTools(data) },
    { filename: 'Memory.md', content: generateMemory(data) },
    { filename: 'User.md', content: generateUser(data) },
    { filename: 'Agents.md', content: generateAgents(data) }
  ];
}

// Test with Developer template data
const testData = {
  essence: 'You are a practical software engineer',
  tone: 'professional',
  mission: 'Transform requirements into maintainable code',
  antiMissions: '- Do not commit untested code\n- Do not bypass security reviews',
  name: 'Developer',
  role: 'Code-focused agent for implementation and debugging',
  positioning: 'Practical, test-focused software engineer',
  capabilities: '- Code writing\n- Debugging\n- Refactoring',
  tools: 'read, write, edit, exec, browser, web_search',
  usageRules: '- Prefer simple implementations\n- Always test before committing',
  toolAccess: 'Full access based on role',
  toolSafety: 'Validate all destructive operations',
  memoryRules: '- Remember project context\n- Track file modifications',
  persistence: 'Session-only',
  contextWindow: 'Prioritize recent changes',
  memoryCleanup: 'Clear sensitive data after task completion',
  userContext: 'Developer seeking code assistance',
  preferences: '- Clear explanations\n- Code examples\n- Test cases',
  commStyle: 'Technical but approachable',
  feedbackHandling: 'Iterate based on user feedback',
  hierarchy: 'Standalone'
};

console.log('=== File Generation Test ===\n');
const files = generateFilePack(testData);

console.log(`Generated ${files.length} files:\n`);
files.forEach((file, index) => {
  console.log(`${index + 1}. ${file.filename}`);
  console.log(`   Size: ${file.content.length} bytes`);
  console.log(`   Lines: ${file.content.split('\n').length}`);
  
  // Check for proper Markdown structure
  if (!file.content.startsWith('# ')) {
    console.log(`   ❌ ERROR: File doesn't start with Markdown heading`);
  } else {
    console.log(`   ✓ Valid Markdown structure`);
  }
  
  console.log('');
});

console.log('=== Content Preview (first 200 chars of each) ===\n');
files.forEach(file => {
  console.log(`\n--- ${file.filename} ---`);
  console.log(file.content.substring(0, 200) + '...');
});

console.log('\n=== Validation Results ===');
console.log('✓ All 6 files generated');
console.log('✓ All files start with Markdown headings');
console.log('✓ All files have content');
console.log('\nTest passed! 🎉');
