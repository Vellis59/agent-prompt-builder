/**
 * import.js
 * JSON / ZIP import flow for existing agent configurations.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerImport(ns) {
  'use strict';

  function showImportMessage(message, isError = false) {
    const target = document.getElementById('import-feedback');
    if (!target) return;
    target.textContent = message;
    target.classList.remove('hidden', 'text-emerald-300', 'text-red-300');
    target.classList.add(isError ? 'text-red-300' : 'text-emerald-300');
  }

  function parseAgentJSON(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;

    if (parsed?.wizardState?.formData) {
      return parsed.wizardState.formData;
    }

    if (parsed?.formData) {
      return parsed.formData;
    }

    return parsed;
  }

  function normalizeImportedData(data = {}) {
    const tools = Array.isArray(data.tools)
      ? data.tools.join(', ')
      : String(data.tools || '');

    const agents = Array.isArray(data.agents)
      ? data.agents.map((agent) => (typeof agent === 'string' ? agent : agent?.name || '')).filter(Boolean).join('\n')
      : String(data.agents || '');

    return {
      templateId: data.templateId || '',
      name: data.name || '',
      role: data.role || '',
      soul: data.soul || data.principle || '',
      identity: data.identity || '',
      tools,
      hierarchy: data.hierarchy || 'Standalone',
      memory: data.memory || 'Session-only',
      memoryNotes: data.memoryNotes || data.notes || '',
      userGuidelines: data.userGuidelines || data.guidelines || '',
      agents
    };
  }

  function validateImportedData(data = {}) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Imported content is not a valid JSON object.'] };
    }

    const normalized = normalizeImportedData(data);

    const name = ns.validation?.validateField?.('name', normalized.name);
    const role = ns.validation?.validateField?.('role', normalized.role);
    const tools = ns.validation?.validateField?.('tools', normalized.tools);

    if (!name?.valid) errors.push(name.error);
    if (!role?.valid) errors.push(role.error);
    if (!tools?.valid) errors.push(tools.error);

    return { valid: errors.length === 0, errors, normalized };
  }

  function populateForm(data) {
    ns.wizard?.setFormValues?.(data);
    ns.wizard?.collectFormData?.();
    ns.wizard?.setCurrentStep?.(0);

    ns.validation?.updateFieldUI?.('name', data.name || '');
    ns.validation?.updateFieldUI?.('role', data.role || '');
    ns.validation?.updateFieldUI?.('tools', data.tools || '');

    ns.wizard?.updateStepControls?.();
    ns.refreshPreview?.();
    ns.versioning?.setImportedBaseline?.(data);
  }

  async function extractJsonFromZip(file) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip is required for ZIP import support.');
    }

    const zip = await JSZip.loadAsync(file);
    const jsonEntries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith('.json'));

    if (jsonEntries.length === 0) {
      throw new Error('No JSON file found inside ZIP archive.');
    }

    const raw = await jsonEntries[0].async('text');
    return parseAgentJSON(raw);
  }

  async function handleFileDrop(file) {
    if (!file) return;

    try {
      showImportMessage('Importing file...', false);
      const lowerName = file.name.toLowerCase();
      let parsed;

      if (lowerName.endsWith('.zip')) {
        parsed = await extractJsonFromZip(file);
      } else if (lowerName.endsWith('.json')) {
        const raw = await file.text();
        parsed = parseAgentJSON(raw);
      } else {
        throw new Error('Unsupported file type. Please upload a .json or .zip file.');
      }

      const check = validateImportedData(parsed);
      if (!check.valid) {
        throw new Error(check.errors.join(' '));
      }

      populateForm(check.normalized);
      showImportMessage('Import successful. Wizard fields have been populated.', false);
    } catch (err) {
      console.error('[import] failed:', err);
      showImportMessage(`Import failed: ${err.message}`, true);
    }
  }

  function bindImportUI() {
    const toggleBtn = document.getElementById('btn-toggle-import');
    const panel = document.getElementById('import-panel');
    const input = document.getElementById('import-file-input');
    const dropzone = document.getElementById('import-dropzone');

    toggleBtn?.addEventListener('click', () => {
      panel?.classList.toggle('hidden');
    });

    input?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      await handleFileDrop(file);
      input.value = '';
    });

    dropzone?.addEventListener('click', () => input?.click());

    ['dragenter', 'dragover'].forEach((eventName) => {
      dropzone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropzone?.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove('drag-active');
      });
    });

    dropzone?.addEventListener('drop', async (event) => {
      const file = event.dataTransfer?.files?.[0];
      await handleFileDrop(file);
    });
  }

  ns.importer = {
    handleFileDrop,
    parseAgentJSON,
    populateForm,
    validateImportedData,
    init: bindImportUI
  };
})(window.AgentPromptBuilder);
