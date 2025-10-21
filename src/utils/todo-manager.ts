interface Todo {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

class TodoManager {
  private todos: Map<string, Todo[]> = new Map();

  createTodos(sessionId: string, todos: Todo[]): void {
    // Store a defensive copy to prevent external mutation
    this.todos.set(sessionId, [...todos]);
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
    // Return a defensive copy to prevent external mutation
    const sessionTodos = this.todos.get(sessionId);
    return sessionTodos ? [...sessionTodos] : [];
  }

  clearTodos(sessionId: string): void {
    this.todos.delete(sessionId);
  }
}

export const todoManager = new TodoManager();
export type { Todo };
