import { Search, User } from 'lucide-react';

interface HeaderProps {
  onFilterClick: () => void;
}

export function Header({ onFilterClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-3 py-3">
        {/* Single Row */}
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-teal-600 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">B</span>
            </div>
            <span className="text-teal-800 text-sm font-[Abhaya_Libre_ExtraBold]">BizYou</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Filter Button with Icon + Text */}
            <button
              onClick={onFilterClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors active:bg-teal-100"
              aria-label="絞り込み"
            >
              <Search className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-teal-700">絞り込み</span>
            </button>
            
            {/* Profile Icon */}
            <button
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200"
              aria-label="マイプロフィール"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}