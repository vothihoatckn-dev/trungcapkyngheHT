
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, User, Lock, Eye, EyeOff, ArrowRight, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext'; // Chỉ dùng để check online status
import { api } from '../services/api'; // Import api service trực tiếp
import { UserRole } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isOnline } = useSync(); // Chỉ lấy trạng thái mạng
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        // Gọi API xác thực lên Google Apps Script
        const result = await api.authenticate(username.trim(), password.trim());

        if (result.status === 'success' && result.user) {
            const dbUser = result.user;
            
            if (dbUser.status === 'Locked') {
                setError('Tài khoản này đã bị khóa. Vui lòng liên hệ quản trị viên.');
                setIsLoading(false);
                return;
            }

            // Đăng nhập thành công
            login({
                id: dbUser.id,
                name: dbUser.fullName,
                email: dbUser.username,
                role: dbUser.role as UserRole,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.fullName)}&background=random&color=fff`
            });

            navigate(dbUser.role === UserRole.ADMIN ? '/admin' : '/user');
        } else {
            // Xử lý lỗi từ server trả về
            const msg = result.message || result.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.';
            
            if (msg.includes('Exception') || msg.includes('Script') || msg.includes('ReferenceError')) {
                 setError(`Lỗi hệ thống (Vui lòng báo admin): ${msg}`);
            } else {
                 setError(msg);
            }
        }
    } catch (err) {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto flex rounded-2xl shadow-xl overflow-hidden">
        {/* Left Branding Panel */}
        <div className="hidden lg:flex w-1/2 bg-primary-600 items-center justify-center p-12 text-white flex-col relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 opacity-90"></div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4"></div>
          <div className="relative z-10 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm mb-6 shadow-inner border border-white/30">
                  <School className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight whitespace-nowrap">Trường Trung cấp kỹ nghệ Hà Tĩnh</h1>
              <p className="mt-4 text-lg text-primary-100 max-w-sm mx-auto">
                  Dự án quản lý điểm danh và nề nếp dành cho giáo viên Trung cấp nghề
              </p>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 md:p-12 relative">
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100">
                {isOnline ? (
                    <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
                   {isOnline ? 'Máy chủ Online' : 'Mất kết nối'}
                </span>
             </div>
          </div>

          <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Đăng nhập tài khoản</h2>
                <p className="text-slate-500 mt-2 text-sm">Sử dụng tài khoản được cấp để truy cập hệ thống.</p>
              </div>

              {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-start animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                      <span className="break-words">{error}</span>
                  </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên đăng nhập</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                              <User className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500" />
                          </div>
                          <input
                              type="text"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none bg-slate-50 focus:bg-white"
                              placeholder="Ví dụ: gv001"
                              required
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
                      <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500" />
                          </div>
                          <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none bg-slate-50 focus:bg-white"
                              placeholder="Nhập mật khẩu"
                              required
                          />
                          <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-primary-600 transition-colors focus:outline-none"
                              tabIndex={-1}
                          >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                      </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                          <span className="ml-2 text-slate-600">Ghi nhớ</span>
                      </label>
                      <a href="#" className="text-primary-600 hover:text-primary-700 font-medium hover:underline">
                          Quên mật khẩu?
                      </a>
                  </div>

                  <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : null}
                      {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
                      {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </button>
              </form>
          </div>
        </div>
      </div>
      
      <footer className="text-center mt-8 text-slate-500">
        <p className="text-xs text-slate-400 mt-2">&copy; 2026 Trường Trung cấp kỹ nghệ Hà Tĩnh</p>
      </footer>
    </div>
  );
};

export default Login;
