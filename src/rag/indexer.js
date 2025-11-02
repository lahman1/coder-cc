/**
 * RAG Indexer
 * Indexes codebase with function-level chunking for semantic search
 */

import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';
import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

export class CodebaseIndexer {
  constructor(config = {}) {
    this.config = {
      chromaUrl: config.chromaUrl || 'http://localhost:8000',
      collectionName: config.collectionName || 'codebase',
      embeddingModel: config.embeddingModel || 'Xenova/all-MiniLM-L6-v2',
      maxFileSize: config.maxFileSize || 1024 * 1024, // 1MB
      supportedExtensions: config.supportedExtensions || ['.js', '.mjs', '.ts', '.py', '.java', '.cpp', '.c', '.h'],
      ...config
    };

    this.client = null;
    this.collection = null;
    this.embedder = null;
  }

  /**
   * Initialize ChromaDB connection and embedding model
   */
  async initialize() {
    console.log('🔧 Initializing RAG system...');

    try {
      // Initialize ChromaDB client
      this.client = new ChromaClient({ path: this.config.chromaUrl });

      // Load embedding model (runs locally, no API needed!)
      console.log(`📦 Loading embedding model: ${this.config.embeddingModel}`);
      this.embedder = await pipeline('feature-extraction', this.config.embeddingModel);

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({ name: this.config.collectionName });
        console.log(`[SUCCESS] Connected to existing collection: ${this.config.collectionName}`);
      } catch (error) {
        this.collection = await this.client.createCollection({ name: this.config.collectionName });
        console.log(`[SUCCESS] Created new collection: ${this.config.collectionName}`);
      }

      return true;
    } catch (error) {
      console.error(`[FAILED] Failed to initialize RAG: ${error.message}`);
      return false;
    }
  }

  /**
   * Index an entire directory
   */
  async indexDirectory(directoryPath, options = {}) {
    const { verbose = true, excludePatterns = ['node_modules/**', '.git/**', 'dist/**', 'build/**'] } = options;

    console.log(`\n[INFO] Indexing directory: ${directoryPath}`);

    // Find all supported files
    const pattern = `**/*{${this.config.supportedExtensions.join(',')}}`;
    const files = await glob(pattern, {
      cwd: directoryPath,
      ignore: excludePatterns,
      absolute: true
    });

    console.log(`[INFO] Found ${files.length} files to index\n`);

    let indexed = 0;
    let skipped = 0;
    const chunks = [];

    for (const filePath of files) {
      try {
        // Skip large files
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));
        if (stats.size > this.config.maxFileSize) {
          if (verbose) console.log(`[SKIP] Skipping large file: ${filePath}`);
          skipped++;
          continue;
        }

        // Read and chunk the file
        const fileContent = readFileSync(filePath, 'utf-8');
        const fileChunks = await this.chunkFile(filePath, fileContent);

        chunks.push(...fileChunks);
        indexed++;

        if (verbose && indexed % 10 === 0) {
          console.log(`   Processed ${indexed}/${files.length} files...`);
        }

      } catch (error) {
        console.error(`[WARNING] Error processing ${filePath}: ${error.message}`);
        skipped++;
      }
    }

    // Batch insert chunks into ChromaDB
    if (chunks.length > 0) {
      console.log(`\n[INFO] Storing ${chunks.length} code chunks in vector database...`);
      await this.insertChunks(chunks);
    }

    console.log(`\n[SUCCESS] Indexing complete!`);
    console.log(`   Files indexed: ${indexed}`);
    console.log(`   Files skipped: ${skipped}`);
    console.log(`   Total chunks: ${chunks.length}`);

    return {
      files_indexed: indexed,
      files_skipped: skipped,
      chunks_created: chunks.length
    };
  }

  /**
   * Chunk a file into function/class-level pieces
   */
  async chunkFile(filePath, content) {
    const ext = path.extname(filePath);
    const relativePath = filePath; // Could make this relative to project root

    const chunks = [];

    // Determine language
    const language = this.getLanguage(ext);

    // Strategy: Extract functions, classes, and important blocks
    const extractedChunks = this.extractCodeBlocks(content, language);

    for (const chunk of extractedChunks) {
      chunks.push({
        id: `${relativePath}:${chunk.line}:${chunk.name}`,
        text: chunk.code,
        metadata: {
          file: relativePath,
          language: language,
          type: chunk.type, // 'function', 'class', 'method', 'test'
          name: chunk.name,
          line: chunk.line,
          imports: chunk.imports || []
        }
      });
    }

    // If no specific chunks found, create one chunk for the whole file
    if (chunks.length === 0) {
      chunks.push({
        id: `${relativePath}:file`,
        text: content.substring(0, 2000), // First 2000 chars
        metadata: {
          file: relativePath,
          language: language,
          type: 'file',
          name: path.basename(filePath),
          line: 1,
          imports: this.extractImports(content, language)
        }
      });
    }

    return chunks;
  }

  /**
   * Extract code blocks (functions, classes) from source code
   */
  extractCodeBlocks(content, language) {
    const blocks = [];
    const lines = content.split('\n');

    if (language === 'python') {
      // Python: def function_name(...): and class ClassName:
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match function definitions
        const funcMatch = line.match(/^(\s*)def\s+(\w+)\s*\(/);
        if (funcMatch) {
          const indent = funcMatch[1].length;
          const funcName = funcMatch[2];
          const block = this.extractIndentedBlock(lines, i, indent);

          blocks.push({
            type: funcName.startsWith('test_') ? 'test' : 'function',
            name: funcName,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }

        // Match class definitions
        const classMatch = line.match(/^(\s*)class\s+(\w+)/);
        if (classMatch) {
          const indent = classMatch[1].length;
          const className = classMatch[2];
          const block = this.extractIndentedBlock(lines, i, indent);

          blocks.push({
            type: 'class',
            name: className,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }
      }
    } else if (language === 'javascript' || language === 'typescript') {
      // JavaScript/TypeScript: function name() {}, const name = () => {}, class Name {}
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match function declarations
        const funcMatch = line.match(/(?:function|async function)\s+(\w+)\s*\(/);
        if (funcMatch) {
          const funcName = funcMatch[1];
          const block = this.extractBracedBlock(lines, i);

          blocks.push({
            type: funcName.includes('test') ? 'test' : 'function',
            name: funcName,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }

        // Match arrow functions
        const arrowMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
        if (arrowMatch) {
          const funcName = arrowMatch[1];
          const block = this.extractBracedBlock(lines, i);

          blocks.push({
            type: funcName.includes('test') ? 'test' : 'function',
            name: funcName,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }

        // Match class declarations
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          const className = classMatch[1];
          const block = this.extractBracedBlock(lines, i);

          blocks.push({
            type: 'class',
            name: className,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }
      }
    } else if (language === 'java' || language === 'cpp' || language === 'c') {
      // C-style languages: returnType functionName(...) {}, class ClassName {}
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match function/method declarations (simplified)
        const funcMatch = line.match(/(?:public|private|protected|static)?\s*\w+\s+(\w+)\s*\(/);
        if (funcMatch && !line.includes('if') && !line.includes('while')) {
          const funcName = funcMatch[1];
          const block = this.extractBracedBlock(lines, i);

          blocks.push({
            type: funcName.toLowerCase().includes('test') ? 'test' : 'function',
            name: funcName,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }

        // Match class declarations
        const classMatch = line.match(/class\s+(\w+)/);
        if (classMatch) {
          const className = classMatch[1];
          const block = this.extractBracedBlock(lines, i);

          blocks.push({
            type: 'class',
            name: className,
            line: i + 1,
            code: block,
            imports: this.extractImports(content, language)
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Extract indented block (Python)
   */
  extractIndentedBlock(lines, startLine, baseIndent) {
    const block = [lines[startLine]];

    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];

      // Empty lines are part of the block
      if (line.trim() === '') {
        block.push(line);
        continue;
      }

      // Check indentation
      const lineIndent = line.match(/^(\s*)/)[1].length;

      // If indent is greater than base, it's part of this block
      if (lineIndent > baseIndent) {
        block.push(line);
      } else {
        // Block ended
        break;
      }
    }

    return block.join('\n');
  }

  /**
   * Extract braced block (JavaScript, Java, C++)
   */
  extractBracedBlock(lines, startLine) {
    const block = [];
    let braceCount = 0;
    let foundFirstBrace = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      block.push(line);

      // Count braces
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundFirstBrace = true;
        } else if (char === '}') {
          braceCount--;
        }
      }

      // If we've found the first brace and count is back to 0, block is complete
      if (foundFirstBrace && braceCount === 0) {
        break;
      }
    }

    return block.join('\n');
  }

  /**
   * Extract import statements from code
   */
  extractImports(content, language) {
    const imports = [];

    if (language === 'python') {
      const importRegex = /^(?:from\s+[\w.]+\s+)?import\s+.+$/gm;
      const matches = content.match(importRegex) || [];
      imports.push(...matches);
    } else if (language === 'javascript' || language === 'typescript') {
      const importRegex = /^import\s+.+from\s+['""].+['""]/gm;
      const matches = content.match(importRegex) || [];
      imports.push(...matches);
    } else if (language === 'java' || language === 'cpp' || language === 'c') {
      const importRegex = /^(?:import|#include)\s+.+$/gm;
      const matches = content.match(importRegex) || [];
      imports.push(...matches);
    }

    return imports;
  }

  /**
   * Determine language from file extension
   */
  getLanguage(ext) {
    const languageMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c'
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Insert chunks into ChromaDB with embeddings
   */
  async insertChunks(chunks) {
    if (chunks.length === 0) return;

    const batchSize = 50; // Reduced from 100 to avoid 422 errors
    const batches = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        // Generate embeddings
        const texts = batch.map(c => c.text);
        const embeddings = await this.generateEmbeddings(texts);

        // Prepare data for ChromaDB
        const ids = batch.map(c => c.id);
        const documents = texts;
        // Clean metadata - remove any non-serializable values
        const metadatas = batch.map(c => {
          const cleanMeta = { ...c.metadata };
          // Ensure all values are primitive types
          Object.keys(cleanMeta).forEach(key => {
            if (Array.isArray(cleanMeta[key])) {
              cleanMeta[key] = cleanMeta[key].slice(0, 10); // Limit array size
            }
            if (typeof cleanMeta[key] === 'object' && cleanMeta[key] !== null) {
              cleanMeta[key] = JSON.stringify(cleanMeta[key]);
            }
          });
          return cleanMeta;
        });

        // Insert into collection
        await this.collection.add({
          ids: ids,
          documents: documents,
          embeddings: embeddings,
          metadatas: metadatas
        });

        console.log(`   Batch ${i + 1}/${batches.length} stored`);
      } catch (error) {
        console.error(`   [WARNING] Failed to insert batch ${i + 1}: ${error.message}`);
        // Continue with next batch
      }
    }
  }

  /**
   * Generate embeddings using local transformer model
   */
  async generateEmbeddings(texts) {
    const embeddings = [];

    for (const text of texts) {
      // Truncate if too long
      const truncated = text.substring(0, 512);

      // Generate embedding
      const output = await this.embedder(truncated, { pooling: 'mean', normalize: true });

      // Extract embedding array
      const embedding = Array.from(output.data);

      embeddings.push(embedding);
    }

    return embeddings;
  }

  /**
   * Clear the collection (useful for re-indexing)
   */
  async clearCollection() {
    try {
      await this.client.deleteCollection({ name: this.config.collectionName });
      this.collection = await this.client.createCollection({ name: this.config.collectionName });
      console.log(`[SUCCESS] Collection cleared: ${this.config.collectionName}`);
      return true;
    } catch (error) {
      console.error(`[FAILED] Failed to clear collection: ${error.message}`);
      return false;
    }
  }

  /**
   * Get collection stats
   */
  async getStats() {
    const count = await this.collection.count();
    return {
      collection: this.config.collectionName,
      total_chunks: count
    };
  }

  /**
   * Search for code using semantic similarity
   * @param {string} queryText - The search query
   * @param {Object} options - Search options
   * @returns {Array} Array of search results with code chunks and metadata
   */
  async searchCode(queryText, options = {}) {
    if (!this.collection) {
      throw new Error('Collection not initialized. Call initialize() first.');
    }

    const {
      nResults = 5,
      includeCode = true,
      filterType = null, // 'function', 'class', 'test', etc.
      filterLanguage = null, // 'python', 'javascript', etc.
      filterFile = null // Specific file pattern
    } = options;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbeddings([queryText]);

      // Build where clause for filtering
      const whereClause = {};
      if (filterType) whereClause.type = filterType;
      if (filterLanguage) whereClause.language = filterLanguage;
      if (filterFile) whereClause.file = { $contains: filterFile };

      // Query the collection
      const results = await this.collection.query({
        queryEmbeddings: queryEmbedding,
        nResults: nResults,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: includeCode ? ['documents', 'metadatas', 'distances'] : ['metadatas', 'distances']
      });

      // Format results
      const formattedResults = [];
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          formattedResults.push({
            id: results.ids[0][i],
            score: 1 - results.distances[0][i], // Convert distance to similarity score
            metadata: results.metadatas[0][i],
            code: includeCode && results.documents ? results.documents[0][i] : null
          });
        }
      }

      return formattedResults;
    } catch (error) {
      console.error('[RAG] Search error:', error.message);
      return [];
    }
  }

  /**
   * Find similar code to a given code snippet
   * @param {string} codeSnippet - The code to find similar matches for
   * @param {Object} options - Search options
   * @returns {Array} Array of similar code chunks
   */
  async findSimilarCode(codeSnippet, options = {}) {
    return this.searchCode(codeSnippet, {
      ...options,
      nResults: options.nResults || 10
    });
  }

  /**
   * Search for specific patterns like API endpoints, imports, etc.
   * @param {string} pattern - Pattern to search for (e.g., '@app.get', 'import')
   * @param {Object} options - Search options
   * @returns {Array} Array of matching code chunks
   */
  async searchPattern(pattern, options = {}) {
    // Construct a semantic query that describes the pattern
    const semanticQuery = `Find code that contains ${pattern} patterns`;

    return this.searchCode(semanticQuery, {
      ...options,
      nResults: options.nResults || 20
    });
  }
}
