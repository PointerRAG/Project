import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-dvh w-full overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-6 md:p-10 py-12">
        <div className="w-full max-w-sm flex flex-col gap-6">
          <Skeleton className="h-115 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
