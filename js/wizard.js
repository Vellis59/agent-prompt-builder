/**
 * wizard.js
 * Wizard state machine + form binding + template loading + step-level validation controls.
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

  let inputDebounce;

  function getStepStatus(stepIndex) {
    if (stepIndex > 3) return 'pending';
    const result = ns.validation?.validateStep?.(stepIndex, state.formData);
    return result?.valid ? 'complete' : 'error';
  }

  function renderSteps() {
    const root = document.getElementById('wizard-steps');
    if (!root) return;

    root.innerHTML = steps
      .map((step, idx) => {
        const active = idx === state.currentIndex;
        const status = getStepStatus(idx);
        const statusBadge =
          status === 'complete'
            ? '<span class="step-badge step-ok">✓</span>'
            : status === 'error'
              ? '<span class="step-badge step-error">!</span>'
              : '<span class="step-badge">•</span>';

        return `<li class="rounded-md border px-3 py-2 ${active ? 'border-cyan-400 text-cyan-300' : 'border-slate-700'}"><div class="step-line"><span>${idx + 1}. ${step.label}</span>${statusBadge}</div></li>`;
      })
      .join('');

    document.querySelectorAll('.wizard-panel').forEach((panel) => {
      const panelStep = Number(panel.dataset.step);
      panel.classList.toggle('hidden', panelStep !== state.currentIndex);
    });

    if (state.currentIndex === 4) {
      ns.validation?.renderErrorSummary?.();
    }
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

  function updateStepControls() {
    const nextBtn = document.getElementById('btn-next');
    if (!nextBtn) return;

    const isReview = state.currentIndex >= steps.length - 1;
    nextBtn.disabled = isReview;

    if (!isReview) {
      const stepValidation = ns.validation?.validateStep?.(state.currentIndex, state.formData) || { valid: true };
      nextBtn.disabled = !stepValidation.valid;
    }

    nextBtn.classList.toggle('opacity-60', nextBtn.disabled);
    nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
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
    ['name', 'role', 'tools'].forEach((field) => ns.validation?.updateFieldUI?.(field, state.formData[field]));
    renderSteps();
    updateStepControls();
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

  function applyRealtimeValidation() {
    ['name', 'role', 'tools'].forEach((field) => {
      ns.validation?.updateFieldUI?.(field, state.formData[field]);
    });

    updateStepControls();
    renderSteps();
  }

  function bindFormEvents() {
    const form = document.getElementById('agent-form');
    if (!form) return;

    form.addEventListener('input', () => {
      collectFormData();
      clearTimeout(inputDebounce);
      inputDebounce = setTimeout(() => {
        applyRealtimeValidation();
        ns.refreshPreview?.();
      }, 120);
    });

    form.addEventListener('change', () => {
      collectFormData();
      applyRealtimeValidation();
      ns.refreshPreview?.();
    });
  }

  function setCurrentStep(index) {
    const maxStep = steps.length - 1;
    state.currentIndex = Math.max(0, Math.min(index, maxStep));
    renderSteps();
    updateStepControls();
  }

  function next() {
    const currentValidation = ns.validation?.validateStep?.(state.currentIndex, state.formData) || { valid: true };
    if (!currentValidation.valid) {
      updateStepControls();
      return;
    }

    setCurrentStep(state.currentIndex + 1);
  }

  function prev() {
    setCurrentStep(state.currentIndex - 1);
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

    applyRealtimeValidation();
    ns.refreshPreview?.();
  }

  ns.wizard = {
    steps,
    state,
    next,
    prev,
    setCurrentStep,
    updateStepControls,
    renderSteps,
    init,
    collectFormData,
    setFormValues,
    applyTemplate
  };
})(window.AgentPromptBuilder);
