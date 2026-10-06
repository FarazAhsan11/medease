type CountBadgeProps = {
  count: number;
};

export function CountBadge({ count }: CountBadgeProps) {
  return (
    <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
      {count}
    </span>
  );
}
