import Link from "next/link";
import { Card, EmptyState } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="px-5 py-6 sm:px-8">
      <Card>
        <EmptyState
          title="Page not found"
          description="The page you're looking for doesn't exist or may have been moved."
          action={
            <Link
              href="/"
              className="rounded-md bg-accent px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Back to dashboard
            </Link>
          }
        />
      </Card>
    </div>
  );
}
