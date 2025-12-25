
import React, { useState } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactElement;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute bottom-full mb-2 w-max bg-slate-800 text-white text-xs rounded-md px-3 py-1.5 z-10 shadow-lg animate-fade-in-up-fast transition-all duration-75">
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
