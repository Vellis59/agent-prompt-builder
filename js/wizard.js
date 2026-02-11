/**
 * wizard.js
 * Basic wizard state machine and UI rendering hooks.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerWizard(ns) {
  const steps = [
    { id: 'role', label: 'Role & Persona' },
    { id: 'constraints', label: 'Constraints & Policies' },
    { id: 'tools', label: 'Tools & Permissions' },
    { id: 'output', label: 'Output Preferences' },
    { id: 'review', label: 'Review & Generate' }
  ];

  const state = {
    currentIndex: 0,
    formData: {}
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
  }

  function next() {
    state.currentIndex = Math.min(state.currentIndex + 1, steps.length - 1);
    renderSteps();
  }

  function prev() {
    state.currentIndex = Math.max(state.currentIndex - 1, 0);
    renderSteps();
  }

  ns.wizard = { steps, state, next, prev, renderSteps };
})(window.AgentPromptBuilder);
