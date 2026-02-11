/**
 * versioning.js
 * v0.3 Power User: version history + side-by-side diff + changelog + patch export.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerVersioning(ns) {
  'use strict';

  const STORAGE_KEY = 'versionHistory';
  const MAX_VERSIONS = 5;

  const state = {
    compareEnabled: false,
    importedBaseline: null,
    autoLastHash: '',
    autoLastAt: 0,
    mergedSelection: new Map(),
    lastDiff: null,
    templateCache: []
  };

  function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function safeName(name, fallback = 'version') {
    const trimmed = String(name || '').trim();
    return trimmed || fallback;
  }

  function formatTs(ts) {
    return new Date(ts).toLocaleString();
  }

  function getHistory() {
    return ns.storage?.get?.(STORAGE_KEY, []) || [];
  }

  function setHistory(items) {
    return ns.storage?.set?.(STORAGE_KEY, items.slice(0, MAX_VERSIONS));
  }

  function toFileTextMap(formData = {}) {
    const files = ns.generator?.generateArtifacts?.(formData) || {};
    return Object.fromEntries(
      Object.entries(files).map(([file, obj]) => [file, JSON.stringify(obj, null, 2)])
    );
  }

  function snapshotFromForm(formData = {}, meta = {}) {
    return {
      id: uid(),
      name: safeName(meta.name, 'autosave'),
      source: meta.source || 'manual',
      timestamp: new Date().toISOString(),
      formData: JSON.parse(JSON.stringify(formData || {})),
      files: toFileTextMap(formData)
    };
  }

  function saveVersion(name, source = 'manual', incomingFormData = null) {
    const formData = incomingFormData || ns.wizard?.state?.formData || {};
    const item = snapshotFromForm(formData, { name, source });
    const history = [item, ...getHistory()].slice(0, MAX_VERSIONS);
    setHistory(history);
    refreshSelectors();
    return item;
  }

  function onFormDataChange(formData) {
    const raw = JSON.stringify(formData || {});
    if (raw === state.autoLastHash) return;
    const now = Date.now();
    if (now - state.autoLastAt < 25000) return;
    state.autoLastHash = raw;
    state.autoLastAt = now;
    saveVersion('autosave', 'auto', formData);
  }

  function exportHistoryJson() {
    const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apb-version-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function tokenizeWords(line) {
    return line.match(/\s+|\w+|[^\w\s]/g) || [];
  }

  function lcsDiff(aTokens, bTokens) {
    const n = aTokens.length;
    const m = bTokens.length;
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

    for (let i = n - 1; i >= 0; i -= 1) {
      for (let j = m - 1; j >= 0; j -= 1) {
        dp[i][j] = aTokens[i] === bTokens[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const out = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (aTokens[i] === bTokens[j]) {
        out.push({ type: 'same', value: aTokens[i] });
        i += 1;
        j += 1;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: 'del', value: aTokens[i] });
        i += 1;
      } else {
        out.push({ type: 'add', value: bTokens[j] });
        j += 1;
      }
    }
    while (i < n) out.push({ type: 'del', value: aTokens[i++] });
    while (j < m) out.push({ type: 'add', value: bTokens[j++] });
    return out;
  }

  function normalizeLine(line, ignoreWhitespace) {
    return ignoreWhitespace ? String(line).replace(/\s+/g, ' ').trim() : String(line);
  }

  function diffLines(leftText = '', rightText = '', options = {}) {
    const ignoreWhitespace = !!options.ignoreWhitespace;
    const left = String(leftText).split('\n');
    const right = String(rightText).split('\n');
    const max = Math.max(left.length, right.length);
    const rows = [];
    for (let i = 0; i < max; i += 1) {
      const l = left[i] ?? '';
      const r = right[i] ?? '';
      const lNorm = normalizeLine(l, ignoreWhitespace);
      const rNorm = normalizeLine(r, ignoreWhitespace);
      if (l === '' && r !== '') {
        rows.push({ type: 'added', left: '', right: r, index: i });
      } else if (l !== '' && r === '') {
        rows.push({ type: 'removed', left: l, right: '', index: i });
      } else if (lNorm !== rNorm) {
        rows.push({ type: 'modified', left: l, right: r, index: i, wordDiff: lcsDiff(tokenizeWords(l), tokenizeWords(r)) });
      } else {
        rows.push({ type: 'same', left: l, right: r, index: i });
      }
    }
    return rows;
  }

  function diffSnapshots(leftSnap, rightSnap, options = {}) {
    const leftFiles = leftSnap?.files || {};
    const rightFiles = rightSnap?.files || {};
    const allFiles = Array.from(new Set([...Object.keys(leftFiles), ...Object.keys(rightFiles)]));
    const fileDiffs = allFiles.map((file) => {
      const rows = diffLines(leftFiles[file] || '', rightFiles[file] || '', options);
      const changed = rows.some((r) => r.type !== 'same');
      return { file, rows, changed };
    });

    const visible = options.onlyChanged ? fileDiffs.filter((f) => f.changed) : fileDiffs;
    return { files: visible, full: fileDiffs };
  }

  function rowClass(type) {
    if (type === 'added') return 'diff-row diff-added';
    if (type === 'removed') return 'diff-row diff-removed';
    if (type === 'modified') return 'diff-row diff-modified';
    return 'diff-row';
  }

  function highlightWordDiff(wordDiff = []) {
    return wordDiff.map((w) => {
      if (w.type === 'add') return `<mark class="wd-add">${escapeHtml(w.value)}</mark>`;
      if (w.type === 'del') return `<mark class="wd-del">${escapeHtml(w.value)}</mark>`;
      return escapeHtml(w.value);
    }).join('');
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function renderDiff(diffResult) {
    const root = document.getElementById('diff-container');
    if (!root) return;
    if (!diffResult?.files?.length) {
      root.innerHTML = '<p class="text-sm text-slate-400">No differences found.</p>';
      return;
    }

    root.innerHTML = diffResult.files.map((fileDiff) => {
      const rows = fileDiff.rows.map((row) => {
        const mergeKey = `${fileDiff.file}:${row.index}`;
        const isSelectable = row.type === 'modified' || row.type === 'added';
        const checkbox = isSelectable
          ? `<input type="checkbox" class="merge-line" data-key="${mergeKey}" ${state.mergedSelection.has(mergeKey) ? 'checked' : ''} />`
          : '<span class="merge-spacer"></span>';

        const leftText = row.type === 'modified' ? highlightWordDiff(row.wordDiff.filter((w) => w.type !== 'add')) : escapeHtml(row.left);
        const rightText = row.type === 'modified' ? highlightWordDiff(row.wordDiff.filter((w) => w.type !== 'del')) : escapeHtml(row.right);
        return `<div class="${rowClass(row.type)}" data-type="${row.type}">
          <div class="diff-cell diff-left">${checkbox}<code>${leftText}</code></div>
          <div class="diff-cell diff-right"><code>${rightText}</code></div>
        </div>`;
      }).join('');

      return `<section class="diff-file">
        <header class="diff-file-head">
          <h5>${fileDiff.file}</h5>
          <span class="text-xs ${fileDiff.changed ? 'text-amber-300' : 'text-slate-500'}">${fileDiff.changed ? 'modified' : 'unchanged'}</span>
        </header>
        <div class="diff-grid">${rows}</div>
      </section>`;
    }).join('');

    document.querySelectorAll('.merge-line').forEach((input) => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.key;
        if (e.target.checked) state.mergedSelection.set(key, true);
        else state.mergedSelection.delete(key);
      });
    });

    attachSyncScroll();
  }

  function attachSyncScroll() {
    const roots = document.querySelectorAll('.diff-grid');
    roots.forEach((grid) => {
      let syncing = false;
      grid.addEventListener('scroll', () => {
        if (syncing) return;
        syncing = true;
        roots.forEach((other) => {
          if (other !== grid) other.scrollTop = grid.scrollTop;
        });
        syncing = false;
      });
    });
  }

  function getTemplateBaseline() {
    const selectedId = ns.wizard?.state?.formData?.templateId;
    const templates = state.templateCache || [];
    const tpl = templates.find((t) => t.id === selectedId) || templates[0];
    if (!tpl) return null;
    const form = {
      templateId: tpl.id,
      name: tpl.name || '',
      role: tpl.role || '',
      soul: tpl.soul || '',
      identity: tpl.identity || '',
      tools: (tpl.tools || []).join(', '),
      hierarchy: tpl.hierarchy || 'Standalone',
      memory: tpl.memory || 'Session-only',
      memoryNotes: '',
      userGuidelines: tpl.userGuidelines || '',
      agents: (tpl.agents || []).map((a) => a.name).join('\n')
    };
    return snapshotFromForm(form, { name: `template:${tpl.id}`, source: 'template' });
  }

  function resolveSelection(value) {
    if (value === '__current') return snapshotFromForm(ns.wizard?.state?.formData || {}, { name: 'current', source: 'live' });
    if (value === '__template') return getTemplateBaseline();
    if (value === '__imported') return state.importedBaseline;
    return getHistory().find((item) => item.id === value) || null;
  }

  function refreshSelectors() {
    const left = document.getElementById('compare-left');
    const right = document.getElementById('compare-right');
    if (!left || !right) return;

    const history = getHistory();
    const options = [
      { id: '__current', label: 'Current form (live)' },
      { id: '__template', label: 'Template baseline' },
      ...(state.importedBaseline ? [{ id: '__imported', label: 'Imported JSON baseline' }] : []),
      ...history.map((item) => ({ id: item.id, label: `${item.name} · ${formatTs(item.timestamp)}` }))
    ];

    const html = options.map((o) => `<option value="${o.id}">${o.label}</option>`).join('');
    left.innerHTML = html;
    right.innerHTML = html;

    if (!left.value) left.value = options[1]?.id || options[0]?.id;
    if (!right.value) right.value = options[0]?.id;
  }

  function generateChangelog(leftSnap, rightSnap, diffResult) {
    const left = leftSnap?.formData || {};
    const right = rightSnap?.formData || {};
    const lines = [`# Changelog`, '', `- From: **${leftSnap?.name || 'left'}**`, `- To: **${rightSnap?.name || 'right'}**`, ''];

    const leftTools = new Set(String(left.tools || '').split(',').map((t) => t.trim()).filter(Boolean));
    const rightTools = new Set(String(right.tools || '').split(',').map((t) => t.trim()).filter(Boolean));
    const addedTools = [...rightTools].filter((t) => !leftTools.has(t));
    const removedTools = [...leftTools].filter((t) => !rightTools.has(t));

    if (addedTools.length) lines.push(`- Added tools: ${addedTools.join(', ')}`);
    if (removedTools.length) lines.push(`- Removed tools: ${removedTools.join(', ')}`);

    if ((left.role || '') !== (right.role || '')) lines.push(`- Modified role: ${left.role || '∅'} → ${right.role || '∅'}`);
    if ((left.memory || '') !== (right.memory || '')) lines.push(`- Modified memory mode: ${left.memory || '∅'} → ${right.memory || '∅'}`);
    if ((left.hierarchy || '') !== (right.hierarchy || '')) lines.push(`- Modified hierarchy: ${left.hierarchy || '∅'} → ${right.hierarchy || '∅'}`);

    const changedFiles = diffResult.full.filter((f) => f.changed).map((f) => f.file);
    if (changedFiles.length) lines.push(`- Changed files: ${changedFiles.join(', ')}`);

    if (lines.length <= 5) lines.push('- No significant changes detected.');
    return lines.join('\n');
  }

  function exportTextFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function generatePatch(leftSnap, rightSnap, diffResult) {
    const out = [`--- ${leftSnap.name}`, `+++ ${rightSnap.name}`];
    diffResult.full.forEach((file) => {
      if (!file.changed) return;
      out.push(`diff -- ${file.file}`);
      file.rows.forEach((row) => {
        if (row.type === 'same') return;
        if (row.type === 'removed') out.push(`- ${row.left}`);
        else if (row.type === 'added') out.push(`+ ${row.right}`);
        else {
          out.push(`- ${row.left}`);
          out.push(`+ ${row.right}`);
        }
      });
    });
    return out.join('\n');
  }

  function performCompare() {
    const leftId = document.getElementById('compare-left')?.value;
    const rightId = document.getElementById('compare-right')?.value;
    const ignoreWhitespace = document.getElementById('chk-ignore-whitespace')?.checked;
    const onlyChanged = document.getElementById('chk-only-changed')?.checked;

    const leftSnap = resolveSelection(leftId);
    const rightSnap = resolveSelection(rightId);
    if (!leftSnap || !rightSnap) return;

    const diffResult = diffSnapshots(leftSnap, rightSnap, { ignoreWhitespace, onlyChanged });
    state.lastDiff = { leftSnap, rightSnap, diffResult };
    renderDiff(diffResult);

    const changelog = generateChangelog(leftSnap, rightSnap, diffResult);
    const output = document.getElementById('changelog-output');
    if (output) output.textContent = changelog;
  }

  function copyRightToLeft() {
    const rightId = document.getElementById('compare-right')?.value;
    const rightSnap = resolveSelection(rightId);
    if (!rightSnap) return;
    ns.wizard?.setFormValues?.(rightSnap.formData || {});
    ns.wizard?.collectFormData?.();
    ns.refreshPreview?.();
  }

  function mergeSelected() {
    const last = state.lastDiff;
    if (!last) return;
    const merged = JSON.parse(JSON.stringify(last.leftSnap.formData || {}));

    Object.entries(last.rightSnap.formData || {}).forEach(([k, v]) => {
      const hasSelected = Array.from(state.mergedSelection.keys()).some((key) => {
        const [file] = key.split(':');
        return file && last.diffResult.full.some((f) => f.file === file && f.changed);
      });
      if (hasSelected && typeof v === 'string') merged[k] = v;
    });

    ns.wizard?.setFormValues?.(merged);
    ns.wizard?.collectFormData?.();
    ns.refreshPreview?.();
  }

  function resetToPrevious() {
    const history = getHistory();
    if (!history[1]) return;
    ns.wizard?.setFormValues?.(history[1].formData || {});
    ns.wizard?.collectFormData?.();
    ns.refreshPreview?.();
  }

  function toggleCompareMode() {
    state.compareEnabled = !state.compareEnabled;
    const panel = document.getElementById('compare-panel');
    const btn = document.getElementById('compare-toggle');
    panel?.classList.toggle('hidden', !state.compareEnabled);
    if (btn) btn.textContent = state.compareEnabled ? 'Disable Compare Mode' : 'Enable Compare Mode';
    if (state.compareEnabled) performCompare();
  }

  function setImportedBaseline(formData = {}) {
    state.importedBaseline = snapshotFromForm(formData, { name: 'imported', source: 'import' });
    refreshSelectors();
  }

  async function init() {
    try {
      state.templateCache = await ns.templates?.loadAllTemplates?.() || [];
    } catch (e) {
      console.warn('[versioning] template preload failed', e);
      state.templateCache = [];
    }

    refreshSelectors();

    document.getElementById('btn-save-version')?.addEventListener('click', () => {
      const name = document.getElementById('version-name')?.value || `v${getHistory().length + 1}`;
      saveVersion(name, 'manual');
      performCompare();
    });

    document.getElementById('btn-export-history')?.addEventListener('click', exportHistoryJson);
    document.getElementById('compare-toggle')?.addEventListener('click', toggleCompareMode);
    document.getElementById('compare-left')?.addEventListener('change', performCompare);
    document.getElementById('compare-right')?.addEventListener('change', performCompare);
    document.getElementById('chk-ignore-whitespace')?.addEventListener('change', performCompare);
    document.getElementById('chk-only-changed')?.addEventListener('change', performCompare);
    document.getElementById('btn-swap')?.addEventListener('click', () => {
      const left = document.getElementById('compare-left');
      const right = document.getElementById('compare-right');
      const tmp = left.value;
      left.value = right.value;
      right.value = tmp;
      performCompare();
    });

    document.getElementById('btn-compare-template')?.addEventListener('click', () => {
      document.getElementById('compare-left').value = '__template';
      document.getElementById('compare-right').value = '__current';
      performCompare();
    });

    document.getElementById('btn-compare-imported')?.addEventListener('click', () => {
      document.getElementById('compare-left').value = '__imported';
      document.getElementById('compare-right').value = '__current';
      performCompare();
    });

    document.getElementById('btn-copy-right-left')?.addEventListener('click', copyRightToLeft);
    document.getElementById('btn-merge-selected')?.addEventListener('click', mergeSelected);
    document.getElementById('btn-reset-prev')?.addEventListener('click', resetToPrevious);

    document.getElementById('btn-export-patch')?.addEventListener('click', () => {
      if (!state.lastDiff) return;
      exportTextFile('changes.patch', generatePatch(state.lastDiff.leftSnap, state.lastDiff.rightSnap, state.lastDiff.diffResult), 'text/x-diff');
    });

    document.getElementById('btn-export-changelog')?.addEventListener('click', () => {
      const content = document.getElementById('changelog-output')?.textContent || '';
      exportTextFile('changelog.md', content, 'text/markdown');
    });
  }

  ns.versioning = {
    init,
    saveVersion,
    onFormDataChange,
    setImportedBaseline,
    getHistory,
    diffSnapshots
  };
})(window.AgentPromptBuilder);
