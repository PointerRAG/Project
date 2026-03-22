import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserChats } from "@/lib/data/chat";
import { redirect } from "next/navigation";
import { ChatArea } from "@/components/chat-area";

export default async function ChatIndexPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const chats = await getUserChats(session.user.id);
  if (chats.length > 0) {
    redirect(`/chat/${chats[0].id}`);
  }

  return (
    <ChatArea
      currentChat={undefined}
      messages={[]}
      currentUser={{
        name: session.user.name,
        image: session.user.image,
      }}
    />
  );
}
