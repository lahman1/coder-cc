/**
 * TodoWrite Tool
 * Manage task list
 */

export class TodoWriteTool {
  constructor() {
    this.name = 'TodoWrite';
    this.description = 'Create and manage a task checklist. Use this at the START of complex multi-step tasks to plan all steps you need to complete. Break tasks into small, actionable items and mark them as you finish.';
    this.inputSchema = {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: {
                type: 'string'
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed']
              },
              activeForm: {
                type: 'string'
              }
            },
            required: ['content', 'status', 'activeForm']
          }
        }
      },
      required: ['todos']
    };
    this.todos = [];
  }

  async execute(input, context = {}) {
    const { todos } = input;
    this.todos = todos;

    // Format todo list for display
    const formatted = todos.map((todo, idx) => {
      const status = {
        'pending': '○',
        'in_progress': '◐',
        'completed': '●'
      }[todo.status] || '?';

      return `${status} ${todo.content}`;
    }).join('\n');

    return {
      type: 'text',
      text: `Todos updated:\n${formatted}`
    };
  }
}
