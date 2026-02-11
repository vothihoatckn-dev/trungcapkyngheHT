
import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Building2, Briefcase, X, Save, Layers, Loader2 } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface Vocation {
  id: string;
  name: string;
  departmentId: string;
  description: string;
}

const DepartmentAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DEPARTMENTS' | 'VOCATIONS'>('DEPARTMENTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false); // Trạng thái xử lý cục bộ
  
  const { data, saveRecord, removeRecord } = useSync();
  const departments = (data.Departments as Department[]) || [];
  const vocations = (data.Vocations as Vocation[]) || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deptForm, setDeptForm] = useState({ code: '', name: '', description: '' });
  const [vocForm, setVocForm] = useState({ name: '', departmentId: '', description: '' });

  const getDepartmentName = (deptId: string) => {
    return departments.find(d => d.id === deptId)?.name || 'Chưa phân khoa';
  };

  const handleDelete = async (id: string, type: 'DEPT' | 'VOC') => {
    if (type === 'DEPT') {
      const hasVocations = vocations.some(v => v.departmentId === id);
      if (hasVocations) {
        alert('Không thể xóa Khoa này vì đang có Nghề trực thuộc. Vui lòng xóa hoặc chuyển nghề sang khoa khác trước.');
        return;
      }
      if (window.confirm('Bạn có chắc chắn muốn xóa Khoa này không?')) {
        setProcessing(true);
        await removeRecord('Departments', id);
        setProcessing(false);
      }
    } else {
      if (window.confirm('Bạn có chắc chắn muốn xóa Nghề này không?')) {
        setProcessing(true);
        await removeRecord('Vocations', id);
        setProcessing(false);
      }
    }
  };

  const openModal = (item?: any) => {
    if (activeTab === 'DEPARTMENTS') {
      if (item) {
        setEditingId(item.id);
        setDeptForm({ code: item.code, name: item.name, description: item.description });
      } else {
        setEditingId(null);
        setDeptForm({ code: '', name: '', description: '' });
      }
    } else {
      if (item) {
        setEditingId(item.id);
        setVocForm({ name: item.name, departmentId: item.departmentId, description: item.description });
      } else {
        setEditingId(null);
        setVocForm({ name: '', departmentId: departments[0]?.id || '', description: '' });
      }
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    if (activeTab === 'DEPARTMENTS') {
      if (editingId) {
        await saveRecord('Departments', { id: editingId, ...deptForm }, true);
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        await saveRecord('Departments', { id: newId, ...deptForm }, false);
      }
    } else {
      if (editingId) {
        await saveRecord('Vocations', { id: editingId, ...vocForm }, true);
      } else {
        const newId = Math.random().toString(36).substr(2, 9);
        await saveRecord('Vocations', { id: newId, ...vocForm }, false);
      }
    }
    setProcessing(false);
    setIsModalOpen(false);
  };

  const filteredData = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    
    // Find and exclude "Khoa Điện" and its vocations
    const departmentToExclude = departments.find(d => d.name === 'Khoa Điện');
    const departmentIdToExclude = departmentToExclude ? departmentToExclude.id : null;

    if (activeTab === 'DEPARTMENTS') {
      return departments.filter(d => 
        d.id !== departmentIdToExclude &&
        (d.name.toLowerCase().includes(lowerTerm) || d.code.toLowerCase().includes(lowerTerm))
      );
    } else {
      return vocations.filter(v => 
        v.departmentId !== departmentIdToExclude &&
        (v.name.toLowerCase().includes(lowerTerm) || getDepartmentName(v.departmentId).toLowerCase().includes(lowerTerm))
      );
    }
  }, [activeTab, searchTerm, departments, vocations]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Cơ cấu tổ chức</h2>
        <p className="text-slate-500">Quản lý danh sách Khoa và các Nghề đào tạo trực thuộc</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row overflow-hidden min-h-[600px] relative">
        
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex lg:flex-col">
           <button onClick={() => { setActiveTab('DEPARTMENTS'); setSearchTerm(''); }} className={`flex-1 lg:flex-none p-4 text-left flex items-center transition-all ${activeTab === 'DEPARTMENTS' ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 border-l-4 border-transparent'}`}>
             <Building2 className={`w-5 h-5 mr-3 ${activeTab === 'DEPARTMENTS' ? 'text-blue-600' : 'text-slate-400'}`} />
             <div><div className="font-bold text-sm">Quản lý Khoa</div><div className="text-xs opacity-70">Đơn vị chuyên môn</div></div>
           </button>
           <button onClick={() => { setActiveTab('VOCATIONS'); setSearchTerm(''); }} className={`flex-1 lg:flex-none p-4 text-left flex items-center transition-all ${activeTab === 'VOCATIONS' ? 'bg-white text-purple-600 border-l-4 border-purple-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 border-l-4 border-transparent'}`}>
             <Briefcase className={`w-5 h-5 mr-3 ${activeTab === 'VOCATIONS' ? 'text-purple-600' : 'text-slate-400'}`} />
             <div><div className="font-bold text-sm">Quản lý Nghề</div><div className="text-xs opacity-70">Ngành nghề đào tạo</div></div>
           </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
           <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
              <div className="relative w-full max-w-md">
                  <input type="text" placeholder={activeTab === 'DEPARTMENTS' ? "Tìm kiếm Khoa..." : "Tìm kiếm Nghề..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button onClick={() => openModal()} className={`flex items-center px-4 py-2 text-white rounded-lg shadow-sm font-medium text-sm transition-colors ${activeTab === 'DEPARTMENTS' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                <Plus className="w-4 h-4 mr-2" /> {activeTab === 'DEPARTMENTS' ? 'Thêm Khoa' : 'Thêm Nghề'}
              </button>
           </div>

           <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                  <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4 w-16">STT</th>
                    {activeTab === 'DEPARTMENTS' ? (<><th className="px-6 py-4 w-32">Mã Khoa</th><th className="px-6 py-4">Tên Khoa</th><th className="px-6 py-4">Mô tả</th></>) : (<><th className="px-6 py-4">Tên Nghề</th><th className="px-6 py-4">Thuộc Khoa</th><th className="px-6 py-4">Mô tả</th></>)}
                    <th className="px-6 py-4 text-right w-32">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item: any, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                      {activeTab === 'DEPARTMENTS' ? (
                        <>
                          <td className="px-6 py-4"><span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-mono font-bold">{item.code}</span></td>
                          <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 italic">{item.description}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                          <td className="px-6 py-4"><div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit"><Building2 className="w-3 h-3 mr-1.5" />{getDepartmentName(item.departmentId)}</div></td>
                          <td className="px-6 py-4 text-sm text-slate-500 italic">{item.description}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(item.id, activeTab === 'DEPARTMENTS' ? 'DEPT' : 'VOC')} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Không tìm thấy dữ liệu.</td></tr>}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`flex items-center justify-between p-4 border-b border-slate-200 ${activeTab === 'DEPARTMENTS' ? 'bg-blue-50' : 'bg-purple-50'}`}>
              <h3 className={`font-bold text-lg ${activeTab === 'DEPARTMENTS' ? 'text-blue-800' : 'text-purple-800'}`}>{editingId ? 'Cập nhật' : 'Thêm mới'} {activeTab === 'DEPARTMENTS' ? 'Khoa' : 'Nghề'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white/50 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {activeTab === 'DEPARTMENTS' ? (
                <>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Mã Khoa *</label><input type="text" required value={deptForm.code} onChange={(e) => setDeptForm({...deptForm, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên Khoa *</label><input type="text" required value={deptForm.name} onChange={(e) => setDeptForm({...deptForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label><textarea rows={3} value={deptForm.description} onChange={(e) => setDeptForm({...deptForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" /></div>
                </>
              ) : (
                <>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên Nghề đào tạo *</label><input type="text" required value={vocForm.name} onChange={(e) => setVocForm({...vocForm, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Thuộc Khoa *</label><select required value={vocForm.departmentId} onChange={(e) => setVocForm({...vocForm, departmentId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value="">-- Chọn Khoa --</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label><textarea rows={3} value={vocForm.description} onChange={(e) => setVocForm({...vocForm, description: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" /></div>
                </>
              )}
              <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" disabled={processing} className={`px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center ${activeTab === 'DEPARTMENTS' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>{processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />} {editingId ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentAdmin;
