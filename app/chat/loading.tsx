import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
      <div className="w-75 shrink-0 border-r border-sidebar-border hidden md:flex flex-col">
          <div className="p-4 border-b border-sidebar-border">
             <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <div className="p-4 flex flex-col gap-2">
             <Skeleton className="h-12 w-full rounded-md bg-sidebar-accent/50" />
             <Skeleton className="h-12 w-full rounded-md bg-sidebar-accent/50" />
             <Skeleton className="h-12 w-full rounded-md bg-sidebar-accent/50" />
             <Skeleton className="h-12 w-full rounded-md bg-sidebar-accent/50" />
          </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-border bg-card px-4 py-3 flex items-center">
            <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <div className="flex-1 p-6 flex flex-col gap-6">
            <div className="flex gap-4">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-16 w-[80%] rounded-lg" />
            </div>
            <div className="flex gap-4 flex-row-reverse">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-12 w-[60%] rounded-lg" />
            </div>
        </div>
        <div className="h-14 border-t border-border bg-card px-4 py-2 flex items-center gap-2">
             <Skeleton className="h-10 flex-1 rounded-md" />
             <Skeleton className="size-10 rounded-md shrink-0" />
        </div>
      </div>
    </div>
  );
}
