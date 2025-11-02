/**
 * Agent Registry
 * Exports all available agents
 */

export { BaseAgent } from './base-agent.js';
export { ExplorerAgent } from './explorer.js';
export { PlannerAgent } from './planner.js';
export { CoderAgent } from './coder.js';
export { ReviewerAgent } from './reviewer.js';

// Agent factory
export function createAgent(type) {
  switch (type.toLowerCase()) {
    case 'explorer':
      return new (await import('./explorer.js')).ExplorerAgent();
    case 'planner':
      return new (await import('./planner.js')).PlannerAgent();
    case 'coder':
      return new (await import('./coder.js')).CoderAgent();
    case 'reviewer':
      return new (await import('./reviewer.js')).ReviewerAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}
