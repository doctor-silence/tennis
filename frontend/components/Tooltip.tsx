
import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  description?: string;
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, description, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={`absolute bottom-full mb-3 left-0 z-50 shadow-xl animate-fade-in-up-fast ${description ? 'w-52' : 'w-max'} bg-slate-900 text-white rounded-xl px-3 py-2.5`}>
          <p className="font-semibold text-xs leading-tight">{text}</p>
          {description && (
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{description}</p>
          )}
          {/* стрелка вниз */}
          <div className="absolute top-full left-5 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
