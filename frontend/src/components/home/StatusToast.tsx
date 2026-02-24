type StatusToastProps = {
  status: string;
};

export const StatusToast = ({ status }: StatusToastProps) => {
  if (!status) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-3 rounded-lg shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <span className="text-sm font-medium">{status}</span>
    </div>
  );
};
