export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Document {
  id: string;
  name: string;
  filename: string;
  size: number;
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string | null;
  timestamp: string;
  documentCount: number;
  documents: Document[];
  messages: Message[];
}
