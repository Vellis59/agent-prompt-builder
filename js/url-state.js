/**
 * url-state.js
 * URL-based state sharing for bookmarkable and shareable agent configs.
 * Implements client-side base64 encoding/decoding with compression.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerUrlState(ns) {
  'use strict';

  // Configuration constants
  const CONFIG = {
    CONFIG_PARAM: 'config',
    TEMPLATE_PARAM: 'template',
    MAX_URL_LENGTH: 2000, // Browser safe limit
    BASE_URL: window.location.origin + window.location.pathname
  };

  // Default form values to minimize payload
  const DEFAULT_VALUES = {
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
  };

  /**
   * Compress form data by removing default values
   * @param {Object} formData - Full form data
   * @returns {Object} Compressed data (only non-default values)
   */
  function compressFormData(formData) {
    const compressed = {};

    for (const [key, defaultValue] of Object.entries(DEFAULT_VALUES)) {
      const value = formData[key];
      
      // Skip if value is undefined or null
      if (value === undefined || value === null) continue;
      
      // Skip if value matches default (including empty string)
      if (value === defaultValue) continue;
      
      // Skip if value is empty after trimming (for strings)
      if (typeof value === 'string' && value.trim() === '') continue;
      
      // Store the value
      compressed[key] = value;
    }

    return compressed;
  }

  /**
   * Decompress URL data by merging with defaults
   * @param {Object} compressed - Compressed data from URL
   * @returns {Object} Full form data with defaults applied
   */
  function decompressFormData(compressed) {
    return { ...DEFAULT_VALUES, ...compressed };
  }

  /**
   * Encode data to URL-safe base64
   * @param {Object} data - Data to encode
   * @returns {string} URL-safe base64 string
   */
  function encodeToBase64(data) {
    try {
      const json = JSON.stringify(data);
      const base64 = btoa(json);
      // Make URL-safe: replace + -> -, / -> _, remove = padding
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (error) {
      console.error('[url-state] Encoding failed:', error);
      throw new Error('Failed to encode configuration data');
    }
  }

  /**
   * Decode URL-safe base64 to data
   * @param {string} base64 - URL-safe base64 string
   * @returns {Object} Decoded data
   */
  function decodeFromBase64(base64) {
    try {
      // Restore standard base64: - -> +, _ -> /
      const standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = standardBase64.padEnd(standardBase64.length + (4 - standardBase64.length % 4) % 4, '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch (error) {
      console.error('[url-state] Decoding failed:', error);
      throw new Error('Failed to decode configuration data');
    }
  }

  /**
   * Generate shareable URL from form data
   * @param {Object} formData - Form data to share
   * @returns {string} Shareable URL
   */
  function generateShareUrl(formData) {
    const compressed = compressFormData(formData);
    const encoded = encodeToBase64(compressed);
    const url = new URL(CONFIG.BASE_URL);
    url.searchParams.set(CONFIG.CONFIG_PARAM, encoded);

    // Check URL length
    if (url.toString().length > CONFIG.MAX_URL_LENGTH) {
      console.warn('[url-state] Generated URL exceeds recommended length:', url.toString().length);
    }

    return url.toString();
  }

  /**
   * Generate template preset URL
   * @param {string} templateId - Template identifier
   * @param {Object} overrides - Optional field overrides
   * @returns {string} Template preset URL
   */
  function generateTemplateUrl(templateId, overrides = {}) {
    const url = new URL(CONFIG.BASE_URL);
    url.searchParams.set(CONFIG.TEMPLATE_PARAM, templateId);
    
    // Add overrides as individual query params
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'string' && value.trim() !== '') {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  /**
   * Parse URL parameters and extract configuration
   * @param {URLSearchParams} params - URL search parameters
   * @returns {Object} Parsed configuration data
   */
  function parseUrlParams(params) {
    const result = {
      hasConfig: false,
      hasTemplate: false,
      config: null,
      templateId: null,
      overrides: {}
    };

    // Check for ?config= parameter
    const configParam = params.get(CONFIG.CONFIG_PARAM);
    if (configParam) {
      try {
        const decoded = decodeFromBase64(configParam);
        result.config = decompressFormData(decoded);
        result.hasConfig = true;
      } catch (error) {
        console.error('[url-state] Failed to parse config param:', error);
        result.configError = error.message;
      }
    }

    // Check for ?template= parameter
    const templateParam = params.get(CONFIG.TEMPLATE_PARAM);
    if (templateParam) {
      result.templateId = templateParam;
      result.hasTemplate = true;
    }

    // Collect individual field overrides
    for (const [key, value] of params.entries()) {
      if (key !== CONFIG.CONFIG_PARAM && key !== CONFIG.TEMPLATE_PARAM && key in DEFAULT_VALUES) {
        result.overrides[key] = value;
      }
    }

    return result;
  }

  /**
   * Apply URL state to form and wizard
   * @param {Object} parsed - Parsed URL state
   * @returns {Promise<boolean>} Success status
   */
  async function applyUrlState(parsed) {
    let formData = { ...DEFAULT_VALUES };

    // Priority: URL overrides > URL config > template > defaults
    if (parsed.hasTemplate && !parsed.hasConfig) {
      // Load template first
      const templateId = parsed.templateId;
      if (templateId) {
        try {
          const template = await ns.templates?.loadTemplate?.(templateId);
          if (template) {
            formData = {
              ...formData,
              templateId: template.id,
              name: template.name || '',
              role: template.role || '',
              soul: template.soul || '',
              identity: template.identity || '',
              tools: (template.tools || []).join(', '),
              hierarchy: template.hierarchy || 'Standalone',
              memory: template.memory || 'Session-only',
              userGuidelines: template.userGuidelines || '',
              agents: (template.agents || []).map((a) => a.name).join('\n')
            };
          }
        } catch (error) {
          console.error('[url-state] Failed to load template:', error);
        }
      }
    }

    // Apply config from URL if present
    if (parsed.hasConfig) {
      formData = { ...formData, ...parsed.config };
    }

    // Apply individual field overrides
    formData = { ...formData, ...parsed.overrides };

    // Set form values and update wizard
    ns.wizard?.setFormValues?.(formData);
    ns.wizard?.collectFormData?.();
    ns.refreshPreview?.();

    // Clear URL parameters after applying (replaceState)
    window.history.replaceState({}, document.title, CONFIG.BASE_URL);

    return true;
  }

  /**
   * Initialize URL state handling on page load
   */
  async function initUrlState() {
    const params = new URLSearchParams(window.location.search);
    
    if (!params.toString()) {
      return; // No URL state to apply
    }

    const parsed = parseUrlParams(params);

    if (!parsed.hasConfig && !parsed.hasTemplate) {
      return; // No relevant URL state
    }

    // Show loading indicator
    const out = document.getElementById('output');
    if (out) {
      out.textContent = '📥 Loading configuration from URL...';
    }

    try {
      const success = await applyUrlState(parsed);

      if (out) {
        if (parsed.configError) {
          out.textContent = `⚠️ Warning: ${parsed.configError}\n\nSome data may not have loaded correctly. Please review the form.`;
          out.className = 'mt-6 min-h-56 overflow-auto rounded-xl border border-amber-900 bg-slate-950 p-4 text-xs text-amber-300';
        } else if (success) {
          out.textContent = '✅ Configuration loaded from URL!\n\nReview the form below and make any adjustments as needed.';
          out.className = 'mt-6 min-h-56 overflow-auto rounded-xl border border-emerald-900 bg-slate-950 p-4 text-xs text-emerald-300';
        }
      }
    } catch (error) {
      console.error('[url-state] Failed to apply URL state:', error);
      if (out) {
        out.textContent = `❌ Failed to load configuration: ${error.message}\n\nPlease check the URL and try again.`;
        out.className = 'mt-6 min-h-56 overflow-auto rounded-xl border border-red-900 bg-slate-950 p-4 text-xs text-red-300';
      }
    }
  }

  /**
   * Show share dialog modal
   * @param {string} url - Shareable URL
   * @param {Object} formData - Form data being shared
   */
  function showShareDialog(url, formData) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('share-modal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'share-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm hidden';
      modal.innerHTML = `
        <div class="relative mx-4 max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
          <button id="share-modal-close" class="absolute right-4 top-4 text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <h3 class="mb-4 text-lg font-semibold">Share Configuration</h3>

          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-slate-300">Shareable URL</label>
            <div class="flex gap-2">
              <input id="share-url-input" type="text" readonly class="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" />
              <button id="share-copy-btn" class="btn btn-primary px-4 py-2 text-sm">
                Copy
              </button>
            </div>
          </div>

          <div class="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
            <p class="flex items-start gap-2 text-xs text-amber-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span><strong>Warning:</strong> This URL contains your configuration data. Only share it with trusted parties. Anyone with this URL can view your configuration.</span>
            </p>
          </div>

          <div class="mb-4">
            <h4 class="mb-2 text-sm font-medium text-slate-300">Preview</h4>
            <div class="max-h-40 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs">
              <div id="share-preview"></div>
            </div>
          </div>

          <div class="mb-4">
            <h4 class="mb-2 text-sm font-medium text-slate-300">Share on Social</h4>
            <div class="flex gap-2">
              <a id="share-twitter" href="#" target="_blank" class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X/Twitter
              </a>
              <a id="share-linkedin" href="#" target="_blank" class="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

          <button id="share-reset-btn" class="w-full rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-2 text-xs text-red-300 hover:bg-red-950/40">
            Reset and Start Over
          </button>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // Populate modal with current data
    const urlInput = document.getElementById('share-url-input');
    const preview = document.getElementById('share-preview');
    const twitterBtn = document.getElementById('share-twitter');
    const linkedinBtn = document.getElementById('share-linkedin');

    if (urlInput) urlInput.value = url;
    
    if (preview) {
      const compressed = compressFormData(formData);
      preview.innerHTML = Object.entries(compressed)
        .map(([key, value]) => `<div><strong>${key}:</strong> ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}</div>`)
        .join('');
    }

    if (twitterBtn) {
      const text = `Check out this agent configuration built with Agent Prompt Builder! 🤖 #AI #Agents`;
      twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    }

    if (linkedinBtn) {
      linkedinBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    }

    // Show modal
    modal.classList.remove('hidden');

    // Bind events
    const closeBtn = document.getElementById('share-modal-close');
    const copyBtn = document.getElementById('share-copy-btn');
    const resetBtn = document.getElementById('share-reset-btn');

    const closeModal = () => modal.classList.add('hidden');

    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('bg-emerald-600');
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('bg-emerald-600');
        }, 2000);
      } catch (error) {
        console.error('[url-state] Copy failed:', error);
        alert('Failed to copy URL. Please copy manually.');
      }
    });

    resetBtn?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset the form and start over? All unsaved changes will be lost.')) {
        ns.wizard?.setFormValues?.(DEFAULT_VALUES);
        ns.wizard?.collectFormData?.();
        ns.refreshPreview?.();
        closeModal();
        
        const out = document.getElementById('output');
        if (out) {
          out.textContent = 'Form has been reset. Start configuring your agent from scratch.';
          out.className = 'mt-6 min-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300';
        }
      }
    });
  }

  /**
   * Share current configuration
   */
  function shareConfiguration() {
    const formData = ns.wizard?.collectFormData?.() || {};
    
    if (!formData || Object.keys(formData).length === 0) {
      alert('No configuration to share. Please fill in the form first.');
      return;
    }

    const url = generateShareUrl(formData);
    showShareDialog(url, formData);
  }

  /**
   * Get list of built-in template URLs
   * @returns {Promise<Array<{id: string, name: string, url: string}>>}
   */
  async function getTemplateUrls() {
    const templates = await ns.templates?.listTemplates?.() || [];
    return templates.map(tpl => ({
      id: tpl.id,
      name: tpl.name,
      url: generateTemplateUrl(tpl.id)
    }));
  }

  // Export public API
  ns.urlState = {
    compressFormData,
    decompressFormData,
    encodeToBase64,
    decodeFromBase64,
    generateShareUrl,
    generateTemplateUrl,
    parseUrlParams,
    applyUrlState,
    initUrlState,
    showShareDialog,
    shareConfiguration,
    getTemplateUrls,
    CONFIG
  };
})(window.AgentPromptBuilder);
