/**
 * wizard.js
 * Wizard state machine + form binding + template loading.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerWizard(ns) {
  const steps = [
    { id: 'role', label: 'Role & Persona' },
    { id: 'constraints', label: 'Constraints & Policies' },
    { id: 'tools', label: 'Tools & Permissions' },
    { id: 'output', label: 'Memory & User Rules' },
    { id: 'review', label: 'Review & Generate' }
  ];

  const state = {
    currentIndex: 0,
    formData: {
      templateId: '',
      name: '',
      role: '',
      soul: '',
      identity: '',
      tools: '',
      hierarchy: 'Standalone',
      memory: 'Session-only',
      memoryNotes: '',
      userGuidelines: '',
      agents: ''
    }
  };

  function renderSteps() {
    const root = document.getElementById('wizard-steps');
    if (!root) return;

    root.innerHTML = steps
      .map((step, idx) => {
        const active = idx === state.currentIndex;
        return `<li class="rounded-md border px-3 py-2 ${active ? 'border-cyan-400 text-cyan-300' : 'border-slate-700'}">${idx + 1}. ${step.label}</li>`;
      })
      .join('');

    document.querySelectorAll('.wizard-panel').forEach((panel) => {
      const panelStep = Number(panel.dataset.step);
      panel.classList.toggle('hidden', panelStep !== state.currentIndex);
    });
  }

  function setFormValues(data = {}) {
    const form = document.getElementById('agent-form');
    if (!form) return;

    Object.entries(data).forEach(([key, value]) => {
      if (!(key in state.formData)) return;
      state.formData[key] = typeof value === 'string' ? value : value ?? '';

      const field = form.elements.namedItem(key);
      if (field) field.value = state.formData[key];
    });
  }

  function collectFormData() {
    const form = document.getElementById('agent-form');
    if (!form) return state.formData;

    const formData = new FormData(form);
    for (const key of Object.keys(state.formData)) {
      const value = formData.get(key);
      state.formData[key] = typeof value === 'string' ? value : '';
    }

    ns.storage?.set?.('wizardFormData', state.formData);
    return state.formData;
  }

  async function applyTemplate(templateId) {
    if (!templateId) return;

    const template = await ns.templates?.loadTemplate?.(templateId);
    if (!template) return;

    setFormValues({
      templateId: template.id,
      name: template.name || '',
      role: template.role || '',
      soul: template.soul || '',
      identity: template.identity || '',
      tools: (template.tools || []).join(', '),
      hierarchy: template.hierarchy || 'Standalone',
      memory: template.memory || 'Session-only',
      memoryNotes: '',
      userGuidelines: template.userGuidelines || '',
      agents: (template.agents || []).map((agent) => agent.name).join('\n')
    });

    collectFormData();
    ns.refreshPreview?.();
  }

  async function hydrateTemplateSelector() {
    const select = document.getElementById('template-select');
    if (!select) return;

    const templates = (await ns.templates?.listTemplates?.()) || [];
    select.innerHTML = [
      '<option value="">Select a starter template</option>',
      ...templates.map((tpl) => `<option value="${tpl.id}">${tpl.name} — ${tpl.description}</option>`)
    ].join('');

    select.addEventListener('change', async (event) => {
      const templateId = event.target.value;
      state.formData.templateId = templateId;
      await applyTemplate(templateId);
    });
  }

  function bindFormEvents() {
    const form = document.getElementById('agent-form');
    if (!form) return;

    form.addEventListener('input', () => {
      collectFormData();
      ns.refreshPreview?.();
    });

    form.addEventListener('change', () => {
      collectFormData();
      ns.refreshPreview?.();
    });
  }

  function next() {
    state.currentIndex = Math.min(state.currentIndex + 1, steps.length - 1);
    renderSteps();
  }

  function prev() {
    state.currentIndex = Math.max(state.currentIndex - 1, 0);
    renderSteps();
  }

  async function init() {
    renderSteps();
    await hydrateTemplateSelector();
    bindFormEvents();

    const saved = ns.storage?.get?.('wizardFormData', null);
    if (saved) {
      setFormValues(saved);
      collectFormData();
    }

    ns.refreshPreview?.();
  }

  ns.wizard = { steps, state, next, prev, renderSteps, init, collectFormData, applyTemplate };
})(window.AgentPromptBuilder);
