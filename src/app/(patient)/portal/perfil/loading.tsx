import { PageHeaderSkeleton } from "@/components/shared/loading-skeletons";

export default function PerfilLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="h-96 w-full animate-shimmer rounded-xl bg-muted" />
    </div>
  );
}
