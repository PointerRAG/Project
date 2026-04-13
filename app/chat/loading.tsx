import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <Skeleton className="h-6 w-56 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 md:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-4">
            <div className="flex flex-row-reverse gap-4">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-12 w-[60%] rounded-lg" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-16 w-[80%] rounded-lg" />
            </div>
            <div className="flex flex-row-reverse gap-4">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-12 w-[60%] rounded-lg" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="size-8 shrink-0 rounded-sm" />
              <Skeleton className="h-16 w-[80%] rounded-lg" />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 bg-background px-2 pb-3 pt-2 backdrop-blur md:px-4">
          <Skeleton className="mx-auto w-full max-w-3xl min-h-25 gap-0 rounded-4xl border-0 bg-card py-3 shadow-xl"></Skeleton>

          <div className="px-4 pt-3 md:px-6">
            <Skeleton className="mx-auto h-3 w-64 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
