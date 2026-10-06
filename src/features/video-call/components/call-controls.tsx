import { cn } from "@/lib/utils";

const controls = [
  { label: "Mute", danger: false },
  { label: "Turn Video Off", danger: false },
  { label: "End Call", danger: true },
  { label: "Refresh Video", danger: false },
];

export function CallControls() {
  return (
    <div className="flex justify-center gap-5 border-t border-line-soft bg-white p-5">
      {controls.map((control) => (
        <button
          key={control.label}
          type="button"
          className={cn(
            "rounded-full px-6 py-3 font-semibold transition-all duration-200",
            control.danger
              ? "bg-danger-call text-white hover:bg-danger-call-hover"
              : "bg-control text-ink-body hover:bg-line-soft",
          )}
        >
          {control.label}
        </button>
      ))}
    </div>
  );
}
