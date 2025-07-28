import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface RidsLogoProps {
  className?: string;
}

export const RidsLogo: React.FC<RidsLogoProps> = ({ 
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Simple icon with red color */}
      <ShieldAlert className="w-8 h-8 text-red-600" strokeWidth={2} />
      
      {/* Clean text layout */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          RIDS
        </h1>
        <p className="text-[9px] font-medium text-gray-500 uppercase tracking-wider -mt-0.5">
          Risk Detection System
        </p>
      </div>
    </div>
  );
}; 