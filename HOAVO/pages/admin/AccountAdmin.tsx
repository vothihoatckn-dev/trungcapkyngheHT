
import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Key, X, Save, CheckCircle, Lock, User, Loader2, UserCheck, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { UserRole } from '../../types';
import { useSync } from '../../context/SyncContext';

interface AccountData {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  status: 'Active' | 'Locked';
  lastLogin?: string;
}

const AccountAdmin: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  
  const { data, saveRecord, removeRecord, isSyncing } = useSync();
  const accounts = (data.Users as AccountData[]) || [];
  const teachers = (data.Teachers || []); // Lấy danh sách giáo viên
  const loading = isSyncing;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Thêm teacherId vào state form để theo dõi liên kết
  const [formData, setFormData] = useState({
    username: '', password: '', fullName: '', role: UserRole.TEACHER, status: 'Active' as 'Active' | 'Locked', teacherId: ''
  });

  // Lọc danh sách giáo viên khả dụng:
  // 1. Chưa có userId (chưa liên kết ai)
  // 2. HOẶC đang liên kết với chính tài khoản đang sửa (editingId)
  const availableTeachers = useMemo(() => {
    return teachers.filter((t: any) => !t.userId || (editingId && t.userId === editingId));
  }, [teachers, editingId]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này không? Nếu tài khoản này đang liên kết với Giáo viên, liên kết sẽ bị hủy.')) {
        // 1. Tìm giáo viên đang liên kết với tài khoản này (nếu có) để gỡ bỏ userId
        const linkedTeacher = teachers.find((t: any) => t.userId === id);
        
        await removeRecord('Users', id);

        // 2. Cập nhật lại giáo viên (xóa userId)
        if (linkedTeacher) {
            await saveRecord('Teachers', { ...linkedTeacher, userId: '' }, true);
        }
    }
  };

  const openModal = (account?: AccountData) => {
    if (account) {
      setEditingId(account.id);
      // Tìm xem tài khoản này có đang liên kết với giáo viên nào không để hiển thị
      const linkedTeacher = teachers.find((t: any) => t.userId === account.id);
      
      setFormData({
        username: account.username, 
        password: '', 
        fullName: account.fullName, 
        role: account.role, 
        status: account.status,
        teacherId: linkedTeacher ? linkedTeacher.id : ''
      });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', fullName: '', role: UserRole.TEACHER, status: 'Active', teacherId: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  // Xử lý khi chọn giáo viên từ dropdown
  const handleTeacherSelect = (teacherId: string) => {
      const selectedTeacher = teachers.find((t: any) => t.id === teacherId);
      
      if (selectedTeacher) {
          // Tự động điền thông tin từ Giáo viên sang Tài khoản
          setFormData(prev => ({
              ...prev,
              teacherId: teacherId,
              fullName: selectedTeacher.fullName, // Tự động điền tên
              username: selectedTeacher.code,     // Tự động điền Mã GV làm username
              role: UserRole.TEACHER              // Chắc chắn là quyền Giáo viên
          }));
      } else {
          // Nếu chọn "-- Không liên kết --"
          setFormData(prev => ({ ...prev, teacherId: '' }));
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !formData.password) { alert("Vui lòng nhập mật khẩu cho tài khoản mới"); return; }
    
    // 1. Lưu/Tạo User (Bảng Users)
    let userId = editingId;
    if (editingId) {
       const updateData: any = { 
           id: editingId, 
           username: formData.username, 
           fullName: formData.fullName, 
           role: formData.role, 
           status: formData.status 
       };
       if (formData.password) updateData.password = formData.password;
       await saveRecord('Users', updateData, true);
    } else {
       userId = Math.random().toString(36).substr(2, 9);
       await saveRecord('Users', { id: userId, ...formData, lastLogin: 'Chưa đăng nhập' }, false);
    }

    // 2. Xử lý liên kết với bảng Teachers
    // Trường hợp A: Nếu người dùng chọn một giáo viên mới để liên kết
    if (formData.teacherId && userId) {
        // Tìm giáo viên được chọn
        const newLinkedTeacher = teachers.find((t: any) => t.id === formData.teacherId);
        
        // Nếu giáo viên này chưa trỏ vào userId này, thì cập nhật
        if (newLinkedTeacher && newLinkedTeacher.userId !== userId) {
            await saveRecord('Teachers', { ...newLinkedTeacher, userId: userId }, true);
        }

        // Nếu trước đó tài khoản này liên kết với một giáo viên KHÁC (cũ), phải gỡ giáo viên cũ ra
        if (editingId) {
             const oldLinkedTeacher = teachers.find((t: any) => t.userId === editingId && t.id !== formData.teacherId);
             if (oldLinkedTeacher) {
                 await saveRecord('Teachers', { ...oldLinkedTeacher, userId: '' }, true);
             }
        }
    }
    
    // Trường hợp B: Nếu người dùng BỎ liên kết (đã chọn rỗng) khi đang sửa
    if (editingId && !formData.teacherId) {
         const oldLinkedTeacher = teachers.find((t: any) => t.userId === editingId);
         if (oldLinkedTeacher) {
             await saveRecord('Teachers', { ...oldLinkedTeacher, userId: '' }, true);
         }
    }

    closeModal();
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = acc.username.toLowerCase().includes(searchTerm.toLowerCase()) || acc.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === '' || acc.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tài khoản hệ thống</h2>
          <p className="text-slate-500 text-sm">Quản lý quyền truy cập và thông tin đăng nhập</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"><Plus className="w-4 h-4 mr-2" /> Tạo tài khoản</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
        {loading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full max-w-sm">
                <input type="text" placeholder="Tìm theo tên đăng nhập hoặc họ tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Tất cả quyền</option>
                    <option value={UserRole.ADMIN}>Admin (Quản trị)</option>
                    <option value={UserRole.TEACHER}>Giáo viên</option>
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
                <th className="px-6 py-4">Tên đăng nhập</th><th className="px-6 py-4">Mật khẩu</th><th className="px-6 py-4">Họ và tên</th><th className="px-6 py-4">Quyền hạn</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Đăng nhập cuối</th><th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((acc) => {
                 // Kiểm tra xem tài khoản này có đang được liên kết với giáo viên nào không
                 const linkedTeacher = teachers.find((t: any) => t.userId === acc.id);
                 return (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-800">{acc.username}</div>
                          {linkedTeacher && (
                              <div className="flex items-center mt-1" title={`Đã liên kết với GV: ${linkedTeacher.fullName}`}>
                                  <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200 inline-flex items-center">
                                      <LinkIcon className="w-3 h-3 mr-1"/> {linkedTeacher.code}
                                  </span>
                              </div>
                          )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600 bg-slate-50/50 rounded">{acc.password || '******'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{acc.fullName}</td>
                      <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${acc.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{acc.role === UserRole.ADMIN ? 'Quản trị viên' : 'Giáo viên'}</span></td>
                      <td className="px-6 py-4">{acc.status === 'Active' ? <span className="inline-flex items-center text-xs font-medium text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Hoạt động</span> : <span className="inline-flex items-center text-xs font-medium text-red-700"><Lock className="w-3 h-3 mr-1" /> Đã khóa</span>}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{acc.lastLogin}</td>
                      <td className="px-6 py-4 text-right"><div className="flex items-center justify-end space-x-2"><button onClick={() => openModal(acc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(acc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                 );
              })}
              {!loading && filteredAccounts.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">Không tìm thấy tài khoản.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}</h3>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Teacher Selection Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                  <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center">
                      <UserCheck className="w-4 h-4 mr-2" /> 
                      Liên kết Giáo viên (Tùy chọn)
                  </label>
                  <select 
                      value={formData.teacherId} 
                      onChange={(e) => handleTeacherSelect(e.target.value)} 
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  >
                      <option value="">-- Không liên kết / Nhập thủ công --</option>
                      {availableTeachers.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.fullName} (Mã: {t.code})</option>
                      ))}
                  </select>
                  <div className="flex items-start mt-2">
                     <AlertCircle className="w-3 h-3 text-blue-500 mt-0.5 mr-1.5 shrink-0" />
                     <p className="text-xs text-blue-600">
                        Chọn giáo viên sẽ tự động điền <strong>Tên đăng nhập</strong> (Mã GV) và <strong>Họ tên</strong>.
                     </p>
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                  <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input type="text" required disabled={!!editingId} value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className={`w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm ${editingId || formData.teacherId ? 'bg-slate-100' : ''}`} placeholder="Ví dụ: GV001" />
                  </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{editingId ? 'Mật khẩu mới' : 'Mật khẩu'} <span className={editingId ? '' : 'text-red-500'}>*</span></label>
                  <div className="relative">
                      <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Nhập mật khẩu" />
                  </div>
              </div>

              <div><label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên hiển thị <span className="text-red-500">*</span></label><input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm ${formData.teacherId ? 'bg-slate-100' : ''}`} /></div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Phân quyền</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value={UserRole.ADMIN}>Quản trị viên</option><option value={UserRole.TEACHER}>Giáo viên</option></select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Locked'})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value="Active">Hoạt động</option><option value="Locked">Đã khóa</option></select></div>
              </div>
              
              <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />} {editingId ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountAdmin;
