CREATE TABLE "Chat" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL DEFAULT 'New Conversation',

  -- Unique ID used to name ChromaDB collection
  "chromaCollectionId" UUID NOT NULL DEFAULT gen_random_uuid(),

  "userId" TEXT NOT NULL,

  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "Chat_chromaCollectionId_unique"
    UNIQUE ("chromaCollectionId"),

  CONSTRAINT "Chat_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "user"(id)
    ON DELETE CASCADE
);
-- Fetch all chats for a user
CREATE INDEX "Chat_userId_idx"
  ON "Chat" ("userId");

-- Sort / paginate chats
CREATE INDEX "Chat_createdAt_idx"
  ON "Chat" ("createdAt");


CREATE TABLE "Message" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  "chatId" TEXT NOT NULL,
  content TEXT NOT NULL,

  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT "Message_chatId_fkey"
    FOREIGN KEY ("chatId")
    REFERENCES "chat"(id)
    ON DELETE CASCADE
);



-- Load messages for a chat
CREATE INDEX "Message_chatId_idx"
  ON "Message" ("chatId");

-- Fast ordered message loading (pagination / streaming)
CREATE INDEX "Message_chatId_createdAt_idx"
  ON "Message" ("chatId", "createdAt");



