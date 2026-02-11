
import React, { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Search, X, Save, Library, Book, User, CheckCircle, XCircle, Download, FileUp, Loader2, Users } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { useSync } from '../../context/SyncContext';

interface AcademicClassData {
  id: string;
  className: string;
  homeroomTeacher: string;
  homeroomTeacherId?: string; 
  subjectTeacherIds?: string[]; // Thêm trường danh sách giáo viên bộ môn
  subject: string;
  status: 'Active' | 'Inactive';
  note?: string;
}

const AcademicClassAdmin: React.FC = () => {
  const { data, saveRecord, removeRecord } = useSync();
  const classes = data.AcademicClasses || [];
  const teachers = data.Teachers || []; 

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<AcademicClassData, 'id'>>({
    className: '', homeroomTeacher: '', homeroomTeacherId: '', subjectTeacherIds: [], subject: '', status: 'Active', note: ''
  });

  const [tempSubjectTeacherId, setTempSubjectTeacherId] = useState('');

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lớp văn hóa này không?')) {
      await removeRecord('AcademicClasses', id);
    }
  };

  const openModal = (cls?: AcademicClassData) => {
    if (cls) {
      setEditingId(cls.id);
      setFormData({
        className: cls.className, 
        homeroomTeacher: cls.homeroomTeacher,
        homeroomTeacherId: cls.homeroomTeacherId || '',
        subjectTeacherIds: cls.subjectTeacherIds || [],
        subject: cls.subject, 
        status: cls.status, 
        note: cls.note || ''
      });
    } else {
      setEditingId(null);
      setFormData({ className: '', homeroomTeacher: '', homeroomTeacherId: '', subjectTeacherIds: [], subject: '', status: 'Active', note: '' });
    }
    setTempSubjectTeacherId('');
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

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
    await saveRecord('AcademicClasses', newRecord, !!editingId);
    closeModal();
  };
  
  // --- Excel Features ---
  const handleExportTemplate = () => {
    const data = [{ "Tên lớp VH": "10A3", "Giáo viên chủ nhiệm": "Trần Văn Mẫu", "Môn / Ban": "Cơ bản", "Trạng thái": "Đang dạy", "Ghi chú": "Lớp mới thành lập" }];
    const ws = utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 30 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Mau_Lop_Van_Hoa");
    writeFile(wb, "Mau_Lop_Van_Hoa.xlsx");
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
            const tName = row["Giáo viên chủ nhiệm"];
            const foundTeacher = tName ? teachers.find((t: any) => t.fullName === tName) : undefined;

            const newClass = {
                id: Math.random().toString(36).substr(2, 9),
                className: row["Tên lớp VH"] || "Chưa có tên",
                homeroomTeacher: tName || "",
                homeroomTeacherId: foundTeacher ? foundTeacher.id : "",
                subject: row["Môn / Ban"] || "",
                status: row["Trạng thái"] === "Đã nghỉ" ? "Inactive" : "Active",
                note: row["Ghi chú"] || ""
            };
            saveRecord('AcademicClasses', newClass, false);
            count++;
        }
        alert(`Đã thêm ${count} lớp VH vào hàng đợi đồng bộ!`);
      } catch (error) { console.error("Lỗi khi nhập Excel:", error); alert("Có lỗi xảy ra khi đọc file Excel."); }
      finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
    };
    reader.readAsBinaryString(file);
  };
  const triggerFileUpload = () => fileInputRef.current?.click();

  const filteredClasses = classes.filter((c: any) => {
    const term = searchTerm.toLowerCase();
    return c.className?.toLowerCase().includes(term) || c.homeroomTeacher?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold text-slate-800">Quản lý Lớp Văn hóa</h2><p className="text-slate-500 text-sm">{classes.length} lớp văn hóa</p></div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportTemplate} className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"><Download className="w-4 h-4 mr-2" /> Tải mẫu</button>
           <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleImportExcel} />
           <button onClick={triggerFileUpload} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium">{loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileUp className="w-4 h-4 mr-2" />} Nhập Excel</button>
          <button onClick={() => openModal()} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"><Plus className="w-4 h-4 mr-2" /> Thêm lớp VH</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full max-w-sm">
                <input type="text" placeholder="Tìm kiếm tên lớp hoặc GVCN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
                <th className="px-6 py-4 w-16">STT</th><th className="px-6 py-4">Tên lớp VH</th><th className="px-6 py-4">Giáo viên</th><th className="px-6 py-4">Môn / Ban</th><th className="px-6 py-4">Trạng thái</th><th className="px-6 py-4">Ghi chú</th><th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.map((item: any, index: number) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">{index + 1}</td>
                  <td className="px-6 py-4"><div className="flex items-center"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mr-3"><Library className="w-4 h-4" /></div><span className="text-sm font-bold text-slate-800">{item.className}</span></div></td>
                  <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-700"><User className="w-3 h-3 mr-2 text-slate-400" />{item.homeroomTeacher || '---'}</div>
                      {(item.subjectTeacherIds && item.subjectTeacherIds.length > 0) && (
                          <div className="text-xs text-slate-500 mt-1 flex items-center" title={`${item.subjectTeacherIds.length} giáo viên bộ môn`}>
                              <Users className="w-3 h-3 mr-1" /> +{item.subjectTeacherIds.length} GV bộ môn
                          </div>
                      )}
                  </td>
                  <td className="px-6 py-4"><div className="flex items-center text-sm text-slate-700"><Book className="w-3 h-3 mr-2 text-slate-400" />{item.subject || '---'}</div></td>
                  <td className="px-6 py-4">{item.status === 'Active' ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Đang dạy</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"><XCircle className="w-3 h-3 mr-1" /> Đã nghỉ</span>}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 italic truncate max-w-xs">{item.note || ''}</td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end space-x-2"><button onClick={() => openModal(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button><button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
              {filteredClasses.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">Không tìm thấy dữ liệu lớp văn hóa phù hợp.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật thông tin' : 'Thêm Lớp Văn hóa'}</h3>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-6">
                <form id="academicForm" onSubmit={handleSave} className="space-y-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Tên Lớp VH *</label><input type="text" required value={formData.className} onChange={(e) => setFormData({...formData, className: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="VD: 10A1" /></div>
                
                {/* HOMEROOM TEACHER */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giáo viên chủ nhiệm</label>
                    <select 
                    value={formData.homeroomTeacherId} 
                    onChange={(e) => handleTeacherSelect(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.fullName} ({t.code})</option>
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

                <div><label className="block text-sm font-medium text-slate-700 mb-1">Môn / Ban</label><input type="text" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="VD: Khối cơ bản" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as 'Active' | 'Inactive'})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value="Active">Đang dạy</option><option value="Inactive">Đã nghỉ</option></select></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label><textarea rows={3} value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none"></textarea></div>
                </form>
            </div>
            <div className="flex justify-end p-4 space-x-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" form="academicForm" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"><Save className="w-4 h-4 mr-2" /> {editingId ? 'Cập nhật' : 'Thêm mới'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicClassAdmin;
