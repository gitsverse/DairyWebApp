import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  overflowVisible?: boolean;
}

const Card: React.FC<CardProps> = ({ title, children, className, overflowVisible = false }) => {
  return (
    <div
      className={`group relative bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-slate-200 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-primary/30 hover:-translate-y-1 ${
        overflowVisible ? "overflow-visible" : "overflow-hidden"
      } ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 tracking-wide">
          {title}
        </h3>
        <div className="w-8 h-1 bg-gradient-to-r from-primary to-accent rounded-full opacity-70 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="relative p-0 sm:p-2">
        <div className={`p-4 sm:p-3 ${overflowVisible ? "overflow-visible" : "overflow-x-auto"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Card;
