type AuthSubmitButtonProps = {
  children: string;
};

export function AuthSubmitButton({ children }: AuthSubmitButtonProps) {
  return (
    <button
      type="button"
      className="w-full rounded-[5px] bg-brand p-2.5 text-[13.33px] text-white max-sm:text-[0.9em]"
    >
      {children}
    </button>
  );
}
