# Quick Testing Guide - ZIP Export

## Server is Running

The development server is running on **http://localhost:8888**

---

## Option 1: Automated Testing

1. Open your browser and navigate to:
   ```
   http://localhost:8888/test-export.html
   ```

2. Click **"Run All Tests"** button

3. Verify all tests pass (green checkmarks)

4. Click **"Test Download"** to verify ZIP download works

---

## Option 2: Manual Testing (Full App)

1. Open your browser and navigate to:
   ```
   http://localhost:8888/
   ```

2. Select a template from the dropdown (e.g., "Orchestrator")

3. Navigate through the wizard steps using Previous/Next buttons

4. Fill in any fields you want to customize

5. Click **"Generate Config"** to preview the configuration

6. Click **"Export ZIP"** to download the ZIP file

7. Extract the ZIP file and verify:
   - Folder named after your agent (e.g., "orchestrator")
   - 6 Markdown files inside
   - Each file has proper structure

---

## Expected ZIP Structure

```
your-agent-name-2026-02-11.zip
└── your-agent-name/
    ├── Soul.md
    ├── Identity.md
    ├── Tools.md
    ├── Memory.md
    ├── User.md
    └── Agents.md
```

---

## Validation Script (Command Line)

Run from project directory:

```bash
cd /home/vellis/.openclaw/workspace/agent-prompt-builder
node validate-export.js
```

Expected output: All 10 tests should pass ✓

---

## Browser Console Check

1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform an export
4. Verify no red error messages
5. Look for success messages like:
   ```
   [exporter] Export successful!
   ```

---

## Troubleshooting

### Export doesn't work
- Check browser console for errors
- Ensure JSZip CDN loaded (Network tab)
- Try different browser

### ZIP is empty
- Check form has some data filled
- Try selecting a template first

### Files missing
- Verify all 6 files are listed in success message
- Check console for generation errors

---

## Success Indicators

✓ ZIP downloads to your Downloads folder
✓ ZIP extracts without errors
✓ 6 Markdown files present
✓ Files have proper Markdown structure
✓ Folder named correctly (sanitized agent name)
✓ No console errors
✓ Success message displayed in output area

---

## Quick Test Template

For quick testing, use the "Orchestrator" template:
1. Load page
2. Select "Orchestrator" template
3. Skip to Step 5 (Review & Generate)
4. Click "Export ZIP"
5. Verify download and extraction

---

All files are ready and the implementation is complete! 🎉
