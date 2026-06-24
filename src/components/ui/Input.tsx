import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx('rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 transition placeholder:text-slate-400 focus:ring-4', className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx('rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 transition focus:ring-4', className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx('min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-slate-300 transition placeholder:text-slate-400 focus:ring-4', className)}
      {...props}
    />
  );
}
