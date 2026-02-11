import React, { useState, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Filter, X, Save, ChevronDown, FileUp, Download, Loader2 } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { useSync } from '../../context/SyncContext';

interface StudentData {
  id: string;
  name: string;
  class: string;
  academicClass: string;
  gender: 'Nam' | 'Nữ';
  dob: string;
  contact: string;
  status: 'Đang học' | 'Bảo lưu' | 'Đã nghỉ';
}

const StudentAdmin: React.FC = () => {
  const { data, saveRecord, removeRecord, isSyncing } = useSync();
  // Lấy dữ liệu trực tiếp từ Context (đã cache)
  const students = data.Students || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Lấy danh sách lớp nghề và lớp văn hóa để dropdown
  const vocationalClasses = data.VocationalClasses.length > 0 
    ? data.VocationalClasses.map(c => c.className)
    : [];
  
  // Lấy danh sách lớp văn hóa
  const academicClasses = data.AcademicClasses || [];

  const [formData, setFormData] = useState<Omit<StudentData, 'id'>>({
    name: '', class: vocationalClasses[0] || '', academicClass: '', gender: 'Nam', dob: '', contact: '', status: 'Đang học'
  });

  // --- Handlers ---
  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này không?')) {
      await removeRecord('Students', id);
    }
  };

  const openModal = (student?: StudentData) => {
    if (student) {
      setEditingId(student.id);
      
      // FIX TIMEZONE CHO INPUT: 
      // Chuyển đổi ngày ISO (VD: ...T17:00...) sang YYYY-MM-DD theo giờ Việt Nam
      let dobValue = '';
      if (student.dob) {
          if (student.dob.includes('T') || student.dob.includes('Z')) {
              try {
                  dobValue = new Date(student.dob).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
              } catch (e) {
                  dobValue = student.dob.substring(0, 10);
              }
          } else {
              dobValue = student.dob;
          }
      }

      setFormData({
        name: student.name, class: student.class, academicClass: student.academicClass || '',
        gender: student.gender, dob: dobValue, contact: student.contact, status: student.status
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', class: vocationalClasses[0] || '', academicClass: '', gender: 'Nam', dob: '', contact: '', status: 'Đang học'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true); // Hiển thị spinner cục bộ nút Save
    
    // Tạo ID an toàn hơn cho nhập thủ công
    const newId = `HS${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

    const record = {
       id: editingId || newId,
       ...formData
    };

    await saveRecord('Students', record, !!editingId);
    setProcessing(false);
    closeModal();
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setProcessing(true);
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const excelData = utils.sheet_to_json(ws);

        if (excelData.length === 0) { alert("File Excel không có dữ liệu!"); setProcessing(false); return; }

        // Bulk insert (có thể tối ưu bằng API createMany nếu Backend hỗ trợ, hiện tại loop)
        let count = 0;
        const baseTimestamp = Date.now(); // Lấy thời gian gốc một lần

        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i] as any;
            
            // LOGIC SỬA LỖI: Tạo ID duy nhất bằng cách kết hợp Timestamp + Index vòng lặp
            const uniqueId = `HS${baseTimestamp}${(i + 1).toString().padStart(4, '0')}`;

            const newStudent = {
                id: uniqueId,
                name: row["Họ và Tên"] || "Chưa nhập tên",
                class: row["Lớp Nghề"] || (vocationalClasses[0] || ""),
                academicClass: row["Lớp Văn Hóa"] || "",
                gender: (row["Giới tính"] === "Nam" || row["Giới tính"] === "Nữ") ? row["Giới tính"] : "Nam",
                dob: row["Ngày sinh"] || "",
                contact: row["Liên hệ"] ? String(row["Liên hệ"]) : "",
                status: (row["Trạng thái"] === "Đang học" || row["Trạng thái"] === "Bảo lưu") ? row["Trạng thái"] : "Đang học"
            };
            saveRecord('Students', newStudent, false);
            count++;
        }
        alert(`Đã thêm ${count} học sinh vào hàng đợi đồng bộ!`);
      } catch (error) {
        console.error(error);
        alert("Lỗi khi nhập liệu.");
      } finally {
        setProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportTemplate = () => {
      const data = [{"Họ và Tên": "Nguyễn Văn Mẫu", "Lớp Nghề": "CNT K17A", "Lớp Văn Hóa": "10A1", "Giới tính": "Nam", "Ngày sinh": "2008-01-01", "Liên hệ": "0987654321", "Trạng thái": "Đang học"}];
      const ws = utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Mau_Nhap_Hoc_Sinh");
      writeFile(wb, "Mau_Danh_Sach_Hoc_Sinh.xlsx");
  };

  // Helper hiển thị ngày sinh chuẩn DD/MM/YYYY
  const formatDOB = (dobString: string) => {
      if (!dobString) return '';
      
      // Trường hợp 1: Dữ liệu là ISO string (2008-05-11T17:00:00.000Z)
      if (dobString.includes('T') || dobString.includes('Z')) {
          try {
              // Chuyển về giờ VN và format DD/MM/YYYY (en-GB support DD/MM/YYYY)
              return new Date(dobString).toLocaleDateString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' });
          } catch(e) {
              return dobString;
          }
      }

      // Trường hợp 2: Dữ liệu là chuỗi YYYY-MM-DD
      const parts = dobString.split('-');
      if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dobString;
  }

  const filteredStudents = students.filter((student) => {
    const sName = student.name?.toLowerCase() || '';
    const sId = student.id?.toString().toLowerCase() || '';
    const sClass = student.class?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();
    
    const matchesSearch = sName.includes(term) || sId.includes(term) || sClass.includes(term);
    const matchesClass = selectedClass === '' || student.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Đang học': return 'bg-green-100 text-green-700';
      case 'Bảo lưu': return 'bg-amber-100 text-amber-700';
      case 'Đã nghỉ': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý học sinh</h2>
          <p className="text-slate-500">
             {students.length} học sinh • {isSyncing ? 'Đang đồng bộ...' : 'Dữ liệu đã sẵn sàng'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={handleExportTemplate} className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"><Download className="w-4 h-4 mr-2" /> Tải mẫu</button>
           <input type="file" accept=".xlsx, .xls" hidden ref={fileInputRef} onChange={handleImportExcel} />
           <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">{processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <FileUp className="w-4 h-4 mr-2" />} Nhập Excel</button>
           <button onClick={() => openModal()} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"><Plus className="w-4 h-4 mr-2" /> Thêm mới</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <div className="relative w-full md:w-auto">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full md:w-48 pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none">
                <option value="">Tất cả lớp nghề</option>
                {vocationalClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto relative min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4 font-semibold">Mã HS</th>
                <th className="px-6 py-4 font-semibold">Họ và Tên</th>
                <th className="px-6 py-4 font-semibold">Lớp Nghề</th>
                <th className="px-6 py-4 font-semibold">Lớp VH</th>
                <th className="px-6 py-4 font-semibold">Giới tính</th>
                <th className="px-6 py-4 font-semibold">Ngày sinh</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{student.id}</td>
                  <td className="px-6 py-4"><div className="text-sm font-bold text-slate-800">{student.name}</div><div className="text-xs text-slate-500">{student.contact}</div></td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.class}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-medium">{student.academicClass}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{student.gender}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDOB(student.dob)}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(student.status)}`}>{student.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => openModal(student)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                      <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDelete(student.id)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Không tìm thấy dữ liệu.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Cập nhật' : 'Thêm học sinh'}</h3>
              <button onClick={closeModal} className="p-1 rounded-full hover:bg-slate-200 text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên *</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Lớp Nghề</label><select value={formData.class} onChange={(e) => setFormData({...formData, class: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">{vocationalClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}</select></div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lớp Văn Hóa</label>
                    <select 
                        value={formData.academicClass} 
                        onChange={(e) => setFormData({...formData, academicClass: e.target.value})} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                        <option value="">-- Chọn lớp VH --</option>
                        {academicClasses.map((cls: any) => (
                            <option key={cls.id} value={cls.className}>{cls.className}</option>
                        ))}
                    </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Ngày sinh</label><input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Giới tính</label><select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Liên hệ</label><input type="text" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                 <div><label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"><option value="Đang học">Đang học</option><option value="Bảo lưu">Bảo lưu</option><option value="Đã nghỉ">Đã nghỉ</option></select></div>
              </div>
              <div className="flex justify-end pt-2 space-x-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy bỏ</button>
                <button type="submit" disabled={processing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center">{processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />} {editingId ? 'Cập nhật' : 'Lưu lại'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StudentAdmin;