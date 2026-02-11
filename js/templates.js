/**
 * templates.js
 * Loads starter templates from /templates folder.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerTemplates(ns) {
  const TEMPLATE_FILES = [
    'orchestrator-agent.json',
    'developer-agent.json',
    'telegram-news-agent.json'
  ];

  const cache = new Map();

  async function fetchTemplateFile(fileName) {
    if (cache.has(fileName)) return cache.get(fileName);

    const response = await fetch(`./templates/${fileName}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load template: ${fileName}`);
    }

    const data = await response.json();
    cache.set(fileName, data);
    return data;
  }

  async function loadAllTemplates() {
    const loaded = await Promise.all(TEMPLATE_FILES.map((file) => fetchTemplateFile(file)));
    return loaded;
  }

  async function loadTemplate(templateId) {
    const templates = await loadAllTemplates();
    const match = templates.find((tpl) => tpl.id === templateId);
    if (!match) throw new Error(`Template not found: ${templateId}`);
    return match;
  }

  async function listTemplates() {
    const templates = await loadAllTemplates();
    return templates.map(({ id, name, description }) => ({ id, name, description }));
  }

  ns.templates = {
    loadTemplate,
    listTemplates,
    loadAllTemplates
  };
})(window.AgentPromptBuilder);
