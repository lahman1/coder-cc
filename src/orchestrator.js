/**
 * Multi-Agent Orchestrator
 * Manages the pipeline of specialized agents
 */

import { ExplorerAgent } from './agents/explorer.js';
import { PlannerAgent } from './agents/planner.js';
import { CoderAgent } from './agents/coder.js';
import { ReviewerAgent } from './agents/reviewer.js';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

export class Orchestrator {
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries || 2,
      enableReviewer: config.enableReviewer || false,
      ...config
    };

    // Define the agent pipeline (extensible for future agents)
    this.stages = [
      { name: 'explorer', agent: new ExplorerAgent(), required: true },
      { name: 'planner', agent: new PlannerAgent(), required: true },
      { name: 'coder', agent: new CoderAgent(), required: true },
      { name: 'reviewer', agent: new ReviewerAgent(), required: false, enabled: this.config.enableReviewer },
    ];
  }

  /**
   * Main execution method - runs the complete pipeline
   */
  async execute(userRequest) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          Multi-Agent Orchestrator Starting                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const context = {
      request: userRequest,
      timestamp: new Date().toISOString()
    };

    const results = {
      success: false,
      stages: {},
      errors: []
    };

    try {
      // Execute each stage in sequence
      for (const stage of this.stages) {
        // Skip disabled stages
        if (stage.enabled === false) {
          console.log(`\n⊘ Skipping ${stage.name.toUpperCase()} (disabled)\n`);
          continue;
        }

        console.log(`\n┌─ STAGE: ${stage.name.toUpperCase()} ─────────────────────────────────┐\n`);

        try {
          const stageResult = await this.runStageWithRetry(stage, context);

          // Store result in context for next stages
          context[stage.name] = stageResult.validated.data || stageResult;
          results.stages[stage.name] = {
            success: true,
            result: stageResult
          };

          console.log(`\n└─ ${stage.name.toUpperCase()} COMPLETED ✓ ────────────────────────────┘\n`);

        } catch (error) {
          console.error(`\n└─ ${stage.name.toUpperCase()} FAILED ✗ ───────────────────────────────┘`);
          console.error(`Error: ${error.message}\n`);

          results.stages[stage.name] = {
            success: false,
            error: error.message
          };
          results.errors.push({
            stage: stage.name,
            error: error.message
          });

          // If stage is required, stop pipeline
          if (stage.required) {
            throw new Error(`Required stage '${stage.name}' failed: ${error.message}`);
          }
        }
      }

      results.success = true;

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║          Multi-Agent Pipeline Completed ✓                  ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      return results;

    } catch (error) {
      results.success = false;
      results.error = error.message;

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║          Multi-Agent Pipeline Failed ✗                    ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      throw error;
    }
  }

  /**
   * Run a single stage with retry logic
   */
  async runStageWithRetry(stage, context) {
    let lastError = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Run the agent
        const result = await stage.agent.execute(context, attempt);

        // Check validation
        if (result.validated && result.validated.success) {
          return result;
        } else {
          const errorMsg = result.validated?.message || 'Agent validation failed';
          console.log(`\n⚠️  Validation failed: ${errorMsg}`);
          lastError = new Error(errorMsg);

          if (attempt < this.config.maxRetries) {
            console.log(`🔄 Retrying (attempt ${attempt + 2}/${this.config.maxRetries + 1})...\n`);
            continue;
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`\n⚠️  Agent error: ${error.message}`);

        if (attempt < this.config.maxRetries) {
          console.log(`🔄 Retrying (attempt ${attempt + 2}/${this.config.maxRetries + 1})...\n`);
          continue;
        }
      }
    }

    // All retries exhausted - ask user for intervention
    console.log(`\n❌ All ${this.config.maxRetries + 1} attempts failed for ${stage.name} agent.\n`);

    const shouldContinue = await this.askUserForIntervention(stage, context, lastError);

    if (!shouldContinue) {
      throw lastError || new Error(`${stage.name} stage failed after all retries`);
    }

    // User provided manual input or chose to continue
    return {
      validated: {
        success: true,
        data: context[stage.name],
        message: 'User intervention - continuing'
      }
    };
  }

  /**
   * Ask user for intervention when agent fails
   */
  async askUserForIntervention(stage, context, error) {
    const rl = readline.createInterface({ input, output });

    try {
      console.log(`\n╔════════════════════════════════════════════════════════════╗`);
      console.log(`║  ${stage.name.toUpperCase()} AGENT NEEDS HELP`);
      console.log(`╚════════════════════════════════════════════════════════════╝\n`);
      console.log(`Error: ${error.message}\n`);
      console.log(`Options:`);
      console.log(`  1. Continue anyway (skip validation)`);
      console.log(`  2. Abort pipeline`);

      if (stage.name === 'planner') {
        console.log(`  3. Manually provide a todo checklist`);
      }

      const answer = await rl.question('\nYour choice (1-2): ');

      switch (answer.trim()) {
        case '1':
          console.log('Continuing...\n');
          return true;

        case '2':
          console.log('Aborting...\n');
          return false;

        case '3':
          if (stage.name === 'planner') {
            console.log('\nPlease enter your checklist (one item per line, press Enter twice to finish):');
            const todos = [];
            let line;
            while ((line = await rl.question('')) !== '') {
              todos.push({
                content: line,
                status: 'pending',
                activeForm: line
              });
            }
            context.plan = { todos };
            console.log(`\nAdded ${todos.length} manual todos.\n`);
            return true;
          }
          break;

        default:
          console.log('Invalid choice, aborting...\n');
          return false;
      }
    } finally {
      rl.close();
    }

    return false;
  }

  /**
   * Get summary of what was accomplished
   */
  getSummary(results) {
    const summary = {
      success: results.success,
      stages_completed: Object.keys(results.stages).filter(s => results.stages[s].success).length,
      total_stages: this.stages.length,
      files_created: [],
      errors: results.errors
    };

    // Extract files created from Coder stage
    if (results.stages.coder?.result?.validated?.data?.files_created) {
      summary.files_created = results.stages.coder.result.validated.data.files_created;
    }

    return summary;
  }
}
