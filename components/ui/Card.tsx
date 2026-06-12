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
      className={`group relative bg-white rounded-[30px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/60 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] ${
        overflowVisible ? "overflow-visible" : "overflow-hidden"
      } ${className}`}
    >
      <div className="relative p-5 pb-2 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">
          {title}
        </h3>
      </div>
      <div className="relative p-0">
        <div className={`px-5 pb-5 ${overflowVisible ? "overflow-visible" : "overflow-x-auto"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Card;
