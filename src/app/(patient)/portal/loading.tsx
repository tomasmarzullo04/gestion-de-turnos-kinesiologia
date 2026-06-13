import {
  ListSkeleton,
  PageHeaderSkeleton,
} from "@/components/shared/loading-skeletons";

export default function PortalLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <ListSkeleton rows={3} />
    </div>
  );
}
