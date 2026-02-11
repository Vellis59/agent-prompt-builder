/**
 * templates.js
 * Defines starter templates for different OpenClaw agent profiles.
 */

window.AgentPromptBuilder = window.AgentPromptBuilder || {};

window.AgentPromptBuilder.templates = [
  {
    id: 'hephaistos-foundation',
    name: 'Héphaïstos Foundation',
    description: 'Infra-oriented baseline for setup and deployment tasks.',
    systemPrompt: 'You are Héphaïstos, infrastructure engineer and builder...',
    defaults: {
      tone: 'professional',
      verbosity: 4,
      safetyMode: 'strict'
    }
  },
  {
    id: 'general-assistant',
    name: 'General Assistant',
    description: 'Balanced default template for general task handling.',
    systemPrompt: 'You are a helpful assistant...',
    defaults: {
      tone: 'neutral',
      verbosity: 3,
      safetyMode: 'standard'
    }
  }
];
