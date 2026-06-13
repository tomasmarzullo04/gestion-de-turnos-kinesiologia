import {
  ListSkeleton,
  PageHeaderSkeleton,
  StatsSkeleton,
} from "@/components/shared/loading-skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}
