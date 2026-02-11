
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Settings, 
  Calendar, 
  GraduationCap, 
  FileText,
  LogOut,
  School,
  X,
  ClipboardList,
  AlertTriangle,
  FileBarChart,
  BarChart2, // Changed from GitMerge
  ShieldCheck,
  Building2,
  Library,
  PieChart,
  ClipboardCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: '/admin' },
    { icon: BookOpen, label: 'Lớp Nghề', path: '/admin/classes' },
    { icon: Library, label: 'Lớp Văn hóa', path: '/admin/academic-classes' },
    { icon: Building2, label: 'Khoa & Nghề', path: '/admin/departments' },
    { icon: Users, label: 'Giáo viên', path: '/admin/teachers' },
    { icon: GraduationCap, label: 'Học sinh', path: '/admin/students' },
    { icon: ShieldCheck, label: 'Tài khoản', path: '/admin/accounts' },
    { icon: FileBarChart, label: 'Báo cáo', path: '/admin/reports' },
    { icon: ClipboardCheck, label: 'Nề nếp', path: '/admin/behavior' },
    { icon: PieChart, label: 'Thống kê', path: '/admin/statistics' },
    { icon: BarChart2, label: 'Báo cáo & Thống kê VH', path: '/admin/integration' },
    { icon: Settings, label: 'Cấu hình', path: '/admin/settings' },
  ];

  const teacherLinks = [
    { icon: LayoutDashboard, label: 'Tổng quan', path: '/user' },
    { icon: BookOpen, label: 'Quản lý lớp', path: '/user/classes' },
    { icon: ClipboardList, label: 'Điểm danh', path: '/user/attendance-select' }, // Redirects via classes usually
    { icon: AlertTriangle, label: 'Báo cáo nề nếp', path: '/user/reports' },
  ];

  const links = user?.role === UserRole.ADMIN ? adminLinks : teacherLinks;

  const handleLinkClick = () => {
    // Only close on mobile (screen width < 1024px)
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isLinkActive = (path: string) => {
    if (path === '/admin' || path === '/user') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className={`
        h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800 shadow-xl z-30 
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0
        no-print
      `}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center">
            <School className="w-8 h-8 text-primary-500 mr-3" />
            <span className="text-lg font-bold tracking-tight">TCKN Hà Tĩnh</span>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
          <nav className="space-y-1 px-3">
            {links.map((item) => {
              const isActive = isLinkActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center mb-4 px-2">
            <img 
              src={user?.avatar} 
              alt="User" 
              className="w-10 h-10 rounded-full border-2 border-slate-700" 
            />
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
