
import React, { useState, useMemo } from 'react';
import { FileDown, Calendar, FileText, X, CheckCircle, XCircle, Clock, BarChart, TrendingDown, Award, TrendingUp, Loader2 } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useSync } from '../../context/SyncContext';

// --- Types ---
type AttendanceStatus = 'PRESENT' | 'EXCUSED' | 'UNEXCUSED';

interface AttendanceLog {
  id: string;
  studentName: string;
  studentCode: string;
  className: string;
  date: string; 
  teacher: string; 
  vocationalTeacher: string; 
  status: AttendanceStatus;
  note?: string; 
  session?: 'Sáng' | 'Chiều';
}

interface ReportSummary {
  className: string;
  teacher: string;
  totalSessions: number;
  presentCount: number;
  excusedCount: number;
  unexcusedCount: number;
}

const ReportAdmin: React.FC = () => {
  const { data, isSyncing } = useSync();
  
  // Dữ liệu thực từ Context (đã là dạng cột/phẳng)
  const attendanceData = data.Attendance || [];
  const studentsData = data.Students || [];
  const classesData = data.VocationalClasses || [];
  const teachersData = data.Teachers || [];

  const [activeTab, setActiveTab] = useState<'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [selectedClass, setSelectedClass] = useState('');
  
  // Mặc định chọn tuần hiện tại hoặc tháng hiện tại theo giờ Việt Nam
  const [dateValue, setDateValue] = useState(() => {
     const now = new Date();
     // Lấy YYYY-MM theo múi giờ VN
     const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
     return vnDate.slice(0, 7); // YYYY-MM
  });

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReportClass, setSelectedReportClass] = useState<string | null>(null);

  // --- 1. Map Data Logic: Chuyển đổi dữ liệu Attendance (dạng phẳng) sang view model ---
  const allLogs = useMemo(() => {
    const logs: AttendanceLog[] = [];

    attendanceData.forEach((record: any) => {
        // FIX TIMEZONE: Chuẩn hóa ngày về giờ Việt Nam nếu dữ liệu là ISO (UTC)
        // Nếu record.date là "2026-02-07T17:00..." (tức 0h ngày 8/2 VN) -> convert về "2026-02-08"
        let normalizedDate = record.date;
        if (normalizedDate && (typeof normalizedDate === 'string') && (normalizedDate.includes('T') || normalizedDate.includes('Z'))) {
            try {
                normalizedDate = new Date(normalizedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            } catch (e) {
                normalizedDate = record.date.substring(0, 10);
            }
        }

        // record bây giờ là một bản ghi điểm danh của 1 học sinh
        // Tìm thông tin lớp để lấy GVCN
        const clsObj = classesData.find((c: any) => c.id === record.classId || c.className === record.classId);
        const className = clsObj ? clsObj.className : record.classId;
        const homeroomTeacher = clsObj ? clsObj.homeroomTeacher : 'N/A';
        
        // Tìm giáo viên dạy buổi đó
        const sessionTeacherObj = teachersData.find((t: any) => t.id === record.teacherId);
        const sessionTeacherName = sessionTeacherObj ? sessionTeacherObj.fullName : 'GV';
        
        // Thông tin học sinh (có thể lấy từ record hoặc lookup lại để chắc chắn)
        // Trong mô hình phẳng mới, ta lưu studentName/Code ngay trong record để tiện, nhưng lookup thì an toàn hơn
        const student = studentsData.find((s: any) => s.id === record.studentId);
        const studentName = student ? student.name : (record.studentName || record.studentId);
        const studentCode = student ? (student.code || student.id) : (record.studentCode || record.studentId);

        logs.push({
            id: record.id,
            date: normalizedDate, 
            className: className,
            teacher: homeroomTeacher,
            vocationalTeacher: sessionTeacherName,
            studentName: studentName,
            studentCode: studentCode,
            status: record.status,
            note: record.note,
            session: record.session
        });
    });

    return logs;
  }, [attendanceData, studentsData, classesData, teachersData]);

  // --- Helpers for Date Logic ---
  const getDateRange = (type: 'WEEKLY' | 'MONTHLY' | 'YEARLY', value: string): { start: string, end: string } => {
    if (!value) return { start: '0000-00-00', end: '9999-99-99' };
    
    if (type === 'YEARLY') {
      const year = parseInt(value);
      if (isNaN(year)) return { start: '0000-00-00', end: '9999-99-99' };
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }

    if (type === 'MONTHLY') {
      const [year, month] = value.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      return { start, end };
    } 
    
    // WEEKLY
    if(value.includes('-W')) {
        const [yearStr, weekStr] = value.split('-W');
        const year = parseInt(yearStr);
        const week = parseInt(weekStr);
        
        // Logic tính ngày đầu tuần từ số tuần ISO
        const simple = new Date(year, 0, 1 + (week - 1) * 7);
        const dayOfWeek = simple.getDay();
        const ISOweekStart = simple;
        if (dayOfWeek <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        // FIX QUAN TRỌNG:
        // Không dùng .toISOString() vì nó sẽ convert sang UTC và có thể bị lùi 1 ngày.
        // Tự format chuỗi YYYY-MM-DD dựa trên Local Date để giữ nguyên ngày.
        const formatLocalYMD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const start = formatLocalYMD(ISOweekStart);
        
        const endObj = new Date(ISOweekStart);
        endObj.setDate(endObj.getDate() + 6);
        const end = formatLocalYMD(endObj);
        return { start, end };
    }
    
    return { start: '0000-00-00', end: '9999-99-99' };
  };

  // --- Filtering & Aggregation Logic ---
  const reportData = useMemo(() => {
    const { start, end } = getDateRange(activeTab, dateValue);

    const filteredLogs = allLogs.filter(log => {
      const matchDate = log.date >= start && log.date <= end;
      const matchClass = selectedClass ? log.className === selectedClass : true;
      return matchDate && matchClass;
    });

    const summaryMap = new Map<string, ReportSummary>();

    const availableClasses = selectedClass 
        ? classesData.filter((c: any) => c.className === selectedClass)
        : classesData;

    availableClasses.forEach((cls: any) => {
      if (cls.className && cls.className !== 'N/A') {
        summaryMap.set(cls.className, { 
            className: cls.className, 
            teacher: cls.homeroomTeacher, 
            totalSessions: 0, 
            presentCount: 0, 
            excusedCount: 0, 
            unexcusedCount: 0 
        });
      }
    });

    filteredLogs.forEach(log => {
      if (summaryMap.has(log.className)) {
        const summary = summaryMap.get(log.className)!;
        summary.totalSessions++;
        if (log.status === 'PRESENT') summary.presentCount++;
        else if (log.status === 'EXCUSED') summary.excusedCount++;
        else if (log.status === 'UNEXCUSED') summary.unexcusedCount++;
      }
    });

    return Array.from(summaryMap.values());
  }, [activeTab, dateValue, selectedClass, allLogs, classesData]);

  // --- Advanced Statistics ---
  const { generalStats, topAbsentStudents, classRankings } = useMemo(() => {
    // General Stats
    const totalClassesWithData = reportData.filter(r => r.totalSessions > 0).length;
    const totalAbsences = reportData.reduce((acc, curr) => acc + curr.excusedCount + curr.unexcusedCount, 0);

    // Top Absent Students
    const studentCounts: Record<string, { name: string; code: string; className: string; count: number; }> = {};
    const { start, end } = getDateRange(activeTab, dateValue);
    
    // Lọc log vắng trong khoảng thời gian
    const absentLogs = allLogs.filter(log => log.status !== 'PRESENT' && log.date >= start && log.date <= end);

    absentLogs.forEach(log => {
      if (!studentCounts[log.studentCode]) {
        studentCounts[log.studentCode] = { name: log.studentName, code: log.studentCode, className: log.className, count: 0 };
      }
      studentCounts[log.studentCode].count++;
    });
    
    const topStudents = Object.values(studentCounts).sort((a, b) => b.count - a.count).slice(0, 5);

    // Class Rankings
    const classAbsenceData = reportData.filter(r => r.totalSessions > 0).map(r => ({
      className: r.className,
      absenceCount: r.excusedCount + r.unexcusedCount,
    }));
    
    let most = null, least = null;
    if (classAbsenceData.length > 0) {
      classAbsenceData.sort((a, b) => a.absenceCount - b.absenceCount);
      least = classAbsenceData[0];
      most = classAbsenceData[classAbsenceData.length - 1];
    }
    
    return {
      generalStats: { totalClasses: totalClassesWithData, totalAbsences },
      topAbsentStudents: topStudents,
      classRankings: { most, least },
    };
  }, [reportData, activeTab, dateValue, allLogs]);

  // --- Excel Export ---
  const handleExportSummaryExcel = () => {
    if (reportData.length === 0) {
        alert("Không có dữ liệu để xuất!"); return;
    }
    const excelData = reportData.map(item => ({
        "Lớp Nghề": item.className, "Giáo viên CN": item.teacher, "Tổng lượt": item.totalSessions,
        "Có mặt": item.presentCount, "Có phép": item.excusedCount, "Không phép": item.unexcusedCount,
        "Tỉ lệ chuyên cần": item.totalSessions ? ((item.presentCount / item.totalSessions) * 100).toFixed(1) + '%' : '0%'
    }));
    const ws = utils.json_to_sheet(excelData);
    ws['!cols'] = [ { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 15 } ];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Bao_Cao_Tong_Hop");
    const timeLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1).toLowerCase();
    writeFile(wb, `Bao_Cao_${timeLabel}_${dateValue}.xlsx`);
  };

  const handleExportDetailExcel = () => {
    if (!selectedClass) {
        alert("Vui lòng chọn một lớp nghề cụ thể để xuất danh sách chi tiết."); return;
    }
    const { start, end } = getDateRange(activeTab, dateValue);
    const detailedLogs = allLogs.filter(log => 
        log.className === selectedClass && log.date >= start && log.date <= end && log.status !== 'PRESENT'
    ).sort((a,b) => a.date.localeCompare(b.date));

    if (detailedLogs.length === 0) {
        alert(`Không có học sinh nào vắng trong lớp ${selectedClass} cho khoảng thời gian đã chọn.`); return;
    }
    
    // 1. Get header information
    const classInfo = classesData.find((c: any) => c.className === selectedClass);
    const homeroomTeacher = classInfo ? classInfo.homeroomTeacher : 'Chưa có';
    const totalAbsences = detailedLogs.length;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    };

    let timeframeInfo = '';
    if (activeTab === 'WEEKLY') {
        const weekNumber = dateValue.split('-W')[1] || '';
        timeframeInfo = `Tuần ${weekNumber} (Từ ngày ${formatDate(start)} đến ngày ${formatDate(end)})`;
    } else if (activeTab === 'MONTHLY') {
        const [y, m] = dateValue.split('-');
        timeframeInfo = `Tháng ${m}/${y}`;
    } else if (activeTab === 'YEARLY') {
        timeframeInfo = `Năm ${dateValue}`;
    }

    // 2. Prepare Excel data
    const excelData = detailedLogs.map(log => ({
        "Ngày vắng": log.date,
        "Buổi dạy": log.session || '',
        "Tên học sinh": log.studentName,
        "Mã HS": log.studentCode,
        "GV dạy nghề": log.vocationalTeacher,
        "Trạng thái": log.status === 'EXCUSED' ? 'Có phép' : 'Không phép',
        "Lý do": log.note || ''
    }));
    
    // 3. Create worksheet with headers
    const ws = utils.json_to_sheet([]); 

    utils.sheet_add_aoa(ws, [
        [`BÁO CÁO CHI TIẾT VẮNG MẶT LỚP NGHỀ: ${selectedClass}`],
        [`GIÁO VIÊN CHỦ NHIỆM: ${homeroomTeacher}`],
        [`THỜI GIAN: ${timeframeInfo}`],
        [`TỔNG SỐ LƯỢT VẮNG: ${totalAbsences}`],
        [], // Empty row
    ], { origin: "A1" });

    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, 
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, 
      { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
    ];

    utils.sheet_add_json(ws, excelData, { origin: "A6", skipHeader: false });
    
    ws['!cols'] = [ { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 30 } ];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, `ChiTietVang_${selectedClass}`);
    const timeLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1).toLowerCase();
    writeFile(wb, `ChiTietVang_${selectedClass}_${timeLabel}_${dateValue}.xlsx`);
  };

  // --- Detail Logic ---
  const handleViewDetail = (className: string) => {
    setSelectedReportClass(className);
    setDetailModalOpen(true);
  };

  const absenceLogs = useMemo(() => {
    if (!selectedReportClass) return [];
    const { start, end } = getDateRange(activeTab, dateValue);
    return allLogs.filter(log => 
      log.className === selectedReportClass && log.date >= start && log.date <= end && log.status !== 'PRESENT'
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedReportClass, activeTab, dateValue, allLogs]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Xuất báo cáo</h2>
          <p className="text-slate-500">Thống kê và xuất dữ liệu điểm danh tổng hợp {isSyncing && <span className="text-blue-500 text-xs ml-2 flex inline-flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Đang đồng bộ...</span>}</p>
        </div>
        <button 
          onClick={handleExportSummaryExcel}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Xuất Báo cáo tổng hợp
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex px-6 pt-4 space-x-6">
            <button
              onClick={() => { setActiveTab('WEEKLY'); setDateValue('2023-W43'); }}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'WEEKLY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >Báo cáo tuần</button>
            <button
              onClick={() => { 
                setActiveTab('MONTHLY'); 
                const now = new Date();
                const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                setDateValue(vnDate.slice(0, 7));
              }}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'MONTHLY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >Báo cáo tháng</button>
            <button
              onClick={() => { 
                  setActiveTab('YEARLY'); 
                  const now = new Date();
                  const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                  setDateValue(vnDate.slice(0, 4));
              }}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'YEARLY' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
            >Báo cáo năm</button>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="relative md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                    {activeTab === 'WEEKLY' ? 'Chọn Tuần' : activeTab === 'MONTHLY' ? 'Chọn Tháng' : 'Chọn Năm'}
                </label>
                <div className="relative">
                    <input 
                        type={activeTab === 'WEEKLY' ? "week" : activeTab === 'MONTHLY' ? "month" : "number"}
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" 
                        {...(activeTab === 'YEARLY' && { placeholder: 'YYYY', min: "2020", max: "2030" })}
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
            </div>
            
            <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Lọc theo Lớp Nghề (Để xuất chi tiết)</label>
                <div className="flex gap-2">
                    <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Tất cả các lớp (Chỉ xem tổng hợp)</option>
                        {classesData
                            .filter((cls: any) => cls.className && cls.className !== 'N/A')
                            .map((cls: any) => (
                            <option key={cls.id} value={cls.className}>{cls.className}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleExportDetailExcel}
                        disabled={!selectedClass}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors flex items-center justify-center shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed whitespace-nowrap"
                        title={!selectedClass ? "Vui lòng chọn lớp để xuất chi tiết" : "Xuất danh sách vắng của lớp đã chọn"}
                    >
                        <FileDown className="w-4 h-4 mr-2" />
                        Xuất DS vắng
                    </button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                            <th className="px-6 py-4 font-semibold">Lớp Nghề</th>
                            <th className="px-6 py-4 font-semibold">Giáo viên chủ nhiệm</th>
                            <th className="px-6 py-4 font-semibold text-center">Tổng lượt</th>
                            <th className="px-6 py-4 font-semibold text-center text-green-600">Có mặt</th>
                            <th className="px-6 py-4 font-semibold text-center text-amber-600">Có phép</th>
                            <th className="px-6 py-4 font-semibold text-center text-red-600">Không phép</th>
                            <th className="px-6 py-4 font-semibold text-right">Chi tiết</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                        {reportData.filter(r => r.totalSessions > 0).length > 0 ? (
                            reportData.filter(r => r.totalSessions > 0).map((report) => {
                                const presentPct = Math.round((report.presentCount / report.totalSessions) * 100);
                                return (
                                <tr key={report.className} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800">{report.className}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{report.teacher}</td>
                                    <td className="px-6 py-4 text-center text-sm font-medium">{report.totalSessions}</td>
                                    <td className="px-6 py-4 text-center text-sm text-green-600 font-bold">
                                        {report.presentCount} <span className="text-xs text-green-400 font-normal">({presentPct}%)</span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-amber-600">{report.excusedCount}</td>
                                    <td className="px-6 py-4 text-center text-sm text-red-600 font-bold">{report.unexcusedCount}</td>
                                    <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleViewDetail(report.className)}
                                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 p-2 rounded-lg transition-colors"
                                        title="Xem chi tiết vắng"
                                    ><FileText className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                                    Không có dữ liệu báo cáo cho tiêu chí lọc này.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
               <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                   <h3 className="font-bold text-slate-800 flex items-center"><BarChart className="w-5 h-5 mr-2 text-primary-600"/>Thống kê chung</h3>
               </div>
               <div className="p-4 space-y-3 text-sm">
                   <div className="flex justify-between items-center">
                       <span className="text-slate-600">Số lớp có dữ liệu:</span>
                       <span className="font-bold text-slate-800">{generalStats.totalClasses}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-slate-600">Tổng lượt vắng:</span>
                       <span className="font-bold text-red-600">{generalStats.totalAbsences}</span>
                   </div>
               </div>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200">
               <div className="p-4 border-b border-slate-100 bg-red-50/50">
                   <h3 className="font-bold text-red-800 flex items-center"><TrendingDown className="w-5 h-5 mr-2"/>Học sinh vắng nhiều nhất</h3>
               </div>
               <div className="p-4 space-y-3">
                 {topAbsentStudents.length > 0 ? topAbsentStudents.map(student => (
                   <div key={student.code} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                       <div>
                           <p className="text-sm font-bold text-slate-800">{student.name}</p>
                           <p className="text-xs text-slate-500">{student.className} - {student.code}</p>
                       </div>
                       <div className="text-sm font-bold text-white bg-red-500 w-8 h-8 flex items-center justify-center rounded-full shadow-sm border-2 border-white">{student.count}</div>
                   </div>
                 )) : (
                    <p className="text-center text-sm text-slate-500 py-4">Không có dữ liệu.</p>
                 )}
               </div>
           </div>
        </div>
      </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-800 flex items-center mb-4"><Award className="w-5 h-5 mr-2 text-amber-500"/>Đánh giá chuyên cần các lớp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <h4 className="font-semibold text-red-800 flex items-center"><TrendingDown className="w-4 h-4 mr-2"/>Lớp vắng nhiều nhất</h4>
                {classRankings.most ? (
                    <div className="mt-2">
                        <span className="font-bold text-lg text-slate-800">{classRankings.most.className}</span>
                        <span className="ml-2 text-red-600 font-bold">({classRankings.most.absenceCount} lượt)</span>
                    </div>
                ) : (
                    <p className="text-slate-500 mt-2">Không có dữ liệu.</p>
                )}
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h4 className="font-semibold text-green-800 flex items-center"><TrendingUp className="w-4 h-4 mr-2"/>Lớp vắng ít nhất</h4>
                {classRankings.least ? (
                    <div className="mt-2">
                        <span className="font-bold text-lg text-slate-800">{classRankings.least.className}</span>
                        <span className="ml-2 text-green-600 font-bold">({classRankings.least.absenceCount} lượt)</span>
                    </div>
                ) : (
                     <p className="text-slate-500 mt-2">Không có dữ liệu.</p>
                )}
            </div>
        </div>
      </div>

      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                  <h3 className="font-bold text-lg text-slate-800">Chi tiết vắng: {selectedReportClass}</h3>
                  <p className="text-xs text-slate-500">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1).toLowerCase()}: {dateValue}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4">
                {absenceLogs.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="px-4 py-3 font-semibold">Thời gian</th>
                                <th className="px-4 py-3 font-semibold">Học sinh</th>
                                <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                                <th className="px-4 py-3 font-semibold">Lý do</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {absenceLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm text-slate-600">{log.date.split('-').reverse().join('/')}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-bold text-slate-800">{log.studentName}</div>
                                        <div className="text-xs text-slate-400">{log.studentCode}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {log.status === 'EXCUSED' ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" /> Có phép</span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" /> Không phép</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500 italic">{log.note || '...'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <CheckCircle className="w-12 h-12 text-green-200 mb-2" />
                        <p>Không có học sinh vắng trong khoảng thời gian này.</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAdmin;
