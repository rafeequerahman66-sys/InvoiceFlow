import { cn } from "@/lib/cn";

const fieldBase =
  "rounded-[10px] border border-[var(--border-2)] bg-[var(--card-inset)] px-3 py-2 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] transition-colors focus:border-[var(--accent)]";

export const fieldClasses = (className?: string) => cn(fieldBase, className);

export const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={cn(fieldBase, className)} {...props} />
);

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(fieldBase, className)} {...props} />
);

export const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(fieldBase, className)} {...props} />
);

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1.5 block text-[12px] font-medium text-[var(--text-soft)]", className)} {...props} />
);
