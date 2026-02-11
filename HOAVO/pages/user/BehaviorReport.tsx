
import React, { useState, useEffect, useMemo } from 'react';
import { Send, AlertTriangle, Award, FileText, Calendar, Loader2 } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { useAuth } from '../../context/AuthContext';

const BehaviorReport: React.FC = () => {
  const { data, saveRecord } = useSync();
  const { user } = useAuth();
  
  // Lấy dữ liệu thực từ Context
  const vocationalClasses = data.VocationalClasses || [];
  const students = data.Students || [];
  const teachers = data.Teachers || [];

  // Tìm giáo viên liên kết với tài khoản đang đăng nhập
  const linkedTeacher = useMemo(() => {
      return teachers.find((t: any) => t.userId === user?.id);
  }, [teachers, user]);

  const [reportType, setReportType] = useState<'VIOLATION' | 'REWARD'>('VIOLATION');
  // Date default to Vietnam Time
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động chọn giáo viên nếu là UserRole.TEACHER
  useEffect(() => {
      if (user?.role === 'TEACHER') {
          if (linkedTeacher) {
              setSelectedTeacher(linkedTeacher.id);
          }
      }
  }, [user, linkedTeacher]);

  // Lọc học sinh theo lớp đã chọn
  const availableStudents = students.filter((s: any) => s.class === selectedClass);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!selectedClass || !selectedStudent || !selectedTeacher || !date) {
          alert("Vui lòng điền đầy đủ các trường thông tin bắt buộc!");
          return;
      }
      
      setIsSubmitting(true);
      
      const teacherName = teachers.find((t: any) => t.id === selectedTeacher)?.fullName || 'GV';
      const studentObj = students.find((s: any) => s.id === selectedStudent);
      const studentCode = studentObj ? (studentObj.id) : 'UNKNOWN';

      const newReport = {
          id: `BEH-${Date.now()}`,
          studentCode: studentCode,
          classId: selectedClass,
          date: date,
          type: reportType,
          description: description,
          reportedBy: teacherName
      };

      await saveRecord('Behavior', newReport);
      
      setIsSubmitting(false);
      alert(`Báo cáo đã được gửi thành công!\n- Loại: ${reportType === 'VIOLATION' ? 'Vi phạm' : 'Khen thưởng'}\n- Học sinh: ${studentObj?.name}`);
      
      // Reset form (giữ lại lớp và GV để nhập tiếp cho tiện)
      setSelectedStudent('');
      setDescription('');
  }
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Báo cáo nề nếp & Khen thưởng</h2>
        <p className="text-slate-500">Ghi nhận các vi phạm hoặc thành tích của học sinh để xét hạnh kiểm.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        {/* Type Selector */}
        <div className="flex border-b border-slate-200">
           <button 
             type="button"
             onClick={() => setReportType('VIOLATION')}
             className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-colors ${
                reportType === 'VIOLATION' 
                 ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
                 : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
             <AlertTriangle className="w-4 h-4 mr-2" />
             Báo cáo Vi phạm
           </button>
           <button 
             type="button"
             onClick={() => setReportType('REWARD')}
             className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-colors ${
                reportType === 'REWARD' 
                 ? 'bg-green-50 text-green-600 border-b-2 border-green-600' 
                 : 'text-slate-500 hover:bg-slate-50'
             }`}
           >
             <Award className="w-4 h-4 mr-2" />
             Đề xuất Khen thưởng
           </button>
        </div>

        <div className="p-8">
           <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ngày xảy ra sự việc</label>
                     <div className="relative">
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                        />
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Giáo viên ghi nhận</label>
                    {user?.role === 'TEACHER' ? (
                        <input 
                            type="text" 
                            value={linkedTeacher ? linkedTeacher.fullName : (user?.name || 'Đang tải...')}
                            disabled
                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 focus:outline-none cursor-not-allowed font-medium"
                        />
                    ) : (
                        <select 
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                        >
                            <option value="">-- Chọn giáo viên --</option>
                            {teachers.map((teacher: any) => (
                                <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
                            ))}
                        </select>
                    )}
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Lớp nghề</label>
                    <select 
                        value={selectedClass}
                        onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setSelectedStudent(''); // Reset học sinh khi đổi lớp
                        }}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                    >
                        <option value="">-- Chọn lớp nghề --</option>
                        {vocationalClasses.map((cls: any) => (
                            <option key={cls.id} value={cls.className}>{cls.className}</option>
                        ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Học sinh</label>
                    <select 
                        value={selectedStudent}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        disabled={!selectedClass}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all ${
                            !selectedClass 
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-50 border-slate-300'
                        }`}
                    >
                        <option value="">
                            {!selectedClass ? 'Vui lòng chọn lớp trước...' : '-- Chọn học sinh --'}
                        </option>
                        {availableStudents.map((student: any) => (
                            <option key={student.id} value={student.id}>{student.name} ({student.id})</option>
                        ))}
                    </select>
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">
                    {reportType === 'VIOLATION' ? 'Lỗi vi phạm' : 'Hình thức khen thưởng'}
                 </label>
                 <select 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                 >
                    <option value="">-- Chọn nội dung --</option>
                    {reportType === 'VIOLATION' ? (
                        <>
                            <option value="Đi học muộn">Đi học muộn</option>
                            <option value="Không mặc đồng phục">Không mặc đồng phục</option>
                            <option value="Nói chuyện riêng trong giờ">Nói chuyện riêng trong giờ</option>
                            <option value="Sử dụng điện thoại trái phép">Sử dụng điện thoại trái phép</option>
                            <option value="Vô lễ với giáo viên">Vô lễ với giáo viên</option>
                            <option value="Gây gổ đánh nhau">Gây gổ đánh nhau</option>
                        </>
                    ) : (
                        <>
                            <option value="Nhặt được của rơi trả lại người mất">Nhặt được của rơi trả lại người mất</option>
                            <option value="Thành tích học tập xuất sắc">Thành tích học tập xuất sắc</option>
                            <option value="Tham gia tích cực phong trào">Tham gia tích cực phong trào</option>
                            <option value="Giúp đỡ bạn bè">Giúp đỡ bạn bè</option>
                        </>
                    )}
                 </select>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Chi tiết / Ghi chú thêm</label>
                 <textarea 
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
                    placeholder="Nhập thêm thông tin chi tiết nếu cần..."
                 ></textarea>
              </div>

              <div className="pt-4">
                 <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                        reportType === 'VIOLATION' 
                         ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                         : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    }`}
                 >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Send className="w-4 h-4 mr-2" />}
                    {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                 </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default BehaviorReport;
