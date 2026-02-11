
import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Filter, X, Save, BookOpen, Wrench, ChevronDown, Download, FileUp, Loader2, Users } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { useSync } from '../../context/SyncContext';

interface ClassData {
  id: string;
  className: string;
  course: string;
  vocational: string;
  homeroomTeacher: string; // Tên giáo viên
  homeroomTeacherId?: string; // ID GVCN
  subjectTeacherIds?: string[]; // Danh sách ID giáo viên bộ môn
  status: 'Studying' | 'Graduated'; 
  note: string;
}

const ClassAdmin: React.FC = () => {
  const { data, saveRecord, removeRecord } = useSync();
  const classes = data.VocationalClasses || [];
  const teachers = data.Teachers || []; // Lấy danh sách giáo viên
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVocation, setSelectedVocation] = useState('');
  const [loading, setLoading] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Xóa danh sách nghề demo, chỉ dùng dữ liệu từ sync
  const vocations = data.Vocations.length > 0 ? data.Vocations.map(v => v.name) : [];

  const [formData, setFormData] = useState<Omit<ClassData, 'id'>>({
    className: '', course: '', vocational: vocations[0] || '', homeroomTeacher: '', homeroomTeacherId: '', subjectTeacherIds: [], status: 'Studying', note: ''
  });

  const [tempSubjectTeacherId, setTempSubjectTeacherId] = useState('');

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp học này không?')) {
      await removeRecord('VocationalClasses', id);
    }
  };

  const openModal = (cls?: ClassData) => {
    if (cls) {
      setEditingId(cls.id);
      setFormData({
        className: cls.className, 
        course: cls.course, 
        vocational: cls.vocational,
        homeroomTeacher: cls.homeroomTeacher, 
        homeroomTeacherId: cls.homeroomTeacherId || '', 
        subjectTeacherIds: cls.subjectTeacherIds || [],
        status: cls.status, 
        note: cls.note
      });
    } else {
      setEditingId(null);
      setFormData({
        className: '', course: '', vocational: vocations[0] || '', homeroomTeacher: '', homeroomTeacherId: '', subjectTeacherIds: [], status: 'Studying', note: ''
      });
    }
    setTempSubjectTeacherId('');
    setIsModalOpen(true);
  };

  const handleTeacherSelect = (teacherId: string) => {
      const teacher = teachers.find((t: any) => t.id === teacherId);
      setFormData(prev => ({
          ...prev,
          homeroomTeacherId: teacherId,
          homeroomTeacher: teacher ? teacher.fullName : ''
      }));
  };

  const addSubjectTeacher = () => {
      if (!tempSubjectTeacherId) return;
      if (formData.subjectTeacherIds?.includes(tempSubjectTeacherId)) {
          alert("Giáo viên này đã được thêm vào danh sách.");
          return;
      }
      setFormData(prev => ({
          ...prev,
          subjectTeacherIds: [...(prev.subjectTeacherIds || []), tempSubjectTeacherId]
      }));
      setTempSubjectTeacherId('');
  };

  const removeSubjectTeacher = (teacherId: string) => {
      setFormData(prev => ({
          ...prev,
          subjectTeacherIds: (prev.subjectTeacherIds || []).filter(id => id !== teacherId)
      }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        ...formData
    };
    await saveRecord('VocationalClasses', newRecord, !!editingId);
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
            const newClass = {
                id: Math.random().toString(36).substr(2, 9),
                className: row["Tên lớp"] || "Lớp mới",
                vocational: row["Nghề đào tạo"] || (vocations[0] || ""),
                course: row["Khóa học"] || "",
                homeroomTeacher: row["GVCN"] || "",
                status: (row["Trạng thái"] === "Đã tốt nghiệp") ? "Graduated" : "Studying",
                note: row["Ghi chú"] || ""
            };
            saveRecord('VocationalClasses', newClass, false);
            count++;
        }
        alert(`Đã nhập thành công ${count} lớp học!`);
      } catch (error) {
        console.error(error);
        alert("Lỗi khi đọc file Excel.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportTemplate = () => {
    const data = [{ "Tên lớp": "CNT K19A", "Nghề đào tạo": "Công nghệ thông tin", "Khóa học": "K19 (2025-2028)", "GVCN": "Nguyễn Văn Mẫu", "Trạng thái": "Đang học", "Ghi chú": "Lớp chất lượng cao" }];
    const ws = utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Mau_Nhap_Lop");
    writeFile(wb, "Mau_Danh_Sach_Lop.xlsx");
  };

  const filteredClasses = classes.filter((c: any) => {
    const matchesSearch = 
      c.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.homeroomTeacher?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vocational?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVocation = selectedVocation === '' || c.vocational === selectedVocation;
    return matchesSearch && matchesVocation;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Quản lý Lớp học</h2><p className="text-sm text-slate-500">{classes.length} lớp nghề</p></div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportTemplate} className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"><Download className="w-4 h-4 mr-2" /> Tải mẫu</button>
           <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleImportExcel} />
           <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileUp className="w-4 h-4 mr-2" />} Nhập Excel</button>
           <button onClick={() => openModal()} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"><Plus className="w-4 h-4 mr-2" /> Thêm lớp</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full max-w-sm">
                <input type="text" placeholder="Tìm kiếm lớp, GV..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                 <div className="relative w-full sm:w-auto">
                    <select value={selectedVocation} onChange={(e) => setSelectedVocation(e.target.value)} className="w-full sm:w-64 pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white appearance-none">
                        <option value="">Tất cả các nghề</option>
                        {vocations.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                 </div>
            </div>
        </div>

        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
                <th className="px-6 py-4">Tên lớp</th><th className="px-6 py-4">Nghề Đào tạo</th><th className="px-6 py-4">Khóa học</th><th className="px-6 py-4">Giáo viên</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-blue-600">{item.className}</td>
                  <td className="px-6 py-4 text-sm text-slate-700"><div className="flex items-center"><Wrench className="w-3 h-3 mr-2 text-slate-400" />{item.vocational}</div></td>
                  <td className="px-6 py-4 text-sm text-slate-700"><div className="flex items-center"><BookOpen className="w-3 h-3 mr-2 text-slate-400" />{item.course}</div></td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                      <div><span className="font-semibold">CN:</span> {item.homeroomTeacher || '---'}</div>
                      {(item.subjectTeacherIds && item.subjectTeacherIds.length > 0) && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center" title={`${item.subjectTeacherIds.length} giáo viên bộ môn`}>
                              <Users className="w-3 h-3 mr-1" /> +{item.subjectTeacherIds.length} GV bộ môn
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'Studying' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{item.status === 'Studying' ? 'Đang học' : 'Đã tốt nghiệp'}</span></td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end space-x-3"><button onClick={() => openModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
              {filteredClasses.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">Không tìm thấy dữ liệu.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật' : 'Thêm mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-6">
                <form id="classForm" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên lớp <span className="text-red-500">*</span></label><input type="text" required value={formData.className} onChange={(e) => setFormData({...formData, className: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-1">Khóa học</label><input type="text" value={formData.course} onChange={(e) => setFormData({...formData, course: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Nghề đào tạo</label><select value={formData.vocational} onChange={(e) => setFormData({...formData, vocational: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">{vocations.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                
                {/* HOMEROOM TEACHER */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
                    <select 
                        value={formData.homeroomTeacherId} 
                        onChange={(e) => handleTeacherSelect(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                        <option value="">-- Chọn GVCN --</option>
                        {teachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                        ))}
                    </select>
                </div>

                {/* SUBJECT TEACHERS */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Giáo viên bộ môn (Có quyền điểm danh)</label>
                    <div className="flex gap-2 mb-2">
                        <select 
                            value={tempSubjectTeacherId} 
                            onChange={(e) => setTempSubjectTeacherId(e.target.value)} 
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                            <option value="">-- Chọn GV bộ môn --</option>
                            {teachers.filter((t:any) => t.id !== formData.homeroomTeacherId).map((t: any) => (
                                <option key={t.id} value={t.id}>{t.fullName}</option>
                            ))}
                        </select>
                        <button type="button" onClick={addSubjectTeacher} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium text-slate-700 transition-colors">Thêm</button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                        {(formData.subjectTeacherIds || []).map(tid => {
                            const t = teachers.find((tc: any) => tc.id === tid);
                            return (
                                <div key={tid} className="flex items-center bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded text-xs shadow-sm">
                                    <span>{t ? t.fullName : tid}</span>
                                    <button type="button" onClick={() => removeSubjectTeacher(tid)} className="ml-2 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                </div>
                            );
                        })}
                        {(formData.subjectTeacherIds || []).length === 0 && (
                            <p className="text-xs text-slate-400 italic">Chưa có giáo viên bộ môn nào.</p>
                        )}
                    </div>
                </div>

                <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><div className="flex space-x-4 mt-2"><label className="flex items-center cursor-pointer"><input type="radio" name="status" checked={formData.status === 'Studying'} onChange={() => setFormData({...formData, status: 'Studying'})} className="w-4 h-4 text-blue-600 border-slate-300" /><span className="ml-2 text-sm">Đang học</span></label><label className="flex items-center cursor-pointer"><input type="radio" name="status" checked={formData.status === 'Graduated'} onChange={() => setFormData({...formData, status: 'Graduated'})} className="w-4 h-4 text-blue-600 border-slate-300" /><span className="ml-2 text-sm">Đã tốt nghiệp</span></label></div></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label><textarea rows={3} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"></textarea></div>
                </form>
            </div>
            <div className="flex justify-end p-4 space-x-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" form="classForm" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"><Save className="w-4 h-4 mr-2" /> {editingId ? 'Cập nhật' : 'Lưu lại'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ClassAdmin;
