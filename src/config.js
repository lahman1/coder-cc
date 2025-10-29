/**
 * Configuration Management
 * Handles loading and saving configuration from local project directory
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Config {
  constructor() {
    // Use project root directory (parent of src/)
    this.configDir = join(__dirname, '..');
    this.configFile = join(this.configDir, 'config.json');
    this.sessionsDir = join(this.configDir, '.sessions');
    this.debugDir = join(this.configDir, '.debug');

    this.ensureConfigDir();
    this.config = this.load();
  }

  /**
   * Ensure configuration directory exists
   */
  ensureConfigDir() {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
    if (!existsSync(this.debugDir)) {
      mkdirSync(this.debugDir, { recursive: true });
    }
  }

  /**
   * Load configuration from file
   */
  load() {
    if (!existsSync(this.configFile)) {
      return this.getDefaults();
    }

    try {
      const data = readFileSync(this.configFile, 'utf-8');
      const config = JSON.parse(data);
      return { ...this.getDefaults(), ...config };
    } catch (error) {
      console.error('Failed to load config, using defaults:', error.message);
      return this.getDefaults();
    }
  }

  /**
   * Save configuration to file
   */
  save() {
    try {
      writeFileSync(
        this.configFile,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save config:', error.message);
    }
  }

  /**
   * Get default configuration
   */
  getDefaults() {
    return {
      // Ollama settings
      ollamaEndpoint: 'http://localhost:11434',
      ollamaModel: 'qwen3:32b',

      // Model settings
      temperature: 0.7,
      maxTokens: 32000,

      // Tool settings
      bashMaxOutputLength: 30000,

      // Debug settings
      debug: false,
      debugTools: false,  // Set to true to see raw Ollama responses

      // Session settings
      enableSessionResume: true
    };
  }

  /**
   * Get a configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set a configuration value
   */
  set(key, value) {
    const keys = key.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[keys[keys.length - 1]] = value;
    this.save();
  }

  /**
   * Get the sessions directory path
   */
  getSessionsDir() {
    return this.sessionsDir;
  }

  /**
   * Get the debug directory path
   */
  getDebugDir() {
    return this.debugDir;
  }

  /**
   * Get session file path
   */
  getSessionPath(sessionId) {
    return join(this.sessionsDir, `${sessionId}.json`);
  }

  /**
   * Get debug log path
   */
  getDebugPath(sessionId) {
    return join(this.debugDir, `${sessionId}.txt`);
  }
}

// Export singleton instance
export const config = new Config();
