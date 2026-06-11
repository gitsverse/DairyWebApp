"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
}

interface DropdownPos {
  top: number;
  left: number;
  width: number;
}

const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required,
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setIsOpen(false);
      setSearchTerm("");
    };
    const handleScroll = () => {
      updatePosition();
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label ||
    placeholder ||
    "Select...";

  if (searchable) {
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          {label}
          {required ? <span className="text-destructive ml-1">*</span> : null}
        </label>

        {/* Trigger */}
        <div
          ref={triggerRef}
          onClick={openDropdown}
          className={`flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-all select-none ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-slate-50"
              : "cursor-pointer hover:border-primary/50"
          }`}
        >
          <span className={`truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {selectedLabel}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>

        {/* Dropdown portal — renders at document body level */}
        {isOpen &&
          dropdownPos &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 99999,
              }}
              className="bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 flex flex-col overflow-hidden"
            >
              <div className="p-2 border-b border-slate-100 shrink-0">
                <input
                  type="text"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary/50"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="overflow-y-auto overflow-x-hidden p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-500 text-center">
                    No results found
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <div
                      key={opt.value}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer rounded-lg hover:bg-slate-100 truncate ${
                        value === opt.value
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-slate-700"
                      }`}
                    >
                      {opt.label}
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body
          )}
      </div>
    );
  }

  // Non-searchable: standard HTML select
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">
        {label}
        {required ? <span className="text-destructive ml-1">*</span> : null}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
