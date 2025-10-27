/**
 * WebFetch Tool
 * Fetch content from a URL
 */

export class WebFetchTool {
  constructor() {
    this.name = 'WebFetch';
    this.description = 'Fetch content from a URL';
    this.inputSchema = {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to fetch'
        },
        prompt: {
          type: 'string',
          description: 'Optional prompt to extract specific information'
        }
      },
      required: ['url']
    };
  }

  async execute(input, context = {}) {
    const { url, prompt } = input;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ClaudeCodeLocal/1.0)'
        }
      });

      if (!response.ok) {
        return {
          type: 'error',
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/html')) {
        const html = await response.text();
        // Simple HTML to text conversion
        const text = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const truncated = text.length > 10000 ? text.substring(0, 10000) + '...' : text;

        return {
          type: 'text',
          text: `Content from ${url}:\n\n${truncated}`
        };
      } else if (contentType.includes('application/json')) {
        const json = await response.json();
        return {
          type: 'text',
          text: `JSON from ${url}:\n\n${JSON.stringify(json, null, 2)}`
        };
      } else {
        const text = await response.text();
        const truncated = text.length > 10000 ? text.substring(0, 10000) + '...' : text;
        return {
          type: 'text',
          text: truncated
        };
      }
    } catch (error) {
      return {
        type: 'error',
        error: `Failed to fetch URL: ${error.message}`
      };
    }
  }
}
