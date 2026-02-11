# v0.2 Validation & Import Test Cases

## Real-time Validation

1. **Agent name - required**
   - Input: empty
   - Expected: red error, Next disabled on Step 1.

2. **Agent name - min length**
   - Input: `ab`
   - Expected: error `at least 3 characters`.

3. **Agent name - alphanumeric only**
   - Input: `my agent`
   - Expected: error `letters and numbers only`.

4. **Agent name valid**
   - Input: `Agent007`
   - Expected: green check.

5. **Role required + min length**
   - Input: `short role`
   - Expected: error until >= 20 chars.

6. **Tools required**
   - Step 3, input empty tools
   - Expected: Next disabled.

7. **Tools valid**
   - Input: `read, write`
   - Expected: green check, Next enabled.

8. **Review summary**
   - Navigate to Step 5 with any invalid required field
   - Expected: summary card lists step + errors.

## Import JSON / ZIP

1. **Valid JSON import**
   - Use `test-data/valid-agent-import.json`
   - Expected: fields populated, success message, validations pass.

2. **Invalid JSON import**
   - Use `test-data/invalid-agent-import.json`
   - Expected: clear error message; form unchanged.

3. **ZIP import**
   - Zip contains a JSON config file
   - Expected: first `.json` parsed and imported.

4. **Unsupported file type**
   - Upload `.txt`
   - Expected: `Unsupported file type` error.

5. **Bad ZIP**
   - ZIP without JSON
   - Expected: `No JSON file found inside ZIP archive`.
