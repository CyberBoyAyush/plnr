interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

class TodoManager {
  private todos: Map<string, Todo[]> = new Map();

  createTodos(sessionId: string, todos: Todo[]): void {
    this.todos.set(sessionId, todos);
  }

  updateTodo(sessionId: string, todoId: string, status: Todo['status']): boolean {
    const sessionTodos = this.todos.get(sessionId);
    if (!sessionTodos) return false;

    const todo = sessionTodos.find(t => t.id === todoId);
    if (!todo) return false;

    todo.status = status;
    return true;
  }

  getTodos(sessionId: string): Todo[] {
    return this.todos.get(sessionId) || [];
  }

  clearTodos(sessionId: string): void {
    this.todos.delete(sessionId);
  }
}

export const todoManager = new TodoManager();
export type { Todo };
