import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getChatById } from "@/lib/data/chat";
import { redirect } from "next/navigation";
import { ChatArea } from "@/components/chat-area";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { chatId } = await params;
  const chat = await getChatById(chatId, session.user.id);

  if (!chat) {
    redirect("/chat");
  }

  return (
    <ChatArea
      currentChat={chat}
      messages={chat.messages}
      currentUser={{
        name: session.user.name,
        image: session.user.image,
      }}
    />
  );
}
