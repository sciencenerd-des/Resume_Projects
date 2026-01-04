/**
 * DocumentCardSkeleton Component
 * @version 1.0.0
 * Loading skeleton for document cards
 */

import React from 'react';

export function DocumentCardSkeleton() {
  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 animate-pulse">
      <div className="flex items-start gap-4">
        {/* Icon skeleton */}
        <div className="w-10 h-10 rounded-lg bg-gray-200" />

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />

          {/* Tags skeleton */}
          <div className="flex gap-2">
            <div className="h-5 bg-gray-100 rounded-full w-16" />
            <div className="h-5 bg-gray-100 rounded-full w-20" />
          </div>
        </div>

        {/* Status skeleton */}
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-4 bg-gray-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function DocumentCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <DocumentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default DocumentCardSkeleton;
