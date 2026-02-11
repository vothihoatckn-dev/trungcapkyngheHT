
import React from 'react';
import { Bell, Search, Menu, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { isOnline, isSyncing, lastSynced, syncNow } = useSync();

  const formatTime = (date: Date | null) => {
    if (!date) return 'Chưa đồng bộ';
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh' 
    });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 shadow-sm lg:shadow-none no-print">
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden mr-2 focus:outline-none focus:ring-2 focus:ring-slate-200"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 truncate">
          {user?.role === 'ADMIN' ? 'Cổng thông tin quản trị' : 'Không gian làm việc giáo viên'}
        </h1>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Sync Status Indicator */}
        <div className="hidden md:flex items-center bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
           <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isSyncing ? 'bg-blue-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
           <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-700">
                {isSyncing ? 'Đang đồng bộ...' : isOnline ? 'Đã kết nối' : 'Mất kết nối'}
              </span>
              {!isSyncing && (
                  <span className="text-[10px] text-slate-400 leading-none">
                    Cập nhật: {formatTime(lastSynced)}
                  </span>
              )}
           </div>
           <button 
             onClick={() => syncNow()} 
             disabled={isSyncing}
             className={`ml-3 p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-all ${isSyncing ? 'animate-spin text-blue-500' : ''}`}
             title="Đồng bộ ngay"
           >
             <RefreshCw className="w-3.5 h-3.5" />
           </button>
        </div>

        <div className="hidden md:flex relative">
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-48 lg:w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        <button className="md:hidden p-2 rounded-full text-slate-500 hover:bg-slate-100">
          <Search className="w-5 h-5" />
        </button>

        <button className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
