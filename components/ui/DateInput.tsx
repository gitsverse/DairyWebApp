import React, { useState, useEffect } from "react";
import { parse, format, isValid } from "date-fns";

interface DateInputProps {
  label: string;
  id: string;
  value: string; // YYYY-MM-DD internally
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  id,
  value,
  onChange,
  required,
  disabled,
  className = "",
}) => {
  const [typedValue, setTypedValue] = useState("");

  // Sync display with value changes
  useEffect(() => {
    if (value) {
      try {
        const parsed = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(parsed)) {
          setTypedValue(format(parsed, "dd/MM/yyyy"));
          return;
        }
      } catch {}
    }
    setTypedValue("");
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedValue(val);

    // If the typed value matches the DD/MM/YYYY pattern, parse and submit it
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      try {
        const parsed = parse(val, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) {
          onChange(format(parsed, "yyyy-MM-dd"));
        }
      } catch {}
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // YYYY-MM-DD
    if (val) {
      onChange(val);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-700 mb-1"
      >
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          value={typedValue}
          onChange={handleTextChange}
          placeholder="DD/MM/YYYY"
          disabled={disabled}
          required={required}
          className="flex h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
        />
        <div className="absolute right-0 top-0 w-12 h-11 flex items-center justify-center border-l border-slate-200 text-slate-400 hover:text-slate-600 transition-colors pointer-events-none">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        {/* Transparent native date picker overlaying ONLY the calendar icon button on the right */}
        <input
          type="date"
          value={value}
          onChange={handleDateChange}
          onClick={(e) => {
            try {
              // @ts-ignore
              e.currentTarget.showPicker();
            } catch (err) {}
          }}
          disabled={disabled}
          className="absolute right-0 top-0 w-12 h-11 opacity-0 cursor-pointer"
          style={{ colorScheme: "light" }}
        />
      </div>
    </div>
  );
};

export default DateInput;
