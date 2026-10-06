import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  src?: string;
  className?: string;
};

function getInitials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserAvatar({ name, src, className }: UserAvatarProps) {
  return (
    <Avatar className={cn("size-10", className)}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback className="bg-secondary font-semibold text-secondary-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
