
import React, { useState, useMemo } from 'react';
import { Filter, ChevronDown, TrendingUp, AlertTriangle, Award, Info, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

const BehaviorAdmin: React.FC = () => {
  const { data, removeRecord } = useSync();
  const [selectedClass, setSelectedClass] = useState('');

  // Lấy dữ liệu thật từ Context
  const behaviorLogs = data.Behavior || [];
  const attendanceLogs = data.Attendance || [];
  const vocationalClasses = data.VocationalClasses || [];
  const students = data.Students || [];

  const classData = useMemo(() => {
    if (!selectedClass) {
      return null;
    }

    // Tính toán chuyên cần
    // Logic: Lọc bản ghi điểm danh của lớp này (dạng phẳng)
    const classAttendance = attendanceLogs.filter((log: any) => log.classId === selectedClass);
    
    let totalPresence = 0;
    let totalAbsence = 0;
    
    classAttendance.forEach((record: any) => {
        if (record.status === 'PRESENT') totalPresence++;
        else totalAbsence++;
    });

    const totalCheck = totalPresence + totalAbsence;
    const attendanceRate = totalCheck > 0 ? (totalPresence / totalCheck) * 100 : 100;

    // Lọc nề nếp
    const classBehavior = behaviorLogs.filter((log: any) => log.classId === selectedClass);
    const violations = classBehavior.filter((log: any) => log.type === 'VIOLATION').sort((a: any, b: any) => b.date.localeCompare(a.date));
    const rewards = classBehavior.filter((log: any) => log.type === 'REWARD').sort((a: any, b: any) => b.date.localeCompare(a.date));

    // Helper để lấy tên học sinh
    const getStudentName = (code: string) => {
        const s = students.find((stu: any) => stu.id === code);
        return s ? s.name : code;
    };

    return {
      attendanceRate: attendanceRate.toFixed(1),
      totalAbsences: totalAbsence,
      violations: violations.map((v: any) => ({...v, studentName: getStudentName(v.studentCode)})),
      rewards: rewards.map((r: any) => ({...r, studentName: getStudentName(r.studentCode)})),
    };
  }, [selectedClass, behaviorLogs, attendanceLogs, students]);

  const handleDelete = async (id: string) => {
      if(window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
          await removeRecord('Behavior', id);
      }
  }

  // Hàm helper để hiển thị ngày tháng chuẩn YYYY-MM-DD -> DD/MM/YYYY không bị lệch múi giờ
  const formatDateDisplay = (dateString: string) => {
      if (!dateString) return '';
      // Giả sử dateString là YYYY-MM-DD. Tách chuỗi là an toàn nhất.
      try {
          const [y, m, d] = dateString.split('-');
          return `${d}/${m}/${y}`;
      } catch (e) {
          return dateString;
      }
  };

  const StatCard = ({ icon: Icon, title, value, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-start gap-4">
        <div className={`p-2 rounded-lg ${colorClass.bg}`}>
            <Icon className={`w-6 h-6 ${colorClass.text}`} />
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Nề nếp</h2>
        <p className="text-slate-500">Tổng hợp vi phạm và khen thưởng từ báo cáo của giáo viên.</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
        <Filter className="w-5 h-5 text-slate-400" />
        <div className="relative flex-1">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-80 pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white appearance-none"
            >
              <option value="">-- Vui lòng chọn lớp để xem báo cáo --</option>
              {vocationalClasses
                .filter((cls: any) => cls.className && cls.className !== 'N/A')
                .map((cls: any) => (
                <option key={cls.id || cls.className} value={cls.className}>{cls.className}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
        </div>
      </div>

      {selectedClass && classData ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <StatCard icon={TrendingUp} title="Tỉ lệ chuyên cần" value={`${classData.attendanceRate}%`} colorClass={{bg: 'bg-green-50', text: 'text-green-600'}} />
             <StatCard icon={AlertTriangle} title="Tổng số vi phạm" value={classData.violations.length} colorClass={{bg: 'bg-red-50', text: 'text-red-600'}} />
             <StatCard icon={Award} title="Tổng số khen thưởng" value={classData.rewards.length} colorClass={{bg: 'bg-blue-50', text: 'text-blue-600'}} />
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Violations List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100 bg-red-50/50">
                <h3 className="font-bold text-red-800 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Danh sách Vi phạm
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                {classData.violations.length > 0 ? classData.violations.map((v: any) => (
                  <div key={v.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg group relative">
                    <button onClick={() => handleDelete(v.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex justify-between items-start pr-6">
                      <div>
                         <p className="text-sm font-bold text-slate-800">{v.studentName}</p>
                         <p className="text-xs text-slate-500">{v.studentCode}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 flex items-center">
                         <Calendar className="w-3 h-3 mr-1" /> {formatDateDisplay(v.date)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 p-2 bg-white rounded border border-slate-200 flex items-start">
                       <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                       <span>{v.description}</span>
                    </p>
                    <p className="text-right text-xs text-slate-400 mt-1">Báo cáo bởi: {v.reportedBy}</p>
                  </div>
                )) : <p className="text-center text-slate-500 py-8">Không có vi phạm nào được ghi nhận.</p>}
              </div>
            </div>

            {/* Rewards List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-100 bg-blue-50/50">
                <h3 className="font-bold text-blue-800 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Danh sách Khen thưởng
                </h3>
              </div>
              <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                 {classData.rewards.length > 0 ? classData.rewards.map((r: any) => (
                  <div key={r.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg group relative">
                    <button onClick={() => handleDelete(r.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex justify-between items-start pr-6">
                      <div>
                         <p className="text-sm font-bold text-slate-800">{r.studentName}</p>
                         <p className="text-xs text-slate-500">{r.studentCode}</p>
                      </div>
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 flex items-center">
                         <Calendar className="w-3 h-3 mr-1" /> {formatDateDisplay(r.date)}
                      </span>
                    </div>
                     <p className="text-sm text-slate-600 mt-2 p-2 bg-white rounded border border-slate-200 flex items-start">
                       <MessageSquare className="w-4 h-4 mr-2 mt-0.5 text-slate-400 shrink-0" />
                       <span>{r.description}</span>
                    </p>
                    <p className="text-right text-xs text-slate-400 mt-1">Báo cáo bởi: {r.reportedBy}</p>
                  </div>
                )) : <p className="text-center text-slate-500 py-8">Không có khen thưởng nào được ghi nhận.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Chưa có dữ liệu</h3>
          <p className="text-slate-500">Vui lòng chọn một lớp học từ menu thả xuống để xem báo cáo nề nếp.</p>
        </div>
      )}
    </div>
  );
};

export default BehaviorAdmin;
