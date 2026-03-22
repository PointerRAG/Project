import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserChats } from "@/lib/data/chat";
import { redirect } from "next/navigation";

// Sidebar width configuration matching the original ChatInterface
const SIDEBAR_WIDTH = "300px";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch chat list summary for sidebar
  // This layout is a Server Component, so this only runs on the server!
  const initialChats = await getUserChats(session.user.id);

  return (
    <SidebarProvider
      defaultOpen
      style={
        {
          "--sidebar-width": SIDEBAR_WIDTH,
        } as React.CSSProperties
      }
    >
      <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
        <div className="relative h-full w-(--sidebar-width) shrink-0">
          <ChatSidebar
            chats={initialChats}
            currentUser={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }}
          />
        </div>
        <SidebarInset className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
