import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { friendlyError } from './errors';
import { haptic } from './haptics';
import { createPost, uploadImage } from './posts';

/** A post that is still uploading (or failed), shown at the top of the feed right away. */
export type PendingPost = {
  id: string;
  uri: string | null;
  mimeType?: string | null;
  caption: string;
  status: 'uploading' | 'failed';
  error?: string;
};

type NewPost = { uri: string | null; mimeType?: string | null; caption: string };

type PendingState = {
  pending: PendingPost[];
  /** Goes up every time a post finishes uploading, so lists know to refresh. */
  version: number;
  addPost: (post: NewPost) => void;
  retry: (id: string) => void;
  discard: (id: string) => void;
};

const PendingContext = createContext<PendingState | null>(null);

export function PendingPostsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [pending, setPending] = useState<PendingPost[]>([]);
  const [version, setVersion] = useState(0);
  const counter = useRef(0);

  const update = (id: string, patch: Partial<PendingPost>) =>
    setPending((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const run = useCallback(
    async (post: PendingPost) => {
      if (!userId) return;
      try {
        const path = post.uri ? await uploadImage(userId, post.uri, post.mimeType) : null;
        await createPost(userId, post.caption, path);
        setPending((cur) => cur.filter((p) => p.id !== post.id));
        setVersion((v) => v + 1);
        haptic.success();
      } catch (e) {
        update(post.id, { status: 'failed', error: friendlyError(e) });
        haptic.error();
      }
    },
    [userId],
  );

  const addPost = useCallback(
    (input: NewPost) => {
      const post: PendingPost = { ...input, id: `pending-${++counter.current}`, status: 'uploading' };
      setPending((cur) => [post, ...cur]);
      run(post);
    },
    [run],
  );

  const retry = useCallback(
    (id: string) => {
      const post = pending.find((p) => p.id === id);
      if (!post) return;
      update(id, { status: 'uploading', error: undefined });
      run(post);
    },
    [pending, run],
  );

  const discard = useCallback((id: string) => setPending((cur) => cur.filter((p) => p.id !== id)), []);

  return (
    <PendingContext.Provider value={{ pending, version, addPost, retry, discard }}>{children}</PendingContext.Provider>
  );
}

export function usePendingPosts() {
  const ctx = useContext(PendingContext);
  if (!ctx) throw new Error('usePendingPosts must be used inside PendingPostsProvider');
  return ctx;
}
