import { Filter } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
}

/**
 * Reusable empty state component displayed when filters return no data
 */
export function EmptyState({ 
  title = "No data matches your filters",
  description = "Try adjusting your filter selections to see more results.",
  onReset 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border-3 border-dashed border-muted-foreground/30 rounded-lg bg-muted/10">
      <Filter className="size-12 text-muted-foreground mb-4" aria-hidden="true" />
      <h3 className="font-bold text-lg uppercase tracking-wide">{title}</h3>
      <p className="text-muted-foreground mt-1 text-sm max-w-md">{description}</p>
      {onReset && (
        <button 
          onClick={onReset} 
          className="mt-4 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-foreground bg-background hover:bg-muted transition-colors"
        >
          Reset all filters
        </button>
      )}
    </div>
  );
}
