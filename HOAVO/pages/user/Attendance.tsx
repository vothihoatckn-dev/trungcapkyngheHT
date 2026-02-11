
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, CheckCircle, XCircle, Clock, Search, Calendar, UserCheck, Sun, Moon, User, AlertTriangle, Lock, Info, Loader2, BookOpen, Library, ClipboardList } from 'lucide-react';
import { useSync } from '../../context/SyncContext'; 
import { useAuth } from '../../context/AuthContext';

type AttendanceStatus = 'PRESENT' | 'EXCUSED' | 'UNEXCUSED';

interface Student {
  id: string; 
  recordId?: string; 
  code?: string;
  name: string;
  classDisplay: string; 
  dob?: string;
  status: AttendanceStatus;
  note: string;
}

const Attendance: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data, saveBatch } = useSync();
  const allStudents = data.Students || [];
  const allTeachers = data.Teachers || [];
  const vocationalClasses = data.VocationalClasses || [];
  const academicClasses = data.AcademicClasses || [];
  const attendanceLogs = data.Attendance || []; 
  
  // 1. Xác định thông tin lớp học và loại lớp
  const { currentClass, isAcademic } = useMemo(() => {
      const vClass = vocationalClasses.find((c: any) => c.className === classId || c.id === classId);
      if (vClass) return { currentClass: vClass, isAcademic: false };

      const aClass = academicClasses.find((c: any) => c.className === classId || c.id === classId);
      if (aClass) return { currentClass: aClass, isAcademic: true };

      return { currentClass: null, isAcademic: false };
  }, [vocationalClasses, academicClasses, classId]);

  // --- QUAN TRỌNG: Lấy Teacher ID từ User ID ---
  const currentTeacherId = useMemo(() => {
      if (!user) return null;
      const teacher = allTeachers.find((t: any) => t.userId === user.id);
      return teacher ? teacher.id : null;
  }, [allTeachers, user]);

  // Kiểm tra quyền: Admin HOẶC Giáo viên chủ nhiệm HOẶC Giáo viên bộ môn của lớp này
  const canEdit = useMemo(() => {
      if (!user) return false;
      if (user.role === 'ADMIN') return true;
      if (!currentClass) return false;
      
      // Nếu không tìm thấy Teacher profile liên kết, không cho sửa
      if (!currentTeacherId) return false;

      // 1. Check Chủ nhiệm
      const isHomeroom = currentClass.homeroomTeacherId === currentTeacherId;
      
      // 2. Check Giáo viên bộ môn (So sánh Teacher ID với subjectTeacherIds)
      const isSubjectTeacher = currentClass.subjectTeacherIds && 
                               Array.isArray(currentClass.subjectTeacherIds) && 
                               currentClass.subjectTeacherIds.includes(currentTeacherId);

      return isHomeroom || isSubjectTeacher;
  }, [user, currentClass, currentTeacherId]);

  // State
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [session, setSession] = useState<'Sáng' | 'Chiều'>('Sáng');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tự động chọn giáo viên
  useEffect(() => {
      if (currentClass) {
           // Nếu là GV đang đăng nhập và có quyền edit, chọn chính mình làm mặc định
           if (canEdit && user?.role === 'TEACHER' && currentTeacherId) {
               setSelectedTeacher(currentTeacherId);
           } 
           // Fallback chọn GVCN
           else if (currentClass.homeroomTeacherId) {
               setSelectedTeacher(currentClass.homeroomTeacherId);
           }
      }
  }, [canEdit, currentTeacherId, user, currentClass]);

  // Logic Load Dữ liệu
  useEffect(() => {
    if (classId) {
      let classStudents = [];
      if (isAcademic) {
          classStudents = allStudents.filter((s: any) => s.academicClass === classId);
      } else {
          classStudents = allStudents.filter((s: any) => s.class === classId);
      }
      
      const existingLogs = attendanceLogs.filter((log: any) => 
          (log.classId === classId || log.className === classId) && 
          log.date === date && 
          log.session === session
      );

      setHasExistingData(existingLogs.length > 0);

      if (existingLogs.length > 0 && existingLogs[0].teacherId) {
          setSelectedTeacher(existingLogs[0].teacherId);
      }

      const initialStudents: Student[] = classStudents.map((s: any) => {
          const log = existingLogs.find((l: any) => l.studentId === s.id);
          return {
              id: s.id,
              recordId: log ? log.id : undefined,
              code: s.id,
              name: s.name,
              classDisplay: isAcademic ? (s.class || '---') : (s.academicClass || '---'),
              dob: s.dob,
              status: log ? log.status : 'PRESENT',
              note: log ? log.note : ''
          };
      });
      
      setStudents(initialStudents);
    }
  }, [classId, isAcademic, allStudents, attendanceLogs, date, session]); 

  const updateStatus = (id: string, status: AttendanceStatus) => {
    if (!canEdit) return; 
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const updateNote = (id: string, note: string) => {
    if (!canEdit) return; 
    setStudents(prev => prev.map(s => s.id === id ? { ...s, note } : s));
  };

  const setAllStatus = (status: AttendanceStatus) => {
      if (!canEdit) return;
      setStudents(prev => prev.map(s => ({ ...s, status })));
  }

  const handleSave = async () => {
    if (!canEdit) return;

    if (!selectedTeacher) {
        alert("Vui lòng chọn giáo viên điểm danh.");
        return;
    }

    setIsSaving(true);
    
    const recordsToSave = students.map(s => {
        const recordId = s.recordId || `ATT-${classId}-${date}-${session}-${s.id}`;
        return {
            id: recordId,
            date: date,
            session: session,
            classId: classId,
            className: currentClass?.className || classId,
            teacherId: selectedTeacher,
            studentId: s.id,
            studentName: s.name,
            studentCode: s.code,
            status: s.status,
            note: s.note,
            updatedAt: new Date().toISOString()
        };
    });

    await saveBatch('Attendance', recordsToSave);
    
    setIsSaving(false);
    alert(`Đã lưu điểm danh lớp ${classId} (${session} - ${date}) thành công!`);
    navigate('/user/classes');
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    present: students.filter(s => s.status === 'PRESENT').length,
    excused: students.filter(s => s.status === 'EXCUSED').length,
    unexcused: students.filter(s => s.status === 'UNEXCUSED').length,
  };

  const absentStudents = useMemo(() => {
    return students.filter(s => s.status === 'EXCUSED' || s.status === 'UNEXCUSED');
  }, [students]);

  const vocationalTeacherName = useMemo(() => {
    if (!selectedTeacher) return 'Chưa chọn';
    return allTeachers.find((t: any) => t.id === selectedTeacher)?.fullName || 'Không tìm thấy';
  }, [selectedTeacher, allTeachers]);

  const homeroomTeacherName = currentClass?.homeroomTeacher || 'Chưa có';

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-20 transition-all">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
           <div className="flex items-center">
              <button onClick={() => navigate('/user/classes')} className="mr-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div>
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                      {isAcademic ? <Library className="w-6 h-6 mr-2 text-indigo-600"/> : <BookOpen className="w-6 h-6 mr-2 text-primary-600"/>}
                      Điểm danh: {classId}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                    <span className="flex items-center"><UserCheck className="w-4 h-4 mr-1" /> {students.length} Học sinh</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 font-medium">
                        {isAcademic ? 'Lớp Văn Hóa' : 'Lớp Nghề'}
                    </span>
                    {hasExistingData && (
                        <span className="flex items-center text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            <Info className="w-3 h-3 mr-1" /> Đang cập nhật lại
                        </span>
                    )}
                    {!canEdit && (
                        <span className="flex items-center text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <Lock className="w-3 h-3 mr-1" /> Chỉ xem
                        </span>
                    )}
                  </div>
              </div>
           </div>
        </div>
        
        {!canEdit && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center text-amber-800 text-sm">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                {!currentTeacherId ? "Tài khoản của bạn chưa được liên kết với hồ sơ Giáo viên." : "Bạn không phải là GVCN hoặc GV bộ môn của lớp này."}
            </div>
        )}

        {/* Controls Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 p-4 rounded-lg border ${canEdit ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200 opacity-80 pointer-events-none'}`}>
           <div className="md:col-span-3 relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Ngày</label>
              <div className="relative">
                 <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:bg-slate-200" />
                 <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
           </div>

           <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Buổi</label>
              <div className="relative">
                <select value={session} onChange={(e) => setSession(e.target.value as any)} disabled={!canEdit} className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none disabled:bg-slate-200">
                  <option value="Sáng">Sáng</option><option value="Chiều">Chiều</option>
                </select>
                {session === 'Sáng' ? <Sun className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" /> : <Moon className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />}
              </div>
           </div>

           <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Giáo viên</label>
              <div className="relative">
                 {user?.role === 'TEACHER' ? (
                     <input 
                         type="text" 
                         value={allTeachers.find(t => t.id === selectedTeacher)?.fullName || (currentClass?.homeroomTeacher) || '---'}
                         disabled
                         className="w-full pl-10 pr-4 py-2 bg-slate-200 border border-slate-300 rounded-lg text-sm text-slate-600 focus:outline-none cursor-not-allowed font-medium"
                     />
                 ) : (
                    <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} disabled={!canEdit} className="w-full pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none">
                        <option value="">-- Chọn GV --</option>
                        {allTeachers.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.fullName}</option>
                        ))}
                    </select>
                 )}
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
           </div>

           <div className="md:col-span-3 flex items-end">
              <button 
                onClick={handleSave} 
                disabled={!canEdit || isSaving}
                className={`w-full flex items-center justify-center px-6 py-2 rounded-lg font-bold shadow-md transition-all transform h-[38px] ${canEdit ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-primary-200' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
              >
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}
                {isSaving ? 'Đang lưu...' : (hasExistingData ? 'Cập nhật' : 'Lưu mới')}
              </button>
           </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100">
            <div className="flex space-x-2 md:space-x-6 text-sm overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                <div className="flex items-center text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100 whitespace-nowrap"><CheckCircle className="w-4 h-4 mr-2" /> Có mặt: {stats.present}</div>
                <div className="flex items-center text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-100 whitespace-nowrap"><Clock className="w-4 h-4 mr-2" /> Có phép: {stats.excused}</div>
                <div className="flex items-center text-red-700 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100 whitespace-nowrap"><XCircle className="w-4 h-4 mr-2" /> K.Phép: {stats.unexcused}</div>
            </div>
            {canEdit && (
                <button onClick={() => setAllStatus('PRESENT')} className="text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline whitespace-nowrap">Đặt tất cả "Có mặt"</button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
             <div className="relative w-full max-w-sm">
                 <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm kiếm tên..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white" />
                 <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
             </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200 shadow-sm">
                <th className="px-4 py-3 font-semibold w-12 bg-slate-50">STT</th>
                <th className="px-4 py-3 font-semibold min-w-[180px] bg-slate-50">Học sinh</th>
                <th className="px-4 py-3 font-semibold w-24 bg-slate-50">{isAcademic ? 'Lớp Nghề' : 'Lớp VH'}</th>
                <th className="px-4 py-3 font-semibold text-center min-w-[280px] bg-slate-50">Điểm danh</th>
                <th className="px-4 py-3 font-semibold min-w-[150px] bg-slate-50">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student, index) => (
                <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${student.status !== 'PRESENT' ? 'bg-slate-50/50' : ''}`}>
                  <td className="px-4 py-3 text-sm text-slate-500 text-center">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{student.name}</span>
                        <span className="text-xs text-slate-400">{student.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{student.classDisplay}</span></td>
                  <td className="px-4 py-3">
                    <div className={`flex justify-center items-center gap-2 ${!canEdit ? 'opacity-60 pointer-events-none' : ''}`}>
                        <button onClick={() => updateStatus(student.id, 'PRESENT')} className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg border transition-all duration-200 ${student.status === 'PRESENT' ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-green-300 hover:text-green-500'}`} title="Có mặt"><CheckCircle className="w-5 h-5" /><span className="ml-1 text-xs font-medium hidden lg:inline">Có mặt</span></button>
                        <button onClick={() => updateStatus(student.id, 'EXCUSED')} className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg border transition-all duration-200 ${student.status === 'EXCUSED' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-amber-300 hover:text-amber-500'}`} title="Vắng có phép"><Clock className="w-5 h-5" /><span className="ml-1 text-xs font-medium hidden lg:inline">Có phép</span></button>
                        <button onClick={() => updateStatus(student.id, 'UNEXCUSED')} className={`flex-1 flex items-center justify-center py-2 px-2 rounded-lg border transition-all duration-200 ${student.status === 'UNEXCUSED' ? 'bg-red-500 text-white border-red-500 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-red-300 hover:text-red-500'}`} title="Vắng không phép"><XCircle className="w-5 h-5" /><span className="ml-1 text-xs font-medium hidden lg:inline">K.Phép</span></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" disabled={!canEdit} value={student.note} onChange={(e) => updateNote(student.id, e.target.value)} placeholder={student.status === 'PRESENT' ? '...' : 'Nhập lý do...'} className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${student.status !== 'PRESENT' ? 'bg-white border-primary-200' : 'bg-slate-50 border-slate-200'} ${!canEdit ? 'bg-slate-100 cursor-not-allowed' : ''}`} />
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Chưa có học sinh nào trong lớp này hoặc đang tải dữ liệu.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Absence Summary Section */}
      {absentStudents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-800">Tổng hợp vắng mặt</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Lớp nghề</p>
                <p className="font-bold text-slate-800">{classId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Ngày dạy</p>
                <p className="font-bold text-slate-800">{date.split('-').reverse().join('/')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Buổi</p>
                <p className="font-bold text-slate-800">{session}</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-slate-500 font-semibold uppercase">GV dạy nghề</p>
                <p className="font-bold text-slate-800 truncate">{vocationalTeacherName}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-semibold uppercase">GV chủ nhiệm</p>
                <p className="font-bold text-slate-800 truncate">{homeroomTeacherName}</p>
              </div>
              <div className="col-span-full text-center pt-3 mt-3 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-500">TỔNG LƯỢT VẮNG: <span className="text-2xl font-bold text-red-600 ml-2">{absentStudents.length}</span></p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100">
                  <tr className="text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold w-12 text-center">STT</th>
                    <th className="px-4 py-3 font-semibold">Tên Học sinh</th>
                    <th className="px-4 py-3 font-semibold">Lớp Văn hóa</th>
                    <th className="px-4 py-3 font-semibold">GVCN Văn Hóa</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Ghi chú / Lý do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {absentStudents.map((student, index) => {
                      const academicClassInfo = academicClasses.find((ac: any) => ac.className === student.classDisplay);
                      const academicTeacherName = academicClassInfo ? academicClassInfo.homeroomTeacher : '---';

                      return (
                        <tr key={student.id}>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">{index + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-sm text-slate-800">{student.name}</p>
                            <p className="text-xs text-slate-400">{student.code}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{student.classDisplay}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{academicTeacherName}</td>
                          <td className="px-4 py-3">
                            {student.status === 'EXCUSED' 
                              ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Có phép</span>
                              : <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Không phép</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 italic">{student.note || '...'}</td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
