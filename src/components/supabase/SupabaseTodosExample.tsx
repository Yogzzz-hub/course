import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export interface TodoItem {
  id: string | number;
  name?: string;
  title?: string;
  is_complete?: boolean;
  created_at?: string;
}

/**
 * Example component demonstrating Supabase querying in React 19 + Vite.
 * Reads from your Supabase instance using the configured browser client.
 */
export function SupabaseTodosExample() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchTodos() {
      try {
        setLoading(true);
        const { data, error: queryError } = await supabase
          .from('todos')
          .select('*')
          .limit(20);

        if (queryError) {
          // If the 'todos' table does not exist yet in Supabase, provide guidance
          if (queryError.code === '42P01') {
            setError('The "todos" table does not exist in Supabase yet. You can create it in the Supabase SQL Editor.');
          } else {
            setError(queryError.message);
          }
          return;
        }

        if (isMounted) {
          setTodos((data as TodoItem[]) || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to query Supabase.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTodos();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-neutral-400">Loading todos from Supabase...</div>;
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm">
        <p className="font-semibold">Supabase Notice:</p>
        <p>{error}</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return <div className="p-4 text-sm text-neutral-400">No todos found in Supabase.</div>;
  }

  return (
    <ul className="space-y-2 p-4">
      {todos.map((todo) => (
        <li key={todo.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm">
          {todo.name || todo.title || `Item #${todo.id}`}
        </li>
      ))}
    </ul>
  );
}
