# v0.3 GitHub Export & PR Creation

## 1) OAuth Flow Architecture (client-side only)

Implemented approach: **GitHub OAuth Device Flow** (no backend).

Flow:
1. User enters GitHub OAuth App `client_id`.
2. User clicks **Connect to GitHub**.
3. App calls `POST https://github.com/login/device/code` with scope `repo`.
4. App displays `verification_uri` + `user_code`.
5. User authorizes in GitHub (3-click path achievable).
6. App polls `POST https://github.com/login/oauth/access_token`.
7. On success, token is stored:
   - `sessionStorage` if Remember me = OFF (default)
   - `localStorage` if Remember me = ON

Notes:
- No server-side proxy.
- Graceful failure if auth rejected/expired.
- Token invalid (401) triggers forced reconnect.

---

## 2) API Integration Details

Implemented in `js/github.js` using GitHub REST API:

- User profile:
  - `GET /user`
- Repository listing:
  - `GET /user/repos?per_page=100&sort=updated&affiliation=owner,collaborator`
- Repository creation:
  - `POST /user/repos`
- Branch/repo metadata:
  - `GET /repos/{owner}/{repo}`
  - `GET /repos/{owner}/{repo}/branches`
  - `GET /repos/{owner}/{repo}/git/ref/heads/{branch}`
  - `POST /repos/{owner}/{repo}/git/refs` (create branch)
- File export (create/overwrite):
  - `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` (existing SHA)
  - `PUT /repos/{owner}/{repo}/contents/{path}`
- PR creation:
  - `POST /repos/{owner}/{repo}/pulls`

Files exported from existing generator/exporter pack:
- Soul.md
- Identity.md
- Tools.md
- Memory.md
- User.md
- Agents.md

Branch behavior:
- Base branch from selected/default branch.
- Optional new branch (created from base).
- Optional PR from new branch → base branch.

PR description includes agent summary (name, role, hierarchy, tools).

---

## 3) Security Considerations

### Important warning shown in UI
> "This stores a GitHub token in your browser. Use with caution."

### Risks
- localStorage token is exposed to XSS if the page is compromised.
- Device flow polling may leak metadata in browser logs if debug tools are shared.

### Mitigations implemented
- Remember me default OFF → sessionStorage preferred.
- Explicit Disconnect button clears token.
- Token invalidation handling (401) forces re-auth.
- No token in URL/hash.

### Recommended hardening (next)
- CSP + stricter script loading policy.
- Optional fine-grained GitHub tokens with minimal repo scope.
- Encrypt-at-rest in browser (limited protection but better than plaintext).

---

## 4) Error Handling Behavior

Implemented behaviors:
- **Token expired/invalid**: clear token + reconnect prompt.
- **No permissions**: API error surfaced clearly in output.
- **Rate limit / network fail**:
  - automatic retry with backoff for upload calls
  - fallback queue persisted in storage (`githubRetryQueue`)
  - manual retry via **Retry queued exports**
- **Graceful degradation**:
  - ZIP export remains available independently
  - user can continue without GitHub auth

---

## 5) UI Components Added

In export step:
- GitHub connection status pill
- OAuth client ID input + Remember me checkbox
- Connect / Disconnect / Refresh repos / Retry queued buttons
- Repo search + repo selector
- Create new repo field + action
- Branch selection + optional new branch input
- Commit message input
- "Open PR after export" toggle

In action bar:
- **Export to GitHub** button alongside **Download ZIP**

Post-export:
- Success modal with optional PR link

---

## 6) Test Instructions (with test repo)

### Prerequisites
1. Create a GitHub OAuth App and copy client ID.
2. Run app locally (`python3 -m http.server 8080`).
3. Open `http://localhost:8080`.

### Recommended test repo
- `YOUR_USER/apb-github-export-test` (private)

### Test plan
1. Fill wizard minimal fields.
2. Go to Step 5.
3. Enter OAuth client ID.
4. Keep Remember me OFF.
5. Click **Connect to GitHub** and authorize with user code.
6. Confirm status switches to `Connected as <user>`.
7. Select/create `apb-github-export-test` repo.
8. Set base branch = default.
9. Set new branch = `apb/export-smoke`.
10. Commit message = `test: v0.3 export`.
11. Keep **Open PR** checked.
12. Click **Export to GitHub**.
13. Verify success modal and PR link open.
14. In GitHub, verify all 6 files in new branch and PR body contains agent summary.

### Negative tests
- Remove token (Disconnect) then export → should fail with reconnect guidance.
- Set invalid client ID → auth flow should fail cleanly.
- Trigger offline mode during export → job should queue and be retriable.

---

## File Changes
- `index.html` (GitHub UI + Export button + success modal + script include)
- `css/style.css` (GitHub panel/status/modal styles)
- `js/github.js` (**new**) full GitHub integration
- `js/exporter.js` (boot now initializes GitHub module; ZIP button label update)
