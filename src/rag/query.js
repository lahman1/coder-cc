/**
 * RAG Query Interface
 * Performs semantic search on indexed codebase
 */

import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';

export class CodebaseQuery {
  constructor(config = {}) {
    this.config = {
      chromaUrl: config.chromaUrl || 'http://localhost:8000',
      collectionName: config.collectionName || 'codebase',
      embeddingModel: config.embeddingModel || 'Xenova/all-MiniLM-L6-v2',
      defaultTopK: config.defaultTopK || 5,
      ...config
    };

    this.client = null;
    this.collection = null;
    this.embedder = null;
    this.cache = new Map(); // Cache query results
  }

  /**
   * Initialize connection to ChromaDB and load embedding model
   */
  async initialize() {
    try {
      // Connect to ChromaDB
      this.client = new ChromaClient({ path: this.config.chromaUrl });

      // Get collection
      this.collection = await this.client.getCollection({ name: this.config.collectionName });

      // Load embedding model
      this.embedder = await pipeline('feature-extraction', this.config.embeddingModel);

      return true;
    } catch (error) {
      console.error(`Failed to initialize RAG query: ${error.message}`);
      return false;
    }
  }

  /**
   * Semantic search for code snippets
   */
  async search(query, options = {}) {
    const {
      topK = this.config.defaultTopK,
      language = null,
      type = null, // 'function', 'class', 'test', 'file'
      useCache = true
    } = options;

    // Check cache
    const cacheKey = `${query}:${topK}:${language}:${type}`;
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Build filter (if specified)
      const where = {};
      if (language) where.language = language;
      if (type) where.type = type;

      // Query ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: Object.keys(where).length > 0 ? where : undefined
      });

      // Format results
      const formattedResults = this.formatResults(results);

      // Cache results
      if (useCache) {
        this.cache.set(cacheKey, formattedResults);
      }

      return formattedResults;

    } catch (error) {
      console.error(`RAG search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Find similar code to a given code snippet
   */
  async findSimilarCode(codeSnippet, options = {}) {
    return await this.search(codeSnippet, options);
  }

  /**
   * Find test patterns
   */
  async findTestPatterns(testDescription, options = {}) {
    return await this.search(testDescription, {
      ...options,
      type: 'test'
    });
  }

  /**
   * Get project conventions (by finding common patterns)
   */
  async getProjectConventions(language, options = {}) {
    // Search for common imports and patterns
    const importResults = await this.search('import dependencies setup', {
      ...options,
      language: language,
      topK: 10
    });

    // Extract unique import patterns
    const conventions = {
      language: language,
      common_imports: [],
      test_patterns: [],
      class_patterns: []
    };

    importResults.forEach(result => {
      if (result.metadata.imports) {
        conventions.common_imports.push(...result.metadata.imports);
      }

      if (result.metadata.type === 'test') {
        conventions.test_patterns.push({
          name: result.metadata.name,
          file: result.metadata.file,
          snippet: result.text.substring(0, 200)
        });
      } else if (result.metadata.type === 'class') {
        conventions.class_patterns.push({
          name: result.metadata.name,
          file: result.metadata.file,
          snippet: result.text.substring(0, 200)
        });
      }
    });

    // Deduplicate imports
    conventions.common_imports = [...new Set(conventions.common_imports)];

    return conventions;
  }

  /**
   * Find functions/classes by name (fuzzy search)
   */
  async findByName(name, options = {}) {
    const {
      topK = this.config.defaultTopK,
      language = null,
      type = null
    } = options;

    try {
      // Build filter
      const where = {};
      if (language) where.language = language;
      if (type) where.type = type;

      // Get all items (ChromaDB doesn't have name search, so we use semantic search on the name)
      const results = await this.search(name, {
        topK: topK * 2, // Get more results since we'll filter
        language: language,
        type: type
      });

      // Filter by name similarity
      const filtered = results.filter(r =>
        r.metadata.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(r.metadata.name.toLowerCase())
      );

      return filtered.slice(0, topK);

    } catch (error) {
      console.error(`Find by name failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get file context (all chunks from a specific file)
   */
  async getFileContext(filePath, options = {}) {
    const { topK = 20 } = options;

    try {
      const results = await this.collection.get({
        where: { file: filePath },
        limit: topK
      });

      return this.formatGetResults(results);
    } catch (error) {
      console.error(`Get file context failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Generate embedding for a query
   */
  async generateEmbedding(text) {
    const truncated = text.substring(0, 512);
    const output = await this.embedder(truncated, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Format query results
   */
  formatResults(chromaResults) {
    const formatted = [];

    if (!chromaResults.ids || chromaResults.ids.length === 0) {
      return formatted;
    }

    const ids = chromaResults.ids[0];
    const documents = chromaResults.documents[0];
    const metadatas = chromaResults.metadatas[0];
    const distances = chromaResults.distances ? chromaResults.distances[0] : [];

    for (let i = 0; i < ids.length; i++) {
      formatted.push({
        id: ids[i],
        text: documents[i],
        metadata: metadatas[i],
        similarity: distances[i] !== undefined ? 1 - distances[i] : 1, // Convert distance to similarity
        file: metadatas[i].file,
        name: metadatas[i].name,
        type: metadatas[i].type,
        language: metadatas[i].language,
        line: metadatas[i].line
      });
    }

    return formatted;
  }

  /**
   * Format get results (from direct get, not query)
   */
  formatGetResults(chromaResults) {
    const formatted = [];

    if (!chromaResults.ids || chromaResults.ids.length === 0) {
      return formatted;
    }

    for (let i = 0; i < chromaResults.ids.length; i++) {
      formatted.push({
        id: chromaResults.ids[i],
        text: chromaResults.documents[i],
        metadata: chromaResults.metadatas[i],
        file: chromaResults.metadatas[i].file,
        name: chromaResults.metadatas[i].name,
        type: chromaResults.metadatas[i].type,
        language: chromaResults.metadatas[i].language,
        line: chromaResults.metadatas[i].line
      });
    }

    return formatted;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get stats about the collection
   */
  async getStats() {
    try {
      const count = await this.collection.count();
      return {
        collection: this.config.collectionName,
        total_chunks: count,
        cache_size: this.cache.size
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

/**
 * Singleton instance for easy access
 */
let queryInstance = null;

export async function getQueryInstance(config) {
  if (!queryInstance) {
    queryInstance = new CodebaseQuery(config);
    await queryInstance.initialize();
  }
  return queryInstance;
}

export function resetQueryInstance() {
  queryInstance = null;
}
