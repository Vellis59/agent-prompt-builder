/**
 * preview.js
 * Live preview renderer for generated prompt files.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerPreview(ns) {
  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function highlightJson(code) {
    const escaped = escapeHtml(code);
    return escaped
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"\s*:)/g, '<span class="tok-key">$1</span>')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")/g, '<span class="tok-str">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="tok-bool">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  }

  function codeBlock(title, data) {
    const json = JSON.stringify(data, null, 2);
    return `
      <article class="preview-card">
        <h4>${title}</h4>
        <pre class="code-block"><code>${highlightJson(json)}</code></pre>
      </article>
    `;
  }

  function renderPreview(formData = {}) {
    const tools = (formData.tools || '').split(',').map((item) => item.trim()).filter(Boolean);
    const agents = (formData.agents || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ name: line }));

    const sections = [
      codeBlock('SOUL.md', {
        role: formData.role || '',
        guidingPrinciple: formData.soul || ''
      }),
      codeBlock('IDENTITY.md', {
        name: formData.name || '',
        hierarchy: formData.hierarchy || '',
        identity: formData.identity || ''
      }),
      codeBlock('TOOLS.md', {
        enabledTools: tools
      }),
      codeBlock('MEMORY.md', {
        strategy: formData.memory || '',
        notes: formData.memoryNotes || ''
      }),
      codeBlock('USER.md', {
        instructions: formData.userGuidelines || ''
      }),
      codeBlock('AGENTS.json', {
        children: agents
      })
    ];

    return `<div class="preview-grid">${sections.join('')}</div>`;
  }

  function refreshPreview() {
    const target = document.getElementById('live-preview');
    if (!target) return;

    const formData = ns.wizard?.state?.formData || {};
    target.innerHTML = renderPreview(formData);
  }

  ns.preview = {
    renderPreview,
    refreshPreview
  };
  ns.refreshPreview = refreshPreview;
})(window.AgentPromptBuilder);
