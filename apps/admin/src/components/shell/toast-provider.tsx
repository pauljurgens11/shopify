'use client';

/**
 * Toasts (PARITY.md: bottom-center, dark, terse past-tense). Owner: WS-A.
 *
 *   const toast = useToast();
 *   toast.show('Product saved');
 *   toast.error('Could not save product');
 *
 * Must live inside a Polaris `Frame` — `Toast` renders through Frame's portal.
 */
import { Toast } from '@shopify/polaris';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastMessage = { id: number; content: string; error?: boolean };

type ToastApi = {
  /** "Product saved" — past tense, no exclamation mark (PARITY.md). */
  show: (content: string) => void;
  error: (content: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside the admin Frame.');
  return api;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((m) => m.id !== id));
  }, []);

  // Monotonic id rather than an array index: dismissing the first of two toasts
  // would otherwise renumber the second and unmount the wrong one. In a ref, not
  // a useMemo closure — React may recompute a memo at any time.
  const nextId = useRef(0);

  const api = useMemo<ToastApi>(() => {
    const push = (content: string, error?: boolean) => {
      nextId.current += 1;
      const id = nextId.current;
      setMessages((current) => [...current, { id, content, error }]);
    };
    return { show: (content) => push(content), error: (content) => push(content, true) };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {messages.map((message) => (
        <Toast
          key={message.id}
          content={message.content}
          error={message.error}
          onDismiss={() => dismiss(message.id)}
        />
      ))}
    </ToastContext.Provider>
  );
}
