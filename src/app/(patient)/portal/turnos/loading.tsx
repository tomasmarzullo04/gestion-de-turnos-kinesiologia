import { ListSkeleton, PageHeaderSkeleton } from "@/components/shared/loading-skeletons";

export default function TurnosLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="h-10 w-32 animate-shimmer rounded-md bg-muted" />
          <div className="h-10 w-32 animate-shimmer rounded-md bg-muted" />
        </div>
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
