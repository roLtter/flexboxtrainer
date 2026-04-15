interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl border border-rose-400/20 bg-[#1a1014]/95 text-rose-100 shadow-xl backdrop-blur-sm">
      <span className="text-sm">{message}</span>
    </div>
  );
}
