/**
 * theme.js
 * Theme management - light/dark mode toggle with localStorage persistence.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerTheme(ns) {
  const THEME_KEY = 'agentPromptBuilder_theme';
  const THEME_LIGHT = 'light';
  const THEME_DARK = 'dark';

  let currentTheme = THEME_LIGHT;

  /**
   * Get the user's system theme preference
   */
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEME_DARK
      : THEME_LIGHT;
  }

  /**
   * Update body classes and icons based on theme
   */
  function updateBodyAndIcons(theme) {
    const body = document.body;
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');

    // Update body classes for Tailwind
    if (theme === THEME_DARK) {
      body.classList.add('bg-slate-950', 'text-slate-100');
      body.classList.remove('bg-slate-50', 'text-slate-900');
    } else {
      body.classList.add('bg-slate-50', 'text-slate-900');
      body.classList.remove('bg-slate-950', 'text-slate-100');
    }

    // Update icons
    if (sunIcon && moonIcon) {
      if (theme === THEME_DARK) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  }

  /**
   * Load saved theme or default to system preference
   */
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === THEME_LIGHT || saved === THEME_DARK) {
      currentTheme = saved;
    } else {
      currentTheme = getSystemTheme();
    }
    applyTheme(currentTheme);
  }

  /**
   * Apply theme to document
   */
  function applyTheme(theme) {
    const html = document.documentElement;

    if (theme === THEME_DARK) {
      html.setAttribute('data-theme', THEME_DARK);
    } else {
      html.removeAttribute('data-theme');
    }

    currentTheme = theme;
    updateBodyAndIcons(theme);
  }

  /**
   * Toggle between light and dark themes
   */
  function toggleTheme() {
    const newTheme = currentTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
    setTheme(newTheme);
  }

  /**
   * Set theme and persist to localStorage
   */
  function setTheme(theme) {
    currentTheme = theme;
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);

    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  /**
   * Get current theme
   */
  function getTheme() {
    return currentTheme;
  }

  /**
   * Initialize theme system
   */
  function init() {
    // Load theme on startup (before paint to prevent flash)
    // Use inline script to prevent flash
    const savedTheme = localStorage.getItem(THEME_KEY);
    const theme = savedTheme || getSystemTheme();
    const html = document.documentElement;

    if (theme === THEME_DARK) {
      html.setAttribute('data-theme', THEME_DARK);
    } else {
      html.removeAttribute('data-theme');
    }

    currentTheme = theme;

    // Update DOM after load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateBodyAndIcons(theme);
      });
    } else {
      updateBodyAndIcons(theme);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only update if user hasn't explicitly set a preference
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    });

    // Bind theme toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggleTheme);
    }
  }

  ns.theme = {
    init,
    toggleTheme,
    setTheme,
    getTheme,
    getSystemTheme,
    THEME_LIGHT,
    THEME_DARK
  };
})(window.AgentPromptBuilder);
