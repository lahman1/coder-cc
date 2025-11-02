/**
 * Request Analyzer
 * Analyzes user requests to determine the best execution strategy
 */

export class RequestAnalyzer {
  constructor() {
    // Define patterns for different request types
    this.patterns = {
      // Multi-agent suitable tasks
      multiAgent: {
        creation: [
          /\b(create|write|generate|implement|build|develop|add)\s+(a\s+)?(new\s+)?/i,
          /\b(make|code|program)\s+(me\s+)?a\s+/i,
          /\b(set\s*up|setup|initialize|scaffold)\s+/i,
        ],
        exploration: [
          /\b(find|locate|search|explore|discover|list)\s+.*(files?|code|functions?|classes?|methods?|endpoints?|routes?|apis?)/i,
          /\b(where|what)\s+.*(is|are|does)\s+.*(implemented|defined|located|found)/i,
          /\b(show|get)\s+(me\s+)?(all|the)\s+.*(endpoints?|routes?|apis?|functions?|classes?)/i,
          /\b(navigate|go)\s+to\s+.*and\s+(find|list|show)/i,
        ],
        refactoring: [
          /\b(refactor|restructure|reorganize|optimize|improve|enhance|fix|debug|update|modify|change|edit)\s+/i,
          /\b(convert|transform|migrate|port|translate)\s+.*(to|from|into)/i,
          /\b(rename|move|extract|inline|split|merge)\s+/i,
        ],
        testing: [
          /\b(test|tests|testing)\s+.*(write|create|generate|add|implement)/i,
          /\b(write|create|add|generate)\s+.*(test|tests|testing|unit\s*test|integration\s*test)/i,
          /\b(coverage|test\s*suite)\s+/i,
        ],
        review: [
          /\b(review|analyze|evaluate|assess|check|audit|inspect)\s+.*(code|implementation|architecture)/i,
          /\b(code\s*review|peer\s*review)\s+/i,
          /\b(find|detect|identify)\s+.*(issues?|bugs?|problems?|vulnerabilities?|security)/i,
        ]
      },

      // Single-agent suitable tasks
      singleAgent: {
        simple: [
          /^(what|how|why|when|where|who|which|explain|describe|define)\s+/i,
          /\b(tell|teach|show)\s+me\s+(about|how)\s+/i,
          /\?$/,  // Questions ending with ?
        ],
        commands: [
          /^(run|execute|exec|bash|shell|cmd)\s+/i,
          /\b(npm|pip|git|docker|kubectl|cargo|go|python|node)\s+/i,
          /^(ls|cd|pwd|cat|echo|mkdir|rm|cp|mv|grep|find)\s+/i,
        ],
        status: [
          /\b(check|show|display|print|list)\s+.*(status|version|info|configuration|settings?|logs?)\s*/i,
          /\b(what'?s?|show)\s+(the\s+)?(current|latest|recent)\s+/i,
        ],
        documentation: [
          /\b(document|docs?|readme|tutorial|guide|manual|help)\s+/i,
          /\b(how\s+to|getting\s+started|quick\s*start)\s+/i,
        ]
      }
    };

    // Keywords that strongly indicate multi-agent need
    this.multiAgentKeywords = [
      'pipeline', 'workflow', 'architect', 'design', 'plan',
      'todo', 'checklist', 'step-by-step', 'tasks',
      'explore', 'codebase', 'repository', 'project'
    ];

    // Keywords that indicate single-agent sufficiency
    this.singleAgentKeywords = [
      'quick', 'simple', 'just', 'only', 'single',
      'command', 'run', 'execute', 'status', 'version'
    ];
  }

  /**
   * Analyze a request and determine the best execution strategy
   * @param {string} request - The user's request
   * @returns {Object} Analysis result with recommendation
   */
  analyze(request) {
    const requestLower = request.toLowerCase();
    const result = {
      request: request,
      recommendation: 'single-agent',  // Default
      confidence: 0.5,
      category: 'unknown',
      reasoning: [],
      suggestedAgents: []
    };

    // Check multi-agent patterns
    for (const [category, patterns] of Object.entries(this.patterns.multiAgent)) {
      for (const pattern of patterns) {
        if (pattern.test(request)) {
          result.recommendation = 'multi-agent';
          result.category = category;
          result.confidence = Math.max(result.confidence, 0.8);
          result.reasoning.push(`Matches ${category} pattern: ${pattern.source}`);

          // Suggest specific agents based on category
          switch(category) {
            case 'creation':
              result.suggestedAgents = ['explorer', 'planner', 'coder'];
              break;
            case 'exploration':
              result.suggestedAgents = ['explorer'];
              break;
            case 'refactoring':
              result.suggestedAgents = ['explorer', 'planner', 'coder', 'reviewer'];
              break;
            case 'testing':
              result.suggestedAgents = ['explorer', 'planner', 'coder'];
              break;
            case 'review':
              result.suggestedAgents = ['explorer', 'reviewer'];
              break;
          }
          break;
        }
      }
      if (result.category !== 'unknown') break;
    }

    // Check single-agent patterns if no multi-agent match
    if (result.recommendation !== 'multi-agent') {
      for (const [category, patterns] of Object.entries(this.patterns.singleAgent)) {
        for (const pattern of patterns) {
          if (pattern.test(request)) {
            result.recommendation = 'single-agent';
            result.category = category;
            result.confidence = Math.max(result.confidence, 0.9);
            result.reasoning.push(`Matches ${category} pattern: ${pattern.source}`);
            break;
          }
        }
        if (result.category !== 'unknown') break;
      }
    }

    // Check for keyword indicators
    for (const keyword of this.multiAgentKeywords) {
      if (requestLower.includes(keyword)) {
        result.confidence = Math.min(result.confidence + 0.1, 1.0);
        if (result.recommendation !== 'multi-agent') {
          result.reasoning.push(`Contains multi-agent keyword: "${keyword}"`);
        }
      }
    }

    for (const keyword of this.singleAgentKeywords) {
      if (requestLower.includes(keyword)) {
        if (result.recommendation === 'multi-agent') {
          result.confidence = Math.max(result.confidence - 0.2, 0.3);
          result.reasoning.push(`Contains single-agent keyword: "${keyword}" (lowering confidence)`);
        }
      }
    }

    // Length heuristic - very short requests are likely simple
    if (request.length < 30 && result.category === 'unknown') {
      result.recommendation = 'single-agent';
      result.category = 'simple';
      result.confidence = 0.7;
      result.reasoning.push('Short request likely indicates simple task');
    }

    // Complex multi-part requests
    if ((request.match(/\band\b/gi) || []).length >= 2) {
      result.confidence = Math.min(result.confidence + 0.2, 1.0);
      result.reasoning.push('Multiple parts detected (uses "and" multiple times)');
      if (result.recommendation === 'single-agent' && result.confidence < 0.6) {
        result.recommendation = 'multi-agent';
        result.category = 'complex';
      }
    }

    return result;
  }

  /**
   * Get a human-readable summary of the analysis
   * @param {Object} analysis - The analysis result
   * @returns {string} Summary text
   */
  getSummary(analysis) {
    const confidence = Math.round(analysis.confidence * 100);
    let summary = `\n[ANALYSIS] Request Category: ${analysis.category}\n`;
    summary += `[ANALYSIS] Recommendation: ${analysis.recommendation.toUpperCase()} (${confidence}% confidence)\n`;

    if (analysis.reasoning.length > 0) {
      summary += `[ANALYSIS] Reasoning:\n`;
      analysis.reasoning.slice(0, 3).forEach(reason => {
        summary += `  - ${reason}\n`;
      });
    }

    if (analysis.suggestedAgents.length > 0) {
      summary += `[ANALYSIS] Suggested agents: ${analysis.suggestedAgents.join(' → ')}\n`;
    }

    return summary;
  }
}

// Export singleton instance
export const requestAnalyzer = new RequestAnalyzer();