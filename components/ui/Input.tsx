import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const Input: React.FC<InputProps> = ({ label, id, className, ...props }) => {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-700 mb-1"
      >
        {label}
        {props.required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <input
        id={id}
        className={`flex h-11 w-full rounded-2xl border border-slate-200/40 bg-slate-100/60 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
