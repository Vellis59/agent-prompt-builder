/**
 * storage.js
 * Lightweight localStorage wrapper with namespaced keys and safe JSON handling.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

window.AgentPromptBuilder.storage = {
  ns: 'apb:',

  key(name) {
    return `${this.ns}${name}`;
  },

  get(name, fallback = null) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.warn('[storage.get] parse failed:', err);
      return fallback;
    }
  },

  set(name, value) {
    try {
      localStorage.setItem(this.key(name), JSON.stringify(value));
      return true;
    } catch (err) {
      console.error('[storage.set] write failed:', err);
      return false;
    }
  },

  remove(name) {
    localStorage.removeItem(this.key(name));
  }
};
