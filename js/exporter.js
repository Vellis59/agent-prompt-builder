/**
 * exporter.js
 * Placeholder ZIP export flow (to be wired with JSZip or native compression strategy).
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerExporter(ns) {
  function exportZip() {
    // Phase-1 placeholder: export raw JSON file while ZIP integration is pending.
    const content = ns.generator?.generateConfig?.() || '{}';
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'agent-config.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  function boot() {
    ns.wizard?.renderSteps?.();

    const out = document.getElementById('output');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const genBtn = document.getElementById('btn-generate');
    const expBtn = document.getElementById('btn-export');

    prevBtn?.addEventListener('click', () => ns.wizard?.prev?.());
    nextBtn?.addEventListener('click', () => ns.wizard?.next?.());

    genBtn?.addEventListener('click', () => {
      const generated = ns.generator?.generateConfig?.() || '{}';
      if (out) out.textContent = generated;
      ns.storage?.set?.('lastGeneratedConfig', JSON.parse(generated));
    });

    expBtn?.addEventListener('click', exportZip);
  }

  ns.exporter = { exportZip };
  ns.boot = boot;
})(window.AgentPromptBuilder);
