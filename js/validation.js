/**
 * validation.js
 * Real-time validation engine + lightweight UI feedback helpers.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerValidation(ns) {
  const RULES = {
    name: {
      required: true,
      minLength: 3,
      pattern: /^[a-z0-9]+$/i,
      message: 'Agent name must be alphanumeric (letters/numbers only) and at least 3 characters.'
    },
    role: {
      required: true,
      minLength: 20,
      message: 'Role description is required and must be at least 20 characters.'
    },
    tools: {
      required: true,
      message: 'Select at least one tool.'
    }
  };

  function splitTools(value = '') {
    return String(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function validateField(field, value) {
    const raw = typeof value === 'string' ? value : String(value ?? '');
    const trimmed = raw.trim();

    if (!RULES[field]) {
      return { valid: true, error: '' };
    }

    if (field === 'name') {
      if (!trimmed) return { valid: false, error: 'Agent name is required.' };
      if (trimmed.length < RULES.name.minLength) {
        return { valid: false, error: 'Agent name must be at least 3 characters.' };
      }
      if (!RULES.name.pattern.test(trimmed)) {
        return { valid: false, error: 'Agent name can only include letters and numbers (no spaces/symbols).' };
      }
      return { valid: true, error: '' };
    }

    if (field === 'role') {
      if (!trimmed) return { valid: false, error: 'Role description is required.' };
      if (trimmed.length < RULES.role.minLength) {
        return { valid: false, error: 'Role description must be at least 20 characters.' };
      }
      return { valid: true, error: '' };
    }

    if (field === 'tools') {
      if (splitTools(raw).length < 1) {
        return { valid: false, error: 'Add at least one tool (comma-separated).' };
      }
      return { valid: true, error: '' };
    }

    return { valid: true, error: '' };
  }

  function validateStep(stepNumber, formData = ns.wizard?.state?.formData || {}) {
    const errors = [];

    if (stepNumber === 0) {
      const nameResult = validateField('name', formData.name || '');
      const roleResult = validateField('role', formData.role || '');
      if (!nameResult.valid) errors.push(nameResult.error);
      if (!roleResult.valid) errors.push(roleResult.error);
    }

    if (stepNumber === 2) {
      const toolsResult = validateField('tools', formData.tools || '');
      if (!toolsResult.valid) errors.push(toolsResult.error);
    }

    return { valid: errors.length === 0, errors };
  }

  function validateForm(formData = ns.wizard?.state?.formData || {}) {
    const errorsByStep = {};

    [0, 1, 2, 3].forEach((step) => {
      const result = validateStep(step, formData);
      if (!result.valid) {
        errorsByStep[step] = result.errors;
      }
    });

    return { valid: Object.keys(errorsByStep).length === 0, errorsByStep };
  }

  function ensureFieldFeedbackNode(fieldEl) {
    if (!fieldEl || !fieldEl.closest) return null;
    const wrapper = fieldEl.closest('.field');
    if (!wrapper) return null;

    let node = wrapper.querySelector('.field-error');
    if (!node) {
      node = document.createElement('small');
      node.className = 'field-error hidden';
      wrapper.appendChild(node);
    }

    let indicator = wrapper.querySelector('.validation-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'validation-indicator';
      const labelTitle = wrapper.querySelector('span');
      if (labelTitle) {
        labelTitle.insertAdjacentElement('afterend', indicator);
      }
    }

    return node;
  }

  function updateFieldUI(fieldName, value) {
    const form = document.getElementById('agent-form');
    if (!form) return { valid: true, error: '' };

    const fieldEl = form.elements.namedItem(fieldName);
    if (!fieldEl) return { valid: true, error: '' };

    const result = validateField(fieldName, value);
    const feedbackNode = ensureFieldFeedbackNode(fieldEl);
    const wrapper = fieldEl.closest('.field');
    const indicator = wrapper?.querySelector('.validation-indicator');

    fieldEl.classList.remove('is-valid', 'is-invalid');
    wrapper?.classList.remove('has-valid', 'has-error');

    if (!result.valid) {
      fieldEl.classList.add('is-invalid');
      wrapper?.classList.add('has-error');
      if (feedbackNode) {
        feedbackNode.textContent = result.error;
        feedbackNode.classList.remove('hidden');
      }
      if (indicator) {
        indicator.textContent = '✕';
        indicator.classList.add('error');
        indicator.classList.remove('ok');
      }
    } else {
      fieldEl.classList.add('is-valid');
      wrapper?.classList.add('has-valid');
      if (feedbackNode) {
        feedbackNode.textContent = '';
        feedbackNode.classList.add('hidden');
      }
      if (indicator) {
        indicator.textContent = '✓';
        indicator.classList.add('ok');
        indicator.classList.remove('error');
      }
    }

    return result;
  }

  function renderErrorSummary() {
    const target = document.getElementById('validation-summary');
    if (!target) return;

    const result = validateForm(ns.wizard?.state?.formData || {});
    if (result.valid) {
      target.innerHTML = '<div class="validation-success">All validation checks passed. Ready to generate.</div>';
      return;
    }

    const labels = ns.wizard?.steps?.map((step, i) => `${i + 1}. ${step.label}`) || [];

    const blocks = Object.entries(result.errorsByStep)
      .map(([stepIndex, errors]) => {
        const label = labels[Number(stepIndex)] || `Step ${Number(stepIndex) + 1}`;
        return `
          <div class="summary-step">
            <h5>${label}</h5>
            <ul>${errors.map((err) => `<li>${err}</li>`).join('')}</ul>
          </div>
        `;
      })
      .join('');

    target.innerHTML = `<div class="validation-summary-box"><p>Please fix these issues before final generation:</p>${blocks}</div>`;
  }

  ns.validation = {
    validateField,
    validateStep,
    validateForm,
    updateFieldUI,
    renderErrorSummary,
    splitTools
  };
})(window.AgentPromptBuilder);
