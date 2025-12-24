/**
 * MenuItem Component
 * Menu item button for settings section
 */

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group active:scale-[0.99]"
  >
    <div className="flex items-center gap-3 text-slate-500 group-hover:text-blue-600 transition-colors">
      {icon}
      <span className="text-sm font-medium text-slate-800 group-hover:text-slate-900">{label}</span>
    </div>
    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
  </button>
);
