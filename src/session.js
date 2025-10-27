/**
 * Session Management
 * Handles session creation, storage, and resumption
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from './config.js';

export class Session {
  constructor(sessionId = null) {
    this.id = sessionId || randomUUID();
    this.startTime = new Date();
    this.messages = [];
    this.usage = {
      inputTokens: 0,
      outputTokens: 0,
      computeTime: 0, // milliseconds
      requestCount: 0
    };
    this.metadata = {};
  }

  /**
   * Add a message to the session
   */
  addMessage(message) {
    this.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Update usage statistics
   */
  updateUsage(usage) {
    this.usage.inputTokens += usage.input_tokens || 0;
    this.usage.outputTokens += usage.output_tokens || 0;
    this.usage.requestCount += 1;

    if (usage.compute_time) {
      this.usage.computeTime += usage.compute_time;
    }
  }

  /**
   * Save session to disk
   */
  save() {
    const sessionPath = config.getSessionPath(this.id);
    const data = {
      id: this.id,
      startTime: this.startTime,
      endTime: new Date(),
      messages: this.messages,
      usage: this.usage,
      metadata: this.metadata
    };

    try {
      writeFileSync(sessionPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session:', error.message);
    }
  }

  /**
   * Load session from disk
   */
  static load(sessionId) {
    const sessionPath = config.getSessionPath(sessionId);

    if (!existsSync(sessionPath)) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      const data = JSON.parse(readFileSync(sessionPath, 'utf-8'));
      const session = new Session(data.id);
      session.startTime = new Date(data.startTime);
      session.messages = data.messages || [];
      session.usage = data.usage || session.usage;
      session.metadata = data.metadata || {};
      return session;
    } catch (error) {
      throw new Error(`Failed to load session: ${error.message}`);
    }
  }

  /**
   * Get session messages in API format
   */
  getMessages() {
    return this.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Get session summary
   */
  getSummary() {
    return {
      id: this.id,
      startTime: this.startTime,
      messageCount: this.messages.length,
      usage: this.usage
    };
  }
}
