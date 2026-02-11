
import React, { useMemo, useState } from 'react';
import { Users, GraduationCap, TrendingUp, AlertCircle, Loader2, Filter, Calendar, Search, Clock, XCircle, CheckCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useSync } from '../../context/SyncContext';

const AdminDashboard: React.FC = () => {
  const { data, isSyncing } = useSync();
  const students = data.Students || [];
  const teachers = data.Teachers || [];
  const attendanceLogs = data.Attendance || [];
  const behaviorLogs = data.Behavior || [];
  const vocationalClasses = data.VocationalClasses || [];
  const academicClasses = data.AcademicClasses || []; // Lấy thêm lớp văn hóa

  // State cho bộ lọc danh sách vắng - Default to Vietnam Time
  const [filterDate, setFilterDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }));
  const [selectedClass, setSelectedClass] = useState('');

  // --- Real-time Calculations ---
  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const totalStudents = students.length;

    // Calculate Attendance Rate (Flat Structure)
    let totalPresence = 0;
    let totalSessions = attendanceLogs.length; // Each row is one session per student
    
    attendanceLogs.forEach((log: any) => {
        if (log.status === 'PRESENT') totalPresence++;
    });

    const attendanceRate = totalSessions > 0 ? ((totalPresence / totalSessions) * 100).toFixed(1) + '%' : 'N/A';
    
    // Recent Violations (Today or This Week)
    const totalViolations = behaviorLogs.filter((b: any) => b.type === 'VIOLATION').length;

    return [
      { label: 'Tổng số giáo viên', value: totalTeachers, change: '', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
      { label: 'Tổng số học sinh', value: totalStudents, change: '', icon: GraduationCap, color: 'text-green-600', bg: 'bg-green-100' },
      { label: 'Tỉ lệ chuyên cần', value: attendanceRate, change: '', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
      { label: 'Vi phạm (Tổng)', value: totalViolations, change: '', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    ];
  }, [students, teachers, attendanceLogs, behaviorLogs]);

  const weeklyData = useMemo(() => {
      // Group attendance by day of week (0-6)
      const dayCounts: Record<string, {name: string, present: number, absent: number}> = {
          'Mon': { name: 'Thứ 2', present: 0, absent: 0 },
          'Tue': { name: 'Thứ 3', present: 0, absent: 0 },
          'Wed': { name: 'Thứ 4', present: 0, absent: 0 },
          'Thu': { name: 'Thứ 5', present: 0, absent: 0 },
          'Fri': { name: 'Thứ 6', present: 0, absent: 0 },
          'Sat': { name: 'Thứ 7', present: 0, absent: 0 },
          'Sun': { name: 'CN', present: 0, absent: 0 }
      };

      const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      attendanceLogs.forEach((log: any) => {
          if (!log.date) return;
          
          // FIX TIMEZONE: Chuẩn hóa nếu là ISO string (UTC)
          let dateStr = log.date;
          if (dateStr && (typeof dateStr === 'string') && (dateStr.includes('T') || dateStr.includes('Z'))) {
              try {
                  dateStr = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
              } catch(e) {
                  dateStr = log.date; // Fallback
              }
          }

          // FIX: Dùng getUTCDay trên chuỗi YYYY-MM-DD để tránh lệch khi parse
          const dateObj = new Date(dateStr);
          const dayIndex = dateObj.getUTCDay();
          const day = dayMap[dayIndex];
          
          if (dayCounts[day]) {
             if (log.status === 'PRESENT') dayCounts[day].present++;
             else dayCounts[day].absent++;
          }
      });
      
      // Return order Mon-Fri
      return [dayCounts['Mon'], dayCounts['Tue'], dayCounts['Wed'], dayCounts['Thu'], dayCounts['Fri']];
  }, [attendanceLogs]);

  const pieData = useMemo(() => {
      let present = 0;
      let excused = 0;
      let unexcused = 0;

      attendanceLogs.forEach((log: any) => {
          if (log.status === 'PRESENT') present++;
          else if (log.status === 'EXCUSED') excused++;
          else unexcused++;
      });

      return [
        { name: 'Có mặt', value: present, color: '#22c55e' },
        { name: 'Có phép', value: excused, color: '#eab308' },
        { name: 'Không phép', value: unexcused, color: '#ef4444' },
      ];
  }, [attendanceLogs]);
  
  const totalLogs = pieData.reduce((acc, curr) => acc + curr.value, 0);

  // --- Filtered Absence List Logic ---
  const filteredAbsences = useMemo(() => {
      if (!selectedClass) return [];

      // Lọc các log thỏa mãn: Ngày, Lớp và Status != PRESENT
      return attendanceLogs.filter((log: any) => {
          // Chuẩn hóa ngày: Convert ISO sang VN Time nếu cần
          let logDate = log.date;
          if (logDate && (typeof logDate === 'string') && (logDate.includes('T') || logDate.includes('Z'))) {
              try {
                  logDate = new Date(logDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
              } catch (e) {
                  logDate = log.date.substring(0, 10);
              }
          }

          const isDateMatch = logDate === filterDate;
          const isClassMatch = log.className === selectedClass || log.classId === selectedClass;
          const isAbsent = log.status !== 'PRESENT';

          return isDateMatch && isClassMatch && isAbsent;
      }).map((log: any) => {
          // Lấy thêm thông tin học sinh nếu cần
          const student = students.find((s: any) => s.id === log.studentId);
          return {
              ...log,
              studentName: student ? student.name : (log.studentName || 'Không xác định'),
              studentCode: student ? (student.code || student.id) : (log.studentCode || '---')
          };
      });
  }, [attendanceLogs, selectedClass, filterDate, students]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tổng quan hệ thống</h2>
          <p className="text-slate-500">Thống kê hoạt động toàn trường {isSyncing && <span className="inline-flex items-center text-xs text-blue-500 ml-2"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Đang cập nhật...</span>}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
              {stat.change && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block bg-slate-100 text-slate-600`}>
                    {stat.change}
                  </span>
              )}
            </div>
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Tỉ lệ đi học trong tuần (Tổng hợp)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="present" name="Đi học" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="absent" name="Vắng mặt" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6">Tỉ lệ chuyên cần toàn thời gian</h3>
          <div className="h-60 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none pb-8">
               <span className="text-3xl font-bold text-slate-800">{totalLogs}</span>
               <span className="text-xs text-slate-500">Lượt điểm danh</span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
             {pieData.map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                        <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{item.value}</span>
                 </div>
             ))}
          </div>
        </div>
      </div>

      {/* SECTION MỚI: Danh sách vắng chi tiết theo lớp */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50">
             <div>
                 <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Search className="w-5 h-5 mr-2 text-primary-600" />
                    Tra cứu Học sinh vắng
                 </h3>
                 <p className="text-sm text-slate-500">Xem danh sách vắng mặt chi tiết theo từng lớp và ngày cụ thể.</p>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 {/* Chọn Ngày */}
                 <div className="relative">
                     <input 
                        type="date" 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto"
                     />
                     <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                 </div>

                 {/* Chọn Lớp */}
                 <div className="relative">
                     <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none w-full sm:w-64"
                     >
                        <option value="">-- Chọn lớp cần xem --</option>
                        <optgroup label="Lớp Nghề">
                            {vocationalClasses
                                .filter((cls: any) => cls.className && cls.className !== 'N/A')
                                .map((cls: any) => (
                                    <option key={cls.id} value={cls.className}>{cls.className}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Lớp Văn hóa">
                            {academicClasses
                                .filter((cls: any) => cls.className && cls.className !== 'N/A')
                                .map((cls: any) => (
                                <option key={cls.id} value={cls.className}>{cls.className}</option>
                            ))}
                        </optgroup>
                     </select>
                     <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                 </div>
             </div>
         </div>

         <div className="p-0">
             {!selectedClass ? (
                 <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                     <Filter className="w-12 h-12 text-slate-200 mb-3" />
                     <p>Vui lòng chọn <strong>Lớp học</strong> để xem danh sách học sinh vắng.</p>
                 </div>
             ) : (
                 <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                         <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                             <tr>
                                 <th className="px-6 py-4 font-semibold w-16 text-center">STT</th>
                                 <th className="px-6 py-4 font-semibold">Mã HS</th>
                                 <th className="px-6 py-4 font-semibold">Tên Học sinh</th>
                                 <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
                                 <th className="px-6 py-4 font-semibold">Lý do</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                             {filteredAbsences.length > 0 ? (
                                 filteredAbsences.map((log: any, index: number) => (
                                     <tr key={index} className="hover:bg-slate-50 transition-colors">
                                         <td className="px-6 py-4 text-center text-sm text-slate-500">{index + 1}</td>
                                         <td className="px-6 py-4 text-sm text-slate-600 font-mono">{log.studentCode}</td>
                                         <td className="px-6 py-4 text-sm font-bold text-slate-800">{log.studentName}</td>
                                         <td className="px-6 py-4 text-center">
                                             {log.status === 'EXCUSED' ? (
                                                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                     <Clock className="w-3 h-3 mr-1.5" /> Có phép
                                                 </span>
                                             ) : (
                                                 <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                                     <XCircle className="w-3 h-3 mr-1.5" /> Không phép
                                                 </span>
                                             )}
                                         </td>
                                         <td className="px-6 py-4 text-sm text-slate-500 italic">
                                             {log.note || <span className="text-slate-300">Không có ghi chú</span>}
                                         </td>
                                     </tr>
                                 ))
                             ) : (
                                 <tr>
                                     <td colSpan={5} className="py-12 text-center text-slate-500">
                                         <div className="flex flex-col items-center">
                                             <CheckCircle className="w-12 h-12 text-green-200 mb-3" />
                                             <p className="font-medium text-green-700">Lớp đi học đầy đủ!</p>
                                             <p className="text-sm">Không có học sinh vắng trong ngày {filterDate.split('-').reverse().join('/')}</p>
                                         </div>
                                     </td>
                                 </tr>
                             )}
                         </tbody>
                     </table>
                 </div>
             )}
         </div>
         {selectedClass && filteredAbsences.length > 0 && (
             <div className="bg-slate-50 p-3 border-t border-slate-200 text-right text-xs text-slate-500">
                 Tổng số: <strong>{filteredAbsences.length}</strong> học sinh vắng
             </div>
         )}
      </div>

    </div>
  );
};

export default AdminDashboard;
