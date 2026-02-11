/**
 * generator.js
 * Builds generated config artifacts from wizard state + selected template.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerGenerator(ns) {
  function generateArtifacts(formData = {}) {
    const tools = (formData.tools || '').split(',').map((item) => item.trim()).filter(Boolean);
    const agents = (formData.agents || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    return {
      'SOUL.md': {
        role: formData.role || '',
        principle: formData.soul || ''
      },
      'IDENTITY.md': {
        name: formData.name || '',
        hierarchy: formData.hierarchy || '',
        identity: formData.identity || ''
      },
      'TOOLS.md': {
        enabled: tools
      },
      'MEMORY.md': {
        mode: formData.memory || '',
        notes: formData.memoryNotes || ''
      },
      'USER.md': {
        guidelines: formData.userGuidelines || ''
      },
      'AGENTS.json': {
        agents
      }
    };
  }

  function generateConfig() {
    const wizardState = ns.wizard?.state || {};
    const formData = wizardState.formData || {};

    const payload = {
      app: 'agent-prompt-builder',
      version: '0.2.0',
      generatedAt: new Date().toISOString(),
      templateId: formData.templateId || null,
      wizardState,
      files: generateArtifacts(formData)
    };

    return JSON.stringify(payload, null, 2);
  }

  ns.generator = { generateConfig, generateArtifacts };
})(window.AgentPromptBuilder);
