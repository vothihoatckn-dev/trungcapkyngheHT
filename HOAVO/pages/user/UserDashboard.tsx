
import React, { useMemo } from 'react';
import { Calendar, Users, FileText, ArrowRight, UserX, AlertTriangle, Loader2, Library, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { data, isSyncing } = useSync();
  const teachers = data.Teachers || [];
  
  // HÀM HELPER: Lấy ngày hiện tại chuẩn theo giờ Việt Nam (YYYY-MM-DD)
  const getTodayString = () => {
      return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  const todayDate = getTodayString();

  const todayDisplay = new Date().toLocaleDateString('vi-VN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh'
  });

  // --- QUAN TRỌNG: Tìm ID Giáo viên tương ứng với User đang đăng nhập ---
  const currentTeacherId = useMemo(() => {
      if (!user) return null;
      // Tìm giáo viên có userId trùng với id tài khoản đang đăng nhập
      const teacher = teachers.find((t: any) => t.userId === user.id);
      return teacher ? teacher.id : null;
  }, [user, teachers]);

  // --- Real-time Calculations ---
  
  // 1. Get classes assigned to this user (Dùng currentTeacherId thay vì user.id)
  const myClasses = useMemo(() => {
     if (!currentTeacherId && user?.role !== 'ADMIN') return [];
     
     // Hàm check quyền cho một lớp
     const checkPermission = (c: any) => {
         // Check GVCN
         if (c.homeroomTeacherId === currentTeacherId) return true;
         // Fallback tên (không khuyến khích nhưng giữ để tương thích data cũ)
         if (c.homeroomTeacher === user?.name) return true;
         
         // Check GV Bộ môn
         if (c.subjectTeacherIds && Array.isArray(c.subjectTeacherIds)) {
             if (c.subjectTeacherIds.includes(currentTeacherId)) return true;
         }
         return false;
     };

     // Lọc Lớp Nghề
     const vClasses = (data.VocationalClasses || []).filter(checkPermission);
     
     // Lọc Lớp Văn Hóa
     const aClasses = (data.AcademicClasses || []).filter(checkPermission);

     return [...vClasses, ...aClasses];
  }, [data.VocationalClasses, data.AcademicClasses, currentTeacherId, user]);

  const displayClasses = myClasses;

  // Helper to count students robustly
  const getStudentCount = (className: string, type: 'VOCATIONAL' | 'ACADEMIC') => {
      return (data.Students || []).filter((s: any) => {
          const sClass = type === 'VOCATIONAL' 
            ? (s.class || '').toString().trim()
            : (s.academicClass || '').toString().trim();
          
          const tClass = (className || '').toString().trim();
          const sStatus = (s.status || 'Đang học').toString().toLowerCase().trim();
          const isActive = sStatus === 'đang học' || sStatus === 'active' || sStatus === 'studying' || sStatus === 'bảo lưu';
          return sClass === tClass && isActive;
      }).length;
  };

  // 2. Calculate Stats
  const stats = useMemo(() => {
     const assignedClassCount = displayClasses.length;
     
     // Calculate today's absence in my classes (Flat Structure)
     let todayAbsence = 0;
     const attendanceLogs = data.Attendance || [];

     attendanceLogs.forEach((log: any) => {
         let logDateRaw = log.date ? log.date.toString().trim() : '';
         let logDate = logDateRaw.length >= 10 ? logDateRaw.substring(0, 10) : logDateRaw;

         if (logDate.includes('/')) {
             const parts = logDate.split('/');
             if (parts.length === 3) logDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
         }

         if (logDate === todayDate) {
             const logClassId = (log.classId || '').toString().trim();
             const isMyClass = displayClasses.some((c: any) => {
                 const myClassId = (c.className || c.id || '').toString().trim();
                 return myClassId === logClassId;
             });

             if (isMyClass) {
                 if (log.status && log.status !== 'PRESENT') {
                     todayAbsence++;
                 }
             }
         }
     });

     return [
        { label: 'Lớp phụ trách', value: assignedClassCount.toString().padStart(2, '0'), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Vắng hôm nay', value: todayAbsence.toString().padStart(2, '0'), icon: UserX, color: 'text-red-600', bg: 'bg-red-100' },
        { label: 'Báo cáo đã gửi', value: (data.Behavior || []).filter((b: any) => b.reportedBy === user?.name).length.toString().padStart(2, '0'), icon: FileText, color: 'text-green-600', bg: 'bg-green-100' },
     ];
  }, [displayClasses, data.Attendance, data.Behavior, user, todayDate]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tổng quan</h2>
          <p className="text-slate-500 capitalize">{todayDisplay} {isSyncing && <span className="text-blue-500 text-xs inline-flex items-center ml-2"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Đang đồng bộ...</span>}</p>
        </div>
        <Link to="/user/reports" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-sm font-medium">
          <FileText className="w-4 h-4 mr-2" />
          Tạo báo cáo mới
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
            <div className={`p-4 rounded-full ${stat.bg} ${stat.color} mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-600" />
              Lớp giảng dạy
            </h3>
            <Link to="/user/classes" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center">
              Xem tất cả <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {displayClasses.slice(0, 5).map((cls: any, index: number) => {
                const isVocational = !!cls.vocational; // Phân biệt dựa trên field
                return (
                  <div key={index} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls.status === 'Graduated' || cls.status === 'Inactive' ? 'bg-slate-100 text-slate-600' : 'bg-green-100 text-green-800'}`}>
                        {cls.status === 'Graduated' ? 'Đã tốt nghiệp' : cls.status === 'Inactive' ? 'Đã nghỉ' : 'Đang học'}
                      </span>
                      <span className="text-sm text-slate-500 font-medium">Sĩ số: {getStudentCount(cls.className, isVocational ? 'VOCATIONAL' : 'ACADEMIC')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-bold text-slate-800 flex items-center">
                            {isVocational ? <BookOpen className="w-4 h-4 mr-2 text-primary-500"/> : <Library className="w-4 h-4 mr-2 text-indigo-500"/>}
                            {cls.className}
                        </h4>
                        <p className="text-slate-600 text-sm">{cls.vocational || cls.subject}</p>
                      </div>
                      <Link 
                        to={`/user/attendance/${cls.className}`}
                        className="px-3 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-600 hover:bg-white hover:border-primary-500 hover:text-primary-600 transition-all"
                      >
                        Điểm danh
                      </Link>
                    </div>
                  </div>
                );
            })}
            {displayClasses.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                    Bạn chưa được phân công lớp giảng dạy nào.
                    <br/><span className="text-xs text-slate-400 mt-2 block">(Nếu bạn đã được phân công, vui lòng kiểm tra xem tài khoản User đã liên kết với Giáo viên chưa)</span>
                </div>
            )}
          </div>
        </div>

        {/* Quick Reports/Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
             <h3 className="font-bold text-slate-800 flex items-center">
               <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
               Vi phạm gần đây (Trong các lớp của bạn)
             </h3>
          </div>
          <div className="p-6">
             <div className="space-y-4">
                {(data.Behavior || [])
                    .filter((b: any) => displayClasses.some((c:any) => c.className === b.classId) && b.type === 'VIOLATION')
                    .slice(0, 3)
                    .map((b: any, idx: number) => {
                        const studentName = (data.Students || []).find((s:any) => s.id === b.studentCode)?.name || b.studentCode;
                        return (
                            <div key={idx} className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                <div className="flex items-start">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800">{studentName} ({b.classId})</h4>
                                        <p className="text-xs text-slate-600 mt-1">{b.description} - Ngày: {b.date.split('-').reverse().join('/')}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
                {(data.Behavior || []).filter((b: any) => displayClasses.some((c:any) => c.className === b.classId) && b.type === 'VIOLATION').length === 0 && (
                     <p className="text-center text-slate-500 italic">Không có vi phạm nào gần đây.</p>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
