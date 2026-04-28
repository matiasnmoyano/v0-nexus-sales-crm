-- Per-lead chat history. The PK is the UIMessage id from the AI SDK so we can
-- safely upsert the full conversation after every streaming turn without
-- creating duplicates. `parts` stores the full UIMessage parts array (text +
-- tool calls + tool results) so the chat re-renders identically on reload.
create table if not exists chat_messages (
  id text primary key,
  lead_id uuid not null references leads(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  parts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_lead_created
  on chat_messages(lead_id, created_at);
