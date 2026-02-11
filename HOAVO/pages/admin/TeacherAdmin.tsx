
import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Mail, Phone, X, Save, Briefcase, Building, ChevronDown, Download, FileUp, Loader2, UserCheck } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { useSync } from '../../context/SyncContext';

interface TeacherData {
  id: string;
  userId?: string; // Liên kết với bảng Users
  code: string;
  fullName: string;
  email: string;
  phone: string;
  profession: string;
  department: string;
  status: 'Active' | 'Inactive';
}

const TeacherAdmin: React.FC = () => {
  const { data, saveRecord, removeRecord } = useSync();
  const teachers = (data.Teachers as TeacherData[]) || [];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Lấy danh sách từ Cache (loại bỏ dữ liệu demo)
  const departments = data.Departments.length > 0 ? data.Departments.map(d => d.name) : [];
  const vocations = data.Vocations.length > 0 ? data.Vocations.map(v => v.name) : [];

  const [formData, setFormData] = useState<Omit<TeacherData, 'id'>>({
    userId: '', code: '', fullName: '', email: '', phone: '', profession: vocations[0] || '', department: departments[0] || '', status: 'Active'
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa giáo viên này không?')) {
      await removeRecord('Teachers', id);
    }
  };

  const openModal = (teacher?: TeacherData) => {
    if (teacher) {
      setEditingId(teacher.id);
      setFormData({
        userId: teacher.userId || '',
        code: teacher.code, fullName: teacher.fullName, email: teacher.email,
        phone: teacher.phone, profession: teacher.profession, department: teacher.department, status: teacher.status
      });
    } else {
      setEditingId(null);
      setFormData({
        userId: '',
        code: `GV${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`, // Mã tạm thời
        fullName: '', email: '', phone: '', profession: vocations[0] || '', department: departments[0] || '', status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        ...formData
    };
    await saveRecord('Teachers', newRecord, !!editingId);
    setIsModalOpen(false);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const excelData = utils.sheet_to_json(ws);
        
        let count = 0;
        for (const row of excelData as any[]) {
            const newTeacher = {
                id: Math.random().toString(36).substr(2, 9),
                code: row["Mã GV"] || `GV${Math.floor(Math.random() * 1000)}`,
                fullName: row["Họ và Tên"] || "Chưa nhập tên",
                email: row["Email"] || "",
                phone: row["Số điện thoại"] ? String(row["Số điện thoại"]) : "",
                department: row["Khoa/Đơn vị"] || (departments[0] || ""),
                profession: row["Nghề đào tạo"] || (vocations[0] || ""),
                status: (row["Trạng thái"] === "Inactive") ? "Inactive" : "Active"
            };
            saveRecord('Teachers', newTeacher, false);
            count++;
        }
        alert(`Đã thêm ${count} giáo viên vào hàng đợi đồng bộ!`);
      } catch (error) { console.error(error); alert("Lỗi khi đọc file Excel."); } 
      finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportTemplate = () => {
    const data = [{ "Mã GV": "GV100", "Họ và Tên": "Nguyễn Văn Mẫu", "Email": "mau@edu.vn", "Số điện thoại": "0912345678", "Khoa/Đơn vị": "Khoa Công nghệ thông tin", "Nghề đào tạo": "Công nghệ thông tin", "Trạng thái": "Active" }];
    const ws = utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 10 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Mau_Nhap_Giao_Vien");
    writeFile(wb, "Mau_Danh_Sach_Giao_Vien.xlsx");
  };

  const filteredTeachers = teachers.filter((t: any) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = t.fullName?.toLowerCase().includes(term) || t.code?.toLowerCase().includes(term);
    const matchesDepartment = selectedDepartment === '' || t.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Quản lý Giáo viên</h2><p className="text-slate-500 text-sm">{teachers.length} giáo viên</p></div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportTemplate} className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"><Download className="w-4 h-4 mr-2" /> Tải mẫu</button>
           <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleImportExcel} />
           <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileUp className="w-4 h-4 mr-2" />} Nhập Excel</button>
           <button onClick={() => openModal()} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"><Plus className="w-4 h-4 mr-2" /> Thêm giáo viên</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full max-w-sm">
                <input type="text" placeholder="Tìm theo tên, mã hoặc khoa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="relative w-full sm:w-auto">
                <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full sm:w-56 pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white appearance-none">
                    <option value="">Tất cả các khoa</option>
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
                <th className="px-6 py-4">Giáo viên</th><th className="px-6 py-4">Liên hệ</th><th className="px-6 py-4">Nghề đào tạo</th><th className="px-6 py-4">Khoa</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                      <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold mr-3 text-sm border-2 ${item.userId ? 'bg-green-100 text-green-700 border-white' : 'bg-slate-100 text-slate-500 border-slate-200'}`} title={item.userId ? 'Đã liên kết tài khoản' : 'Chưa liên kết tài khoản'}>
                              {item.userId ? <UserCheck className="w-5 h-5" /> : item.fullName?.split(' ').pop()?.charAt(0)}
                          </div>
                          <div>
                              <div className="text-sm font-bold text-slate-800">{item.fullName}</div>
                              <div className="text-xs text-slate-500">{item.code}</div>
                          </div>
                      </div>
                  </td>
                  <td className="px-6 py-4"><div className="text-sm text-slate-600 flex items-center mb-1"><Mail className="w-3 h-3 mr-1.5 text-slate-400" />{item.email}</div><div className="text-sm text-slate-600 flex items-center"><Phone className="w-3 h-3 mr-1.5 text-slate-400" />{item.phone}</div></td>
                  <td className="px-6 py-4"><div className="flex items-center text-sm text-slate-700"><Briefcase className="w-4 h-4 mr-2 text-slate-400" />{item.profession}</div></td>
                  <td className="px-6 py-4"><div className="flex items-center text-sm text-slate-700"><Building className="w-4 h-4 mr-2 text-slate-400" />{item.department}</div></td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'Active' ? 'Đang dạy' : 'Đã nghỉ'}</span></td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end space-x-2"><button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
              {!loading && filteredTeachers.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">Không tìm thấy giáo viên nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật' : 'Thêm giáo viên'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                 {/* Row 1 */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã GV *</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            required 
                            value={formData.code} 
                            onChange={(e) => setFormData({...formData, code: e.target.value})} 
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                            placeholder="Nhập mã GV"
                        />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Khoa / Đơn vị *</label>
                    <select required value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                 </div>

                 {/* Row 2: Name */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên *</label>
                    <input 
                        type="text" 
                        required 
                        value={formData.fullName} 
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập họ và tên giáo viên"
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nghề đào tạo</label>
                    <select value={formData.profession} onChange={(e) => setFormData({...formData, profession: e.target.value})} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                        {vocations.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                 </div>

                 {/* Row 3 */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="example@edu.vn" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="09xxxxxxx" />
                 </div>
              </div>

              {/* Status & Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                  <label className="flex items-center cursor-pointer mb-6 w-fit">
                      <input type="checkbox" checked={formData.status === 'Active'} onChange={(e) => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="ml-2 text-sm font-medium text-slate-700">Đang công tác (Active)</span>
                  </label>
                  
                  <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Hủy bỏ</button>
                    <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center shadow-sm transition-colors">
                        <Save className="w-4 h-4 mr-2" /> {editingId ? 'Cập nhật' : 'Lưu lại'}
                    </button>
                  </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAdmin;
