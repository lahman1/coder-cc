/**
 * Semantic Search Tool for Explorer Agent
 * Uses RAG system for intelligent code search
 */

import { CodebaseIndexer } from '../../rag/indexer.js';

export class SemanticSearchTool {
  constructor() {
    this.name = 'SemanticSearch';
    this.description = 'Search codebase using semantic similarity (AI-powered search)';
    this.indexer = null;
    this.initialized = false;
  }

  /**
   * Initialize the RAG indexer if not already initialized
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      this.indexer = new CodebaseIndexer({
        chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000'
      });

      await this.indexer.initialize();
      this.initialized = true;
      console.log('[SemanticSearch] RAG system initialized');
      return true;
    } catch (error) {
      console.log('[SemanticSearch] RAG not available:', error.message);
      console.log('[SemanticSearch] Falling back to traditional search methods');
      return false;
    }
  }

  /**
   * Check if RAG is available
   */
  async isAvailable() {
    if (this.initialized) return true;
    return await this.initialize();
  }

  /**
   * Execute semantic search
   * @param {Object} input - Search parameters
   * @returns {Object} Search results
   */
  async execute(input) {
    const {
      query,
      type = null, // 'function', 'class', 'test', 'api_endpoint'
      language = null,
      limit = 10
    } = input;

    // Check if RAG is available
    const available = await this.isAvailable();
    if (!available) {
      return {
        success: false,
        message: 'RAG system not available. Please ensure ChromaDB is running and codebase is indexed.',
        fallback: 'Use Grep tool for traditional text search'
      };
    }

    try {
      // Special handling for API endpoint searches
      let searchQuery = query;
      if (type === 'api_endpoint') {
        searchQuery = `API endpoints routes decorators @app.get @app.post @router ${query}`;
      }

      // Perform semantic search
      const results = await this.indexer.searchCode(searchQuery, {
        nResults: limit,
        filterType: type,
        filterLanguage: language,
        includeCode: true
      });

      // Format results for Explorer agent
      const formattedResults = this.formatResults(results);

      return {
        success: true,
        count: results.length,
        results: formattedResults,
        message: `Found ${results.length} relevant code chunks using semantic search`
      };

    } catch (error) {
      console.error('[SemanticSearch] Search failed:', error);
      return {
        success: false,
        message: `Search error: ${error.message}`,
        fallback: 'Use Grep tool instead'
      };
    }
  }

  /**
   * Format search results for Explorer agent consumption
   */
  formatResults(results) {
    return results.map(result => ({
      file: result.metadata.file,
      type: result.metadata.type,
      name: result.metadata.name || 'unknown',
      line: result.metadata.line,
      relevance: this.getRelevanceLevel(result.score),
      score: Math.round(result.score * 100),
      snippet: this.truncateCode(result.code),
      language: result.metadata.language
    }));
  }

  /**
   * Get relevance level based on score
   */
  getRelevanceLevel(score) {
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Truncate code snippet for display
   */
  truncateCode(code, maxLines = 10) {
    if (!code) return '';

    const lines = code.split('\n');
    if (lines.length <= maxLines) {
      return code;
    }

    return lines.slice(0, maxLines).join('\n') + '\n...';
  }
}

// Export singleton instance
export const semanticSearchTool = new SemanticSearchTool();