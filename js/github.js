/**
 * github.js
 * Client-side GitHub integration (OAuth Device Flow + Repo export + optional PR)
 */
window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerGitHub(ns) {
  'use strict';

  const API_BASE = 'https://api.github.com';
  const DEVICE_CODE_URL = 'https://github.com/login/device/code';
  const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';

  const state = {
    token: null,
    repos: [],
    selectedRepo: null,
    user: null,
    tokenMode: 'session'
  };

  function el(id) { return document.getElementById(id); }

  function setStatus(text, connected = false) {
    const node = el('github-status');
    if (!node) return;
    node.textContent = text;
    node.className = `github-status ${connected ? 'connected' : 'disconnected'}`;
  }

  function getStoredToken() {
    return sessionStorage.getItem('apb:githubToken') || localStorage.getItem('apb:githubToken');
  }

  function persistToken(token, remember, clientId) {
    sessionStorage.removeItem('apb:githubToken');
    localStorage.removeItem('apb:githubToken');
    if (remember) {
      localStorage.setItem('apb:githubToken', token);
      localStorage.setItem('apb:githubClientId', clientId || '');
      state.tokenMode = 'local';
    } else {
      sessionStorage.setItem('apb:githubToken', token);
      localStorage.setItem('apb:githubClientId', clientId || '');
      state.tokenMode = 'session';
    }
  }

  function clearToken() {
    state.token = null;
    state.user = null;
    sessionStorage.removeItem('apb:githubToken');
    localStorage.removeItem('apb:githubToken');
    setStatus('Not connected', false);
  }

  async function gh(path, opts = {}) {
    if (!state.token) throw new Error('Not authenticated with GitHub');

    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.headers || {})
      }
    });

    if (res.status === 401) {
      clearToken();
      throw new Error('Token expired or invalid. Please reconnect to GitHub.');
    }

    if (res.status === 403) {
      const reset = res.headers.get('x-ratelimit-reset');
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0' && reset) {
        const waitSec = Math.max(1, Number(reset) - Math.floor(Date.now() / 1000));
        throw new Error(`Rate limit reached. Retry in ~${waitSec}s.`);
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `GitHub API error (${res.status})`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  async function withRetry(fn, retries = 2) {
    let i = 0;
    while (i <= retries) {
      try {
        return await fn();
      } catch (err) {
        const message = String(err.message || err);
        const retryable = /rate limit|network|failed to fetch/i.test(message);
        if (!retryable || i === retries) throw err;
        await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
      }
      i += 1;
    }
    return null;
  }

  function setOutput(text, isError = false) {
    const out = el('output');
    if (!out) return;
    out.textContent = text;
    out.className = isError
      ? 'mt-6 min-h-56 overflow-auto rounded-xl border border-red-900 bg-slate-950 p-4 text-xs text-red-300'
      : 'mt-6 min-h-56 overflow-auto rounded-xl border border-emerald-900 bg-slate-950 p-4 text-xs text-emerald-300';
  }

  async function startDeviceFlow() {
    const clientId = el('github-client-id')?.value?.trim() || localStorage.getItem('apb:githubClientId') || '';
    const remember = !!el('github-remember')?.checked;

    if (!clientId) {
      setOutput('❌ Missing GitHub OAuth Client ID. Add your OAuth app client ID first.', true);
      return;
    }

    const body = new URLSearchParams({ client_id: clientId, scope: 'repo' });
    const res = await fetch(DEVICE_CODE_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (!res.ok) throw new Error('Could not start GitHub device flow. Check Client ID.');
    const dc = await res.json();

    setOutput(
      `🔐 GitHub connection step 1/3\n\n1) Open: ${dc.verification_uri}\n2) Enter code: ${dc.user_code}\n3) Return here and wait for auto-connect...`,
      false
    );

    const startedAt = Date.now();
    const timeoutMs = (dc.expires_in || 900) * 1000;
    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((r) => setTimeout(r, (dc.interval || 5) * 1000));

      const tokenRes = await fetch(ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          device_code: dc.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        })
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error === 'authorization_pending') continue;
      if (tokenData.error === 'slow_down') continue;
      if (tokenData.error) throw new Error(`Auth failed: ${tokenData.error}`);
      if (tokenData.access_token) {
        persistToken(tokenData.access_token, remember, clientId);
        state.token = tokenData.access_token;
        await hydrateUser();
        await loadRepos();
        setOutput('✅ GitHub connected successfully.', false);
        return;
      }
    }

    throw new Error('Authentication timed out. Please retry.');
  }

  async function hydrateUser() {
    const user = await gh('/user');
    state.user = user;
    setStatus(`Connected as ${user.login}`, true);
  }

  function populateRepoSelect(items) {
    const select = el('github-repo-select');
    if (!select) return;
    const last = localStorage.getItem('apb:lastRepo') || '';
    select.innerHTML = '<option value="">Select a repository</option>' + items
      .map((repo) => `<option value="${repo.full_name}">${repo.full_name}</option>`)
      .join('');

    if (last && items.some((r) => r.full_name === last)) {
      select.value = last;
      state.selectedRepo = items.find((r) => r.full_name === last) || null;
      loadBranches();
    }
  }

  async function loadRepos() {
    const repos = await withRetry(() => gh('/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator'));
    state.repos = repos || [];
    populateRepoSelect(state.repos);
    return state.repos;
  }

  function filterRepos() {
    const q = (el('github-repo-search')?.value || '').trim().toLowerCase();
    if (!q) return populateRepoSelect(state.repos);
    populateRepoSelect(state.repos.filter((r) => r.full_name.toLowerCase().includes(q)));
  }

  async function createRepo() {
    const name = el('github-new-repo')?.value?.trim();
    if (!name) return setOutput('❌ Enter a new repository name first.', true);

    try {
      const repo = await gh('/user/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, private: true, auto_init: true })
      });
      await loadRepos();
      el('github-repo-select').value = repo.full_name;
      state.selectedRepo = repo;
      localStorage.setItem('apb:lastRepo', repo.full_name);
      await loadBranches();
      setOutput(`✅ Repository created: ${repo.full_name}`, false);
    } catch (err) {
      setOutput(`❌ Failed to create repo: ${err.message}`, true);
    }
  }

  async function loadBranches() {
    const fullName = el('github-repo-select')?.value;
    if (!fullName) return;
    const [owner, repo] = fullName.split('/');
    const [repoInfo, branches] = await Promise.all([
      gh(`/repos/${owner}/${repo}`),
      gh(`/repos/${owner}/${repo}/branches?per_page=100`)
    ]);

    state.selectedRepo = repoInfo;
    const select = el('github-branch-select');
    if (select) {
      select.innerHTML = `<option value="${repoInfo.default_branch}">${repoInfo.default_branch} (default)</option>` +
        branches.map((b) => `<option value="${b.name}">${b.name}</option>`).join('');
      select.value = repoInfo.default_branch;
    }
  }

  async function getShaIfExists(owner, repo, path, branch) {
    try {
      const file = await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`);
      return file.sha || null;
    } catch (err) {
      if (/404/.test(err.message) || /Not Found/i.test(err.message)) return null;
      return null;
    }
  }

  async function ensureBranch(owner, repo, base, newBranch) {
    if (!newBranch) return base;
    const refs = await gh(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base)}`);
    const sha = refs.object.sha;

    try {
      await gh(`/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha })
      });
    } catch (err) {
      if (!/Reference already exists/i.test(err.message)) throw err;
    }
    return newBranch;
  }

  function buildPrBody(formData) {
    return `## Agent Prompt Builder Export\n\nGenerated by Agent Prompt Builder v0.3.\n\n### Summary\n- Agent: ${formData.name || 'Unnamed'}\n- Role: ${formData.role || 'N/A'}\n- Hierarchy: ${formData.hierarchy || 'N/A'}\n- Tools: ${formData.tools || 'N/A'}\n\n### Notes\nThis PR was generated client-side (no backend). Please review file content before merge.`;
  }

  function enqueueJob(job, reason) {
    const queue = ns.storage?.get?.('githubRetryQueue', []) || [];
    queue.push({ job, reason, createdAt: new Date().toISOString() });
    ns.storage?.set?.('githubRetryQueue', queue);
  }

  async function runExport(job) {
    const { repoFullName, baseBranch, newBranch, commitMessage, openPr, files, formData } = job;
    const [owner, repo] = repoFullName.split('/');
    const targetBranch = await ensureBranch(owner, repo, baseBranch, newBranch);

    for (const file of files) {
      const sha = await getShaIfExists(owner, repo, file.filename, targetBranch);
      await withRetry(() => gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(file.filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(file.content))),
          branch: targetBranch,
          ...(sha ? { sha } : {})
        })
      }), 3);
    }

    let prUrl = null;
    if (openPr && targetBranch !== baseBranch) {
      const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Export agent prompt pack (${new Date().toISOString().slice(0, 10)})`,
          head: targetBranch,
          base: baseBranch,
          body: buildPrBody(formData)
        })
      });
      prUrl = pr.html_url;
    }

    return { targetBranch, prUrl, repoUrl: `https://github.com/${owner}/${repo}` };
  }

  function showSuccess(result) {
    const modal = el('github-success-modal');
    const text = el('github-success-text');
    const pr = el('github-pr-link');
    if (text) text.textContent = `Files exported to branch "${result.targetBranch}".`;
    if (pr) {
      if (result.prUrl) {
        pr.href = result.prUrl;
        pr.classList.remove('hidden');
      } else {
        pr.classList.add('hidden');
      }
    }
    modal?.classList.remove('hidden');
  }

  async function exportToGitHub() {
    try {
      const repoFullName = el('github-repo-select')?.value;
      if (!repoFullName) throw new Error('Select a repository first.');

      const baseBranch = el('github-branch-select')?.value || state.selectedRepo?.default_branch || 'main';
      const newBranch = (el('github-new-branch')?.value || '').trim();
      const commitMessage = (el('github-commit-message')?.value || '').trim() || 'chore: export agent prompt pack';
      const openPr = !!el('github-open-pr')?.checked;

      const formData = ns.wizard?.collectFormData?.() || ns.wizard?.state?.formData || {};
      const files = ns.exporter?.generateFilePack?.(formData) || [];
      if (!files.length) throw new Error('No files generated.');

      localStorage.setItem('apb:lastRepo', repoFullName);
      setOutput('🚀 Exporting files to GitHub...', false);

      const result = await runExport({ repoFullName, baseBranch, newBranch, commitMessage, openPr, files, formData });
      setOutput(`✅ Export complete\nRepo: ${repoFullName}\nBranch: ${result.targetBranch}${result.prUrl ? `\nPR: ${result.prUrl}` : ''}`, false);
      showSuccess(result);
    } catch (err) {
      const message = String(err.message || err);
      const networkOrRate = /network|failed to fetch|rate limit/i.test(message);
      if (networkOrRate) {
        const formData = ns.wizard?.state?.formData || {};
        const files = ns.exporter?.generateFilePack?.(formData) || [];
        enqueueJob({
          repoFullName: el('github-repo-select')?.value,
          baseBranch: el('github-branch-select')?.value || 'main',
          newBranch: (el('github-new-branch')?.value || '').trim(),
          commitMessage: (el('github-commit-message')?.value || '').trim(),
          openPr: !!el('github-open-pr')?.checked,
          files,
          formData
        }, message);
        setOutput(`⚠️ Export queued for retry: ${message}`, true);
      } else {
        setOutput(`❌ GitHub export failed: ${message}`, true);
      }
    }
  }

  async function retryQueuedExports() {
    const queue = ns.storage?.get?.('githubRetryQueue', []) || [];
    if (!queue.length) return setOutput('No queued exports.', false);

    const remaining = [];
    for (const item of queue) {
      try {
        await runExport(item.job);
      } catch (err) {
        remaining.push(item);
      }
    }
    ns.storage?.set?.('githubRetryQueue', remaining);
    setOutput(remaining.length ? `⚠️ ${remaining.length} queued export(s) still pending.` : '✅ All queued exports retried successfully.', !(!remaining.length));
  }

  async function init() {
    const token = getStoredToken();
    if (token) {
      state.token = token;
      try {
        await hydrateUser();
        await loadRepos();
      } catch (err) {
        clearToken();
      }
    }

    const savedClientId = localStorage.getItem('apb:githubClientId') || '';
    if (el('github-client-id') && savedClientId) el('github-client-id').value = savedClientId;

    el('btn-github-connect')?.addEventListener('click', async () => {
      try { await startDeviceFlow(); } catch (err) { setOutput(`❌ ${err.message}`, true); }
    });

    el('btn-github-disconnect')?.addEventListener('click', () => {
      clearToken();
      setOutput('Disconnected from GitHub.', false);
    });

    el('btn-github-refresh')?.addEventListener('click', async () => {
      try { await loadRepos(); setOutput('Repositories refreshed.', false); } catch (err) { setOutput(`❌ ${err.message}`, true); }
    });

    el('btn-github-create-repo')?.addEventListener('click', createRepo);
    el('github-repo-search')?.addEventListener('input', filterRepos);
    el('github-repo-select')?.addEventListener('change', async (e) => {
      const fullName = e.target.value;
      localStorage.setItem('apb:lastRepo', fullName);
      await loadBranches();
    });

    el('btn-export-github')?.addEventListener('click', exportToGitHub);
    el('btn-github-retry')?.addEventListener('click', retryQueuedExports);
    el('github-modal-close')?.addEventListener('click', () => el('github-success-modal')?.classList.add('hidden'));
  }

  ns.github = {
    init,
    exportToGitHub,
    retryQueuedExports,
    startDeviceFlow
  };
})(window.AgentPromptBuilder);
