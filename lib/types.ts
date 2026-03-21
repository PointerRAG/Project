export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  title: string;
  lastMessage: string | null;
  timestamp: string;
  documentCount: number;
  messages: Message[];
}
