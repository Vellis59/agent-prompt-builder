/**
 * exporter.js
 * ZIP export functionality using JSZip for agent prompt files.
 * Generates 6 Markdown files (Soul.md, Identity.md, Tools.md, Memory.md, User.md, Agents.md)
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

(function registerExporter(ns) {
  'use strict';

  /**
   * Generate Soul.md - agent essence, tone, mission, anti-missions
   */
  function generateSoul(formData) {
    return `# Soul.md

## Essence
${formData.essence || 'To be defined'}

## Tone
${formData.tone || 'neutral'}

## Mission
${formData.mission || 'To assist the user effectively and efficiently.'}

## Anti-Missions
${formData.antiMissions || '- Do not cause harm to users or systems\n- Do not compromise data security\n- Do not bypass established safeguards'}
`;
  }

  /**
   * Generate Identity.md - name, role, positioning
   */
  function generateIdentity(formData) {
    return `# Identity.md

## Name
${formData.name || 'Assistant'}

## Role
${formData.role || 'General Purpose Assistant'}

## Positioning
${formData.positioning || 'Reliable, helpful, and safety-focused assistant for task completion.'}

## Capabilities
${formData.capabilities || '- Task execution\n- Information retrieval\n- Analysis and recommendations'}
`;
  }

  /**
   * Generate Tools.md - available tools and usage rules
   */
  function generateTools(formData) {
    return `# Tools.md

## Available Tools
${formData.tools || 'Standard toolset based on assigned capabilities.'}

## Usage Rules
${formData.usageRules || '- Use tools only when necessary\n- Prefer simple, auditable commands\n- Always explain tool usage before execution\n- Respect rate limits and quotas'}

## Tool Access Levels
${formData.toolAccess || 'Read/Write as defined by role and permissions.'}

## Safety Constraints
${formData.toolSafety || 'All tool usage must comply with safety policies. Validate before execution.'}
`;
  }

  /**
   * Generate Memory.md - memory rules, persistence settings
   */
  function generateMemory(formData) {
    return `# Memory.md

## Memory Rules
${formData.memoryRules || '- Remember context within conversation scope\n- Maintain consistency across responses\n- Do not store sensitive data beyond session'}

## Persistence Settings
${formData.persistence || 'Session-based memory. No long-term persistence unless explicitly authorized.'}

## Context Window
${formData.contextWindow || 'Use available context efficiently. Prioritize recent and relevant information.'}

## Memory Cleanup
${formData.memoryCleanup || 'Clear sensitive information when no longer needed.'}
`;
  }

  /**
   * Generate User.md - user context and preferences
   */
  function generateUser(formData) {
    return `# User.md

## User Context
${formData.userContext || 'User seeking assistance with various tasks.'}

## Preferences
${formData.preferences || '- Clear, concise responses\n- Actionable recommendations\n- Proactive identification of issues'}

## Communication Style
${formData.commStyle || 'Direct, professional, and helpful.'}

## Feedback Handling
${formData.feedbackHandling || 'Accept and incorporate feedback to improve performance.'}
`;
  }

  /**
   * Generate Agents.md - sub-agent definitions (if hierarchy = Manager)
   */
  function generateAgents(formData) {
    const isManager = formData.hierarchy === 'Manager';
    
    if (!isManager) {
      return `# Agents.md

## Hierarchy
${formData.hierarchy || 'Independent Agent'}

## Sub-Agents
None (independent agent configuration).
`;
    }

    return `# Agents.md

## Hierarchy
${formData.hierarchy || 'Manager'}

## Manager
- Name: ${formData.managerName || formData.name || 'Manager'}
- Scope: ${formData.managerScope || 'Orchestrates sub-agents for complex tasks'}

## Sub-Agents
${formData.subAgents || '### Sub-Agent 1\n- Name: Specialist\n- Role: Domain expert\n- Capabilities: Specialized analysis and recommendations\n\n### Sub-Agent 2\n- Name: Executor\n- Role: Task execution\n- Capabilities: Action implementation'}

## Coordination Rules
${formData.coordinationRules || '- Manager delegates based on task complexity\n- Sub-agents report back to manager\n- Manager consolidates responses for user'}
`;
  }

  /**
   * Generate complete file pack from form data
   * @param {Object} formData - Collected wizard form data
   * @returns {Array<{filename: string, content: string}>} Array of file objects
   */
  function generateFilePack(formData) {
    const data = formData || {};

    return [
      { filename: 'Soul.md', content: generateSoul(data) },
      { filename: 'Identity.md', content: generateIdentity(data) },
      { filename: 'Tools.md', content: generateTools(data) },
      { filename: 'Memory.md', content: generateMemory(data) },
      { filename: 'User.md', content: generateUser(data) },
      { filename: 'Agents.md', content: generateAgents(data) }
    ];
  }

  /**
   * Create ZIP blob from file array
   * @param {Array<{filename: string, content: string}>} files - Files to package
   * @param {string} agentName - Name for the folder inside ZIP
   * @returns {Promise<Blob>} ZIP file as Blob
   */
  async function createZip(files, agentName = 'agent') {
    // Check if JSZip is loaded
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is not loaded. Please include the JSZip CDN.');
    }

    const zip = new JSZip();
    const folderName = agentName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const folder = zip.folder(folderName);

    // Add each file to the folder
    files.forEach(file => {
      folder.file(file.filename, file.content);
    });

    // Generate ZIP blob
    return await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Trigger browser download for a blob
   * @param {Blob} blob - Content to download
   * @param {string} filename - Name for downloaded file
   */
  function downloadZip(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Show loading state on export button
   * @param {boolean} isLoading - Loading state
   */
  function setLoadingState(isLoading) {
    const btn = document.getElementById('btn-export');
    if (!btn) return;

    if (isLoading) {
      btn.disabled = true;
      btn.textContent = 'Generating ZIP...';
      btn.classList.add('opacity-70', 'cursor-not-allowed');
    } else {
      btn.disabled = false;
      btn.textContent = 'Export ZIP';
      btn.classList.remove('opacity-70', 'cursor-not-allowed');
    }
  }

  /**
   * Show success/error message in output area
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether it's an error message
   */
  function showMessage(message, isError = false) {
    const out = document.getElementById('output');
    if (out) {
      out.textContent = message;
      out.className = isError 
        ? 'mt-6 min-h-56 overflow-auto rounded-xl border border-red-900 bg-slate-950 p-4 text-xs text-red-300'
        : 'mt-6 min-h-56 overflow-auto rounded-xl border border-emerald-900 bg-slate-950 p-4 text-xs text-emerald-300';
    }
  }

  /**
   * Main export function - orchestrates ZIP creation and download
   */
  async function exportZip() {
    try {
      setLoadingState(true);
      showMessage('🔄 Generating agent files...', false);

      // Get form data from wizard state
      const wizardState = ns.wizard?.state?.formData || {};
      
      // Fallback: try to get from storage
      const lastGenerated = ns.storage?.get?.('lastGeneratedConfig') || {};
      const formData = { ...wizardState, ...lastGenerated };

      // Generate file pack
      const files = generateFilePack(formData);
      showMessage(`📦 Generated ${files.length} agent files:\n${files.map(f => `  - ${f.filename}`).join('\n')}\n\n🔄 Creating ZIP...`, false);

      // Determine agent name for folder
      const agentName = formData.name || formData.essence?.split(' ')[0] || 'agent';
      const timestamp = new Date().toISOString().slice(0, 10);
      const zipFilename = `${agentName.replace(/[^a-zA-Z0-9-_]/g, '-')}-${timestamp}.zip`;

      // Create ZIP
      const zipBlob = await createZip(files, agentName);
      
      // Download
      downloadZip(zipBlob, zipFilename);

      // Show success
      showMessage(`✅ Export successful!\n\n📦 ZIP file: ${zipFilename}\n\n📄 Contents:\n${files.map(f => `  - ${f.filename}`).join('\n')}\n\n📁 Folder structure:\n  ${agentName}/\n${files.map(f => `    ${f.filename}`).join('\n')}\n\nOpen the ZIP to verify all files are present.`, false);

    } catch (error) {
      console.error('[exporter] Export failed:', error);
      showMessage(`❌ Export failed: ${error.message}\n\nPlease check:\n1. JSZip CDN is loaded\n2. Browser supports Blob downloads\n3. Console for additional errors`, true);
    } finally {
      setLoadingState(false);
    }
  }

  /**
   * Boot function - initialize exporter
   */
  async function boot() {
    await ns.wizard?.init?.();

    const out = document.getElementById('output');
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const genBtn = document.getElementById('btn-generate');
    const expBtn = document.getElementById('btn-export');

    prevBtn?.addEventListener('click', () => ns.wizard?.prev?.());
    nextBtn?.addEventListener('click', () => ns.wizard?.next?.());

    genBtn?.addEventListener('click', () => {
      ns.wizard?.collectFormData?.();
      const generated = ns.generator?.generateConfig?.() || '{}';
      if (out) {
        out.textContent = generated;
        out.className = 'mt-6 min-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-emerald-300';
      }
      try {
        ns.storage?.set?.('lastGeneratedConfig', JSON.parse(generated));
      } catch (e) {
        console.warn('[exporter] Could not parse generated config:', e);
      }
    });

    expBtn?.addEventListener('click', exportZip);

    // Show ready message
    if (out && !out.textContent.trim()) {
      out.textContent = '📋 Agent Prompt Builder Ready\n\nComplete the wizard steps, then:\n1. Click "Generate Config" to preview\n2. Click "Export ZIP" to download all agent files';
    }
  }

  ns.exporter = {
    generateFilePack,
    createZip,
    downloadZip,
    exportZip
  };
  ns.boot = boot;
})(window.AgentPromptBuilder);
