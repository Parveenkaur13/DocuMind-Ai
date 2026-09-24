/*
# Create DocuMind core workspace data

1. New tables
- `documents`: one uploaded knowledge source per authenticated user, including its name, type, size, processing status, summary, and extracted text.
- `document_chunks`: searchable text passages belonging to a document, with a lightweight metadata/embedding payload for future semantic retrieval.
- `conversations`: named chat sessions owned by a user.
- `messages`: user and assistant turns, including citations returned with an answer.

2. Security
- Row Level Security is enabled on every table.
- Authenticated users can only read and change rows that belong to them.
- Child records are protected through ownership checks against their parent rows.

3. Important notes
- Ownership defaults to `auth.uid()` so the browser never needs to supply a user id.
- No existing data is modified or removed.
*/

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'error')),
  extracted_text text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_user_created_idx ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chunks_document_idx ON public.document_chunks(document_id, chunk_index);
CREATE INDEX IF NOT EXISTS conversations_user_updated_idx ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx ON public.messages(conversation_id, created_at);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own documents" ON public.documents;
CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own chunks" ON public.document_chunks;
CREATE POLICY "Users can view own chunks" ON public.document_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own chunks" ON public.document_chunks;
CREATE POLICY "Users can create own chunks" ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.documents WHERE documents.id = document_chunks.document_id AND documents.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own chunks" ON public.document_chunks;
CREATE POLICY "Users can update own chunks" ON public.document_chunks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own chunks" ON public.document_chunks;
CREATE POLICY "Users can delete own chunks" ON public.document_chunks FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can create own messages" ON public.messages;
CREATE POLICY "Users can create own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = user_id);
