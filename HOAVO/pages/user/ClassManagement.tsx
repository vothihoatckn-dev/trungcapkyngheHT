
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, ChevronRight, Filter, BookOpen, Building2, UserCircle, Loader2, GraduationCap, Eye, Library } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';

const ClassManagement: React.FC = () => {
  const { data, isSyncing } = useSync();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'VOCATIONAL' | 'ACADEMIC'>('VOCATIONAL');
  const [selectedVocation, setSelectedVocation] = useState('');

  // Lấy dữ liệu thực từ Context
  const vocationalClasses = data.VocationalClasses || [];
  const academicClasses = data.AcademicClasses || [];
  const students = data.Students || [];
  const vocationsData = data.Vocations || [];
  const departmentsData = data.Departments || [];
  const teachers = data.Teachers || [];

  // --- QUAN TRỌNG: Tìm ID Giáo viên từ User đang đăng nhập ---
  const currentTeacherId = useMemo(() => {
      if (!user) return null;
      const teacher = teachers.find((t: any) => t.userId === user.id);
      return teacher ? teacher.id : null;
  }, [user, teachers]);

  // --- LOGIC LỚP NGHỀ ---
  const availableVocations = useMemo(() => {
      const distinct = Array.from(new Set(vocationalClasses.map((c: any) => c.vocational))).filter(Boolean);
      return distinct.sort();
  }, [vocationalClasses]);

  const filteredVocationalClasses = useMemo(() => {
      return vocationalClasses.filter((cls: any) => {
          if (selectedVocation && cls.vocational !== selectedVocation) return false;
          return true;
      });
  }, [vocationalClasses, selectedVocation]);

  // --- LOGIC LỚP VĂN HÓA ---
  const filteredAcademicClasses = useMemo(() => {
      return academicClasses;
  }, [academicClasses]);


  // Helper để lấy thông tin bổ sung cho từng lớp
  const getClassInfo = (cls: any, type: 'VOCATIONAL' | 'ACADEMIC') => {
      // Tính sĩ số
      const count = students.filter((s: any) => {
          const sClass = type === 'VOCATIONAL' 
            ? (s.class || s.className || '').toString().trim()
            : (s.academicClass || '').toString().trim();
            
          const targetClass = (cls.className || '').toString().trim();
          
          const status = (s.status || 'Đang học').toString().toLowerCase().trim();
          const isActive = status === 'đang học' || status === 'active' || status === 'studying' || status === 'bảo lưu';

          return sClass === targetClass && isActive;
      }).length;
      
      let subtitle = '';
      if (type === 'VOCATIONAL') {
          const vocObj = vocationsData.find((v: any) => v.name === cls.vocational);
          const deptName = vocObj ? departmentsData.find((d: any) => d.id === vocObj.departmentId)?.name : 'Chưa phân khoa';
          subtitle = deptName;
      } else {
          subtitle = cls.subject ? `Môn/Ban: ${cls.subject}` : 'Lớp văn hóa';
      }
      
      // Kiểm tra quyền chỉnh sửa (Điểm danh)
      // Dùng currentTeacherId thay vì user.id
      const isHomeroom = currentTeacherId && cls.homeroomTeacherId === currentTeacherId;
      const isSubjectTeacher = currentTeacherId && 
                               cls.subjectTeacherIds && 
                               Array.isArray(cls.subjectTeacherIds) && 
                               cls.subjectTeacherIds.includes(currentTeacherId);
      
      const canEdit = user?.role === 'ADMIN' || isHomeroom || isSubjectTeacher;

      return { count, subtitle, canEdit, isHomeroom, isSubjectTeacher };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý lớp học</h2>
          <p className="text-slate-500">Danh sách các lớp học hiện có trên hệ thống {isSyncing && <span className="text-blue-500 text-xs ml-2 inline-flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Đang đồng bộ...</span>}</p>
        </div>
        
        {activeTab === 'VOCATIONAL' && (
            <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
                value={selectedVocation}
                onChange={(e) => setSelectedVocation(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
            >
                <option value="">Tất cả các nghề</option>
                {availableVocations.map((v: string) => (
                    <option key={v} value={v}>{v}</option>
                ))}
            </select>
            </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
            <button
                onClick={() => setActiveTab('VOCATIONAL')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === 'VOCATIONAL'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
                <BookOpen className="w-4 h-4 mr-2" />
                Lớp Nghề ({filteredVocationalClasses.length})
            </button>
            <button
                onClick={() => setActiveTab('ACADEMIC')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                    activeTab === 'ACADEMIC'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
                <Library className="w-4 h-4 mr-2" />
                Lớp Văn hóa ({filteredAcademicClasses.length})
            </button>
        </nav>
      </div>

      {/* Class Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'VOCATIONAL' ? filteredVocationalClasses : filteredAcademicClasses).length > 0 ? (
            (activeTab === 'VOCATIONAL' ? filteredVocationalClasses : filteredAcademicClasses).map((cls: any) => {
                const { count, subtitle, canEdit, isHomeroom, isSubjectTeacher } = getClassInfo(cls, activeTab);
                const isGraduated = cls.status === 'Graduated' || cls.status === 'Inactive';
                const mainColor = activeTab === 'VOCATIONAL' ? 'primary' : 'indigo';
                const mainBg = activeTab === 'VOCATIONAL' ? 'bg-primary-50' : 'bg-indigo-50';
                const mainText = activeTab === 'VOCATIONAL' ? 'text-primary-700' : 'text-indigo-700';

                return (
                    <Link 
                        key={cls.id} 
                        to={`/user/attendance/${cls.className}`}
                        className={`group block bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden relative ${canEdit ? `border-${mainColor}-300 ring-1 ring-${mainColor}-100` : 'border-slate-200 hover:shadow-md hover:border-slate-300'}`}
                    >
                        {isHomeroom && user?.role !== 'ADMIN' && (
                            <div className={`absolute top-0 right-0 ${activeTab === 'VOCATIONAL' ? 'bg-primary-600' : 'bg-indigo-600'} text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10`}>
                                Lớp chủ nhiệm
                            </div>
                        )}
                        {!isHomeroom && isSubjectTeacher && user?.role !== 'ADMIN' && (
                            <div className={`absolute top-0 right-0 ${activeTab === 'VOCATIONAL' ? 'bg-green-600' : 'bg-green-600'} text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg z-10`}>
                                Lớp bộ môn
                            </div>
                        )}
                        
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold ${isGraduated ? 'bg-slate-100 text-slate-600' : `${mainBg} ${mainText}`}`}>
                                    {activeTab === 'VOCATIONAL' ? <BookOpen className="w-4 h-4 mr-2" /> : <Library className="w-4 h-4 mr-2" />}
                                    {cls.className}
                                </div>
                                {isGraduated && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                        <GraduationCap className="w-3 h-3 mr-1" /> {activeTab === 'VOCATIONAL' ? 'Đã TN' : 'Đã nghỉ'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="mb-4">
                                <h3 className={`text-lg font-bold text-slate-800 group-hover:${activeTab === 'VOCATIONAL' ? 'text-primary-600' : 'text-indigo-600'} transition-colors mb-1 truncate`} title={cls.vocational || cls.className}>
                                    {activeTab === 'VOCATIONAL' ? cls.vocational : 'Lớp Văn hóa'}
                                </h3>
                                <div className="flex items-center text-sm text-slate-500">
                                    <Building2 className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{subtitle}</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="space-y-1.5">
                                    <div className="flex items-center text-sm text-slate-600">
                                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                                        <span>Sĩ số: <strong>{count}</strong></span>
                                    </div>
                                    <div className="flex items-center text-sm text-slate-600" title={`GVCN: ${cls.homeroomTeacher || 'Chưa phân công'}`}>
                                        <UserCircle className="w-4 h-4 mr-2 text-slate-400" />
                                        <span className="truncate max-w-[120px]">{cls.homeroomTeacher || 'GVCN: ---'}</span>
                                    </div>
                                </div>
                                
                                {canEdit ? (
                                    <div className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${isGraduated ? 'text-slate-400 bg-slate-50' : `${mainText} ${mainBg} group-hover:bg-${mainColor}-600 group-hover:text-white`}`}>
                                        {isGraduated ? 'Xem lại' : 'Điểm danh'}
                                        <ChevronRight className="w-4 h-4 ml-1 transition-transform" />
                                    </div>
                                ) : (
                                    <div className="flex items-center text-sm font-medium px-3 py-1.5 rounded-lg text-slate-500 bg-slate-50 group-hover:bg-slate-100 transition-all">
                                        <Eye className="w-4 h-4 mr-1.5" />
                                        Xem DS
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })
        ) : (
            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">
                    {activeTab === 'VOCATIONAL' && vocationalClasses.length === 0 ? "Đang tải hoặc chưa có lớp nghề." : ""}
                    {activeTab === 'ACADEMIC' && academicClasses.length === 0 ? "Chưa có lớp văn hóa nào." : ""}
                    {(vocationalClasses.length > 0 || academicClasses.length > 0) ? "Không tìm thấy lớp học phù hợp." : ""}
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
