import {
  DnaIcon,
  FlaskConicalIcon,
  MicroscopeIcon,
  TestTubeDiagonalIcon,
} from "lucide-react";

const icons = [FlaskConicalIcon, MicroscopeIcon, TestTubeDiagonalIcon, DnaIcon];

export function AuthPattern() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 grid grid-cols-4 place-items-center gap-10 p-10 text-white/15"
    >
      {Array.from({ length: 16 }, (_, index) => {
        const Icon = icons[index % icons.length];

        return (
          <Icon
            key={index}
            className={index % 3 === 0 ? "size-16" : "size-10"}
            strokeWidth={1.25}
          />
        );
      })}
    </div>
  );
}
