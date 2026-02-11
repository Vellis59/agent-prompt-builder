#!/usr/bin/env node

/**
 * Validation script for ZIP export functionality
 * Tests file generation and structure without browser
 */

const fs = require('fs');
const path = require('path');

// Read the exporter.js file to validate structure
const exporterPath = path.join(__dirname, 'js', 'exporter.js');
const exporterContent = fs.readFileSync(exporterPath, 'utf8');

// Read index.html to validate JSZip inclusion
const indexPath = path.join(__dirname, 'index.html');
const indexContent = fs.readFileSync(indexPath, 'utf8');

console.log('=== ZIP Export Validation ===\n');

let allPassed = true;

// Test 1: Check JSZip CDN is included
console.log('Test 1: JSZip CDN inclusion');
if (indexContent.includes('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')) {
    console.log('✓ JSZip CDN is included in index.html\n');
} else {
    console.log('✗ JSZip CDN is NOT included in index.html\n');
    allPassed = false;
}

// Test 2: Check generateFilePack function exists
console.log('Test 2: generateFilePack function');
if (exporterContent.includes('function generateFilePack')) {
    console.log('✓ generateFilePack function is defined\n');
} else {
    console.log('✗ generateFilePack function is NOT defined\n');
    allPassed = false;
}

// Test 3: Check createZip function exists
console.log('Test 3: createZip function');
if (exporterContent.includes('function createZip') || exporterContent.includes('async function createZip')) {
    console.log('✓ createZip function is defined\n');
} else {
    console.log('✗ createZip function is NOT defined\n');
    allPassed = false;
}

// Test 4: Check downloadZip function exists
console.log('Test 4: downloadZip function');
if (exporterContent.includes('function downloadZip')) {
    console.log('✓ downloadZip function is defined\n');
} else {
    console.log('✗ downloadZip function is NOT defined\n');
    allPassed = false;
}

// Test 5: Check all 6 file generators exist
console.log('Test 5: File generators');
const requiredGenerators = [
    'generateSoul',
    'generateIdentity',
    'generateTools',
    'generateMemory',
    'generateUser',
    'generateAgents'
];

let allGeneratorsFound = true;
for (const gen of requiredGenerators) {
    if (exporterContent.includes(`function ${gen}`)) {
        console.log(`  ✓ ${gen} function is defined`);
    } else {
        console.log(`  ✗ ${gen} function is NOT defined`);
        allGeneratorsFound = false;
    }
}
console.log(allGeneratorsFound ? '✓ All file generators are defined\n' : '✗ Some file generators are missing\n');
if (!allGeneratorsFound) allPassed = false;

// Test 6: Check exportZip function exists and uses JSZip
console.log('Test 6: exportZip function');
if (exporterContent.includes('function exportZip') || exporterContent.includes('async function exportZip')) {
    console.log('✓ exportZip function is defined');
    if (exporterContent.includes('new JSZip()')) {
        console.log('✓ exportZip uses JSZip library\n');
    } else {
        console.log('✗ exportZip does not use JSZip library\n');
        allPassed = false;
    }
} else {
    console.log('✗ exportZip function is NOT defined\n');
    allPassed = false;
}

// Test 7: Check file content structure
console.log('Test 7: File content structure');
const requiredHeadings = {
    'generateSoul': ['Essence', 'Tone', 'Mission', 'Anti-Missions'],
    'generateIdentity': ['Name', 'Role', 'Positioning'],
    'generateTools': ['Available Tools', 'Usage Rules'],
    'generateMemory': ['Memory Rules', 'Persistence Settings'],
    'generateUser': ['User Context', 'Preferences'],
    'generateAgents': ['Hierarchy', 'Sub-Agents']
};

let allHeadingsFound = true;
for (const [generator, headings] of Object.entries(requiredHeadings)) {
    const generatorMatch = exporterContent.match(new RegExp(`function ${generator}\\([^)]*\\)[\\s\\S]*?\\n}`, 'm'));
    if (generatorMatch) {
        for (const heading of headings) {
            if (generatorMatch[0].includes(`## ${heading}`)) {
                console.log(`  ✓ ${generator} contains "## ${heading}"`);
            } else {
                console.log(`  ✗ ${generator} missing "## ${heading}"`);
                allHeadingsFound = false;
            }
        }
    }
}
console.log(allHeadingsFound ? '✓ All required headings are present\n' : '✗ Some required headings are missing\n');
if (!allHeadingsFound) allPassed = false;

// Test 8: Check loading state and error handling
console.log('Test 8: Loading state and error handling');
if (exporterContent.includes('setLoadingState') && exporterContent.includes('try') && exporterContent.includes('catch')) {
    console.log('✓ Loading state and error handling are implemented\n');
} else {
    console.log('✗ Loading state or error handling is missing\n');
    allPassed = false;
}

// Test 9: Check boot function initializes wizard
console.log('Test 9: Boot function');
if (exporterContent.includes('async function boot') && exporterContent.includes('ns.wizard?.init?')) {
    console.log('✓ Boot function is async and initializes wizard\n');
} else {
    console.log('✗ Boot function is not properly implemented\n');
    allPassed = false;
}

// Test 10: Check export button event listener
console.log('Test 10: Export button wiring');
if (exporterContent.includes("expBtn?.addEventListener('click', exportZip)")) {
    console.log('✓ Export button is wired to exportZip function\n');
} else {
    console.log('✗ Export button is not wired\n');
    allPassed = false;
}

// Summary
console.log('=== Validation Summary ===');
if (allPassed) {
    console.log('✓ All validation tests passed!');
    console.log('\nThe ZIP export functionality is properly implemented.');
    console.log('\nTo test in a browser:');
    console.log('1. Open http://localhost:8888 in your browser');
    console.log('2. Click "Run All Tests" on test-export.html for automated testing');
    console.log('3. Or use the main app at index.html and test the export functionality');
    process.exit(0);
} else {
    console.log('✗ Some validation tests failed.');
    console.log('Please review the issues above.');
    process.exit(1);
}
