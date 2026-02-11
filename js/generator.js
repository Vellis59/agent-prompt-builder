/**
 * generator.js
 * Builds generated config artifacts from wizard state + selected template.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerGenerator(ns) {
  function generateConfig() {
    const wizardState = ns.wizard?.state || {};
    const templates = ns.templates || [];

    const payload = {
      app: 'agent-prompt-builder',
      version: '0.1.0',
      generatedAt: new Date().toISOString(),
      wizardState,
      templates
    };

    return JSON.stringify(payload, null, 2);
  }

  ns.generator = { generateConfig };
})(window.AgentPromptBuilder);
