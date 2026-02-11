# Known Issues - Agent Prompt Builder

## Minor Issues (Non-Blocking)

### 1. No Required Field Validation
**Severity:** Low
**Impact:** Users can export ZIP files with empty or default placeholder text

**Details:**
- Form fields have no `required` attribute
- Export works even if all fields are empty
- Generated files contain placeholder text like "To be defined"

**Workaround:**
- Select a template before exporting (recommended)
- Manually verify all fields before clicking Export

**Future Fix:**
- Add client-side validation before export
- Highlight empty required fields
- Show warning dialog if fields are missing

---

### 2. No Undo/Redo Functionality
**Severity:** Low
**Impact:** Users cannot easily revert accidental changes

**Details:**
- Changes are immediate and permanent
- No history stack to undo/redo actions
- Users must manually revert if mistakes are made

**Workaround:**
- Use browser's page reload to reset to saved LocalStorage state
- Manually type correct values

**Future Fix:**
- Implement history stack
- Add Ctrl+Z / Ctrl+Y keyboard shortcuts
- Add Undo/Redo buttons to UI

---

### 3. Limited Error Recovery
**Severity:** Low
**Impact:** If JSZip fails to load, export button doesn't work gracefully

**Details:**
- If JSZip CDN fails to load, export fails silently or throws generic error
- No retry mechanism for failed CDN loads
- No offline fallback

**Workaround:**
- Check browser console for specific error messages
- Refresh page if CDN fails to load

**Future Fix:**
- Add explicit error messages if JSZip not loaded
- Implement retry logic for CDN failures
- Consider bundling JSZip for offline use

---

## Browser-Specific Quirks

### Mobile Safari (iOS)
**Issue:** ZIP file download behavior
- Files download to "Files" app instead of Downloads
- May require user confirmation
- Limited sandbox prevents direct file access

**Workaround:** Instructions to check "Files" app after download

---

### Firefox
**Status:** Not fully tested
- Expected to work (uses standard Web APIs)
- May have slight visual differences in form styling
- Download behavior slightly different

**Recommendation:** Manual testing before production deployment

---

### Internet Explorer / Edge Legacy
**Status:** Not supported
- ES6+ syntax not supported
- Promise/async functions not supported
- JSZip requires modern browser

**Recommendation:** Add browser compatibility notice to README

---

### Safari (Desktop)
**Issue:** Strict cross-origin policies
- May block some file:// protocol access
- CDN loading may be restricted
- LocalStorage quota may differ

**Workaround:** Use http://localhost instead of file:// protocol

---

## Future Improvements

### High Priority
1. **Required Field Validation**
   - Add visual indicators for required fields
   - Show error messages before export
   - Prevent export if critical fields empty

2. **Template Management**
   - Add UI to create custom templates
   - Add template import/export
   - Add template editing capability

3. **Better Error Handling**
   - User-friendly error messages
   - Recovery suggestions
   - Retry mechanisms

### Medium Priority
4. **Undo/Redo**
   - History stack for form changes
   - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
   - Clear history button

5. **Configuration Preview**
   - Show generated file contents before export
   - Allow individual file editing
   - Side-by-side preview

6. **Additional Templates**
   - More built-in templates
   - Community template gallery
   - Template rating/reviews

### Low Priority
7. **Theme Toggle**
   - Dark/Light theme switch
   - Custom color schemes
   - High contrast mode

8. **Advanced Features**
   - Batch export multiple agents
   - Template versioning
   - Configuration diff tool

9. **Localization**
   - Multi-language support
   - RTL language support
   - Region-specific templates

10. **Integration Options**
    - Direct GitHub integration
    - GitLab integration
    - CLI tool companion

---

## Performance Notes

### CDN Dependencies
- **JSZip:** ~150KB (gzipped: ~45KB)
- **Tailwind CSS:** ~80KB (gzipped: ~25KB) - production size
- **Total:** ~230KB (gzipped: ~70KB)

**Impact:** Initial page load may take 2-3 seconds on slow connections

**Mitigation:** CDNs have good caching, subsequent loads faster

### Large Forms
- Long textareas may impact performance on low-end devices
- Live preview updates on every keystroke may cause lag

**Future Fix:** Debounce preview updates, optimize rendering

---

## Security Considerations

### Client-Side Only
- ✅ No server-side code reduces attack surface
- ✅ No API keys or secrets in code
- ✅ All user data stays in browser
- ✅ No external data transmission

### Potential Risks
1. **XSS via Markdown output** - Currently no sanitization
   - Risk: Low - output is for local use only
   - Mitigation: Document that output is not for untrusted sources

2. **LocalStorage manipulation** - Data stored in browser
   - Risk: Low - only affects local user
   - Mitigation: Namespaced keys (apb: prefix)

3. **CDN compromise** - If Tailwind or JSZip CDN is hacked
   - Risk: Low - reputable CDNs (cdnjs)
   - Mitigation: Monitor for CDN updates, consider bundling

---

## Testing Gaps

### Automated Testing
- ✅ File generation logic tested
- ✅ ZIP structure validated
- ✅ Markdown syntax checked
- ⏳ Form interaction not fully automated
- ⏳ Browser-specific behaviors not automated

### Manual Testing Needed
- ⏳ Firefox compatibility
- ⏳ Safari compatibility (both desktop and mobile)
- ⏳ Edge (Chromium-based) compatibility
- ⏳ Mobile responsiveness on various devices
- ⏳ Touch interaction testing
- ⏳ Performance testing on slow connections

---

## Version History

### v0.2.0 (Current)
- Implemented Phase 2: Templates + Preview
- Added ZIP export with JSZip
- Added live preview functionality
- Added 3 built-in templates
- Added LocalStorage persistence
- Added comprehensive documentation

### v0.1.0 (Initial)
- Project foundation
- Basic wizard scaffold
- Placeholder generator and exporter
- Storage helper
- Starter template registry

---

## Support Resources

### Documentation
- `README.md` - Getting started guide
- `TESTING_GUIDE.md` - How to test the application
- `EXPORT_IMPLEMENTATION.md` - Technical details of export implementation
- `PHASE2_SUMMARY.md` - Summary of Phase 2 work

### Testing Tools
- `test-export.html` - Browser-based automated tests
- `validate-export.js` - Node.js validation script
- `test-files.js` - File generation test script

### GitHub Issues
For bug reports and feature requests, please use:
https://github.com/Vellis59/agent-prompt-builder/issues

---

## Contact & Feedback

This is an open-source project. Contributions welcome!

For questions or feedback:
- Open an issue on GitHub
- Check documentation first
- Review existing issues before creating new ones
