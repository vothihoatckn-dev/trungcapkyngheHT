
import React, { useState, useMemo } from 'react';
import { User, Award, TrendingUp, CheckCircle, ChevronDown, ChevronUp, FileDown, BarChart, TrendingDown, Loader2 } from 'lucide-react';
import { utils, writeFileXLSX } from 'xlsx';
import { useSync } from '../../context/SyncContext';

// --- Types ---
interface AbsenceRecord {
    id: string;
    date: string; // YYYY-MM-DD
    studentName: string;
    studentCode: string;
    academicClass: string;
    vocationalClass: string;
    vocationalTeacher: string;
    status: 'EXCUSED' | 'UNEXCUSED';
    note: string;
}

interface TopAbsenceStudent {
    studentName: string;
    studentCode: string;
    academicClass: string;
    absenceCount: number;
}

const IntegrationReporting: React.FC = () => {
  const { data, isSyncing } = useSync();
  const attendanceData = data.Attendance || [];
  const studentsData = data.Students || [];
  const vocationalClassesData = data.VocationalClasses || [];
  const academicClassesData = data.AcademicClasses || [];
  const teachersData = data.Teachers || [];

  // Helper to get current ISO week based on Vietnam time
  const getCurrentWeekStr = () => {
      try {
          // Create a date object based on Vietnam time
          const now = new Date();
          const vnDateString = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
          const [y, m, d] = vnDateString.split('-').map(Number);
          const date = new Date(Date.UTC(y, m - 1, d)); // UTC date representing Vietnam date

          const dayNum = date.getUTCDay() || 7;
          date.setUTCDate(date.getUTCDate() + 4 - dayNum);
          const year = date.getUTCFullYear();
          const yearStart = new Date(Date.UTC(year,0,1));
          const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
          return `${year}-W${weekNo.toString().padStart(2, '0')}`;
      } catch (e) {
          return `${new Date().getFullYear()}-W01`;
      }
  };

  const [reportType, setReportType] = useState<'WEEK' | 'MONTH' | 'TERM' | 'YEAR'>('MONTH');
  
  // Default to Vietnam current month
  const [dateValue, setDateValue] = useState(() => {
     const now = new Date();
     const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
     return vnDate.slice(0, 7);
  }); 

  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);
  
  // --- REAL DATA AGGREGATION ---
  const allAbsences = useMemo(() => {
    const absences: AbsenceRecord[] = [];

    attendanceData.forEach((record: any) => {
        // FIX TIMEZONE: Chuẩn hóa ngày về giờ Việt Nam nếu dữ liệu là ISO (UTC)
        let normalizedDate = record.date;
        if (normalizedDate && (typeof normalizedDate === 'string') && (normalizedDate.includes('T') || normalizedDate.includes('Z'))) {
            try {
                normalizedDate = new Date(normalizedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            } catch (e) {
                normalizedDate = record.date.substring(0, 10);
            }
        }

        // Kiểm tra xem record có phải vắng không
        if (record.status !== 'PRESENT') {
                const student = studentsData.find((s: any) => s.id === record.studentId);
                
                // Bỏ qua các bản ghi không có lớp văn hóa hợp lệ (N/A hoặc chưa phân lớp)
                if (!student || !student.academicClass) {
                    return; // Skip this record
                }

                const studentName = student.name || (record.studentName || record.studentId);
                const studentCode = student.code || student.id || (record.studentCode || record.studentId);
                const academicClass = student.academicClass;
                
                // Tìm thông tin lớp nghề
                const vocClass = vocationalClassesData.find((c: any) => c.id === record.classId || c.className === record.classId);
                const vocationalClassName = vocClass ? vocClass.className : record.classId;
                
                // Tìm giáo viên dạy
                const teacherObj = teachersData.find((t: any) => t.id === record.teacherId);
                const vocationalTeacherName = teacherObj ? teacherObj.fullName : 'GV';

                absences.push({
                    id: record.id,
                    date: normalizedDate,
                    studentName: studentName,
                    studentCode: studentCode,
                    academicClass: academicClass,
                    vocationalClass: vocationalClassName,
                    vocationalTeacher: vocationalTeacherName,
                    status: record.status,
                    note: record.note
                });
        }
    });
    return absences;
  }, [attendanceData, studentsData, vocationalClassesData, teachersData]);

  const getDateRange = () => {
      if (reportType === 'YEAR') { 
          const year = parseInt(dateValue) || new Date().getFullYear();
          return { start: `${year}-01-01`, end: `${year}-12-31` }; 
      }
      if (reportType === 'TERM') {
          // Format: YYYY-Term (e.g., 2025-1)
          const [yearStr, termStr] = dateValue.split('-');
          const y = parseInt(yearStr);
          const t = parseInt(termStr);
          
          if (t === 1) {
              // HK1: 05/09/Y -> 15/01/(Y+1)
              return { start: `${y}-09-01`, end: `${y+1}-01-15` };
          } else {
              // HK2: 16/01/(Y+1) -> 31/05/(Y+1)
              return { start: `${y+1}-01-16`, end: `${y+1}-05-31` };
          }
      }
      if (reportType === 'MONTH') {
          const [y, m] = dateValue.split('-').map(Number);
          const start = `${y}-${String(m).padStart(2, '0')}-01`;
          const lastDay = new Date(y, m, 0).getDate();
          const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
          return { start, end };
      }
      if (reportType === 'WEEK') {
          if (!dateValue.includes('-W')) return { start: '0000-00-00', end: '9999-99-99' };
          const [yearStr, weekStr] = dateValue.split('-W');
          const y = parseInt(yearStr), week = parseInt(weekStr);
          // Calculate start of ISO week
          const simple = new Date(y, 0, 1 + (week - 1) * 7);
          const dayOfWeek = simple.getDay() || 7;
          simple.setDate(simple.getDate() - dayOfWeek + 1);
          
          // FIX: Manual formatting to avoid UTC time zone shifts (e.g. 00:00 VN -> 17:00 Prev Day UTC)
          const formatLocalYMD = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };

          const start = formatLocalYMD(simple);
          
          const endObj = new Date(simple);
          endObj.setDate(endObj.getDate() + 6);
          const end = formatLocalYMD(endObj);
          return { start, end };
      }
      return { start: '0000-00-00', end: '9999-99-99' };
  };

  const filteredAbsences = useMemo(() => {
    const { start, end } = getDateRange();
    return allAbsences.filter(a => a.date >= start && a.date <= end).sort((a,b) => a.date.localeCompare(b.date));
  }, [reportType, dateValue, allAbsences]);

  const { groupedAbsences, topAbsentStudents } = useMemo(() => {
    const groups: Record<string, AbsenceRecord[]> = {};
    const studentCounts: Record<string, TopAbsenceStudent> = {};

    filteredAbsences.forEach(record => {
      // Nhóm theo Lớp Văn Hóa
      const acClass = record.academicClass;
      if (!groups[acClass]) groups[acClass] = [];
      groups[acClass].push(record);

      if (!studentCounts[record.studentCode]) {
        studentCounts[record.studentCode] = { studentName: record.studentName, studentCode: record.studentCode, academicClass: acClass, absenceCount: 0 };
      }
      studentCounts[record.studentCode].absenceCount++;
    });

    const topStudents = Object.values(studentCounts).sort((a, b) => b.absenceCount - a.absenceCount).slice(0, 5);
    
    return { groupedAbsences: groups, topAbsentStudents: topStudents };
  }, [filteredAbsences]);
  
  const classRankings = useMemo(() => {
    const classAbsenceCounts = Object.entries(groupedAbsences).map(([className, absences]) => ({
        className,
        absenceCount: (absences as AbsenceRecord[]).length,
    }));

    if (classAbsenceCounts.length === 0) {
        return { most: null, least: null };
    }

    classAbsenceCounts.sort((a, b) => a.absenceCount - b.absenceCount);

    const least = classAbsenceCounts[0];
    const most = classAbsenceCounts[classAbsenceCounts.length - 1];

    if (classAbsenceCounts.length === 1) {
        return { most: most, least: most };
    }

    return { most, least };
  }, [groupedAbsences]);

  const toggleClassExpand = (className: string) => {
      setExpandedClasses(prev => prev.includes(className) ? prev.filter(c => c !== className) : [...prev, className]);
  };
  
  const getAcademicTeacher = (className: string) => {
      const cls = academicClassesData.find((c: any) => c.className === className);
      return cls ? cls.homeroomTeacher : 'Chưa cập nhật';
  };

  const handleExportReport = () => {
    if (filteredAbsences.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
    }

    const wb = utils.book_new();

    // 1. Tạo một trang (sheet) cho mỗi lớp văn hóa
    for (const className in groupedAbsences) {
        if (Object.prototype.hasOwnProperty.call(groupedAbsences, className)) {
            const absences = groupedAbsences[className];
            const teacher = getAcademicTeacher(className);
            const totalAbsencesCount = absences.length;

            const excelData = absences.map(record => ({
                "Ngày Vắng": record.date,
                "Tên Học Sinh": record.studentName,
                "Mã HS": record.studentCode,
                "Lớp Nghề": record.vocationalClass,
                "GV Dạy Nghề": record.vocationalTeacher,
                "Trạng Thái": record.status === 'EXCUSED' ? 'Có phép' : 'Không phép',
                "Ghi Chú": record.note,
            }));

            const ws = utils.json_to_sheet([]); 

            // Thêm tiêu đề
            utils.sheet_add_aoa(ws, [
              [`Danh sách vắng Lớp Văn hóa: ${className}`],
              [`GVCN: ${teacher}`],
              [`Tổng số lượt vắng: ${totalAbsencesCount}`],
              [] 
            ], { origin: "A1" });

            ws["!merges"] = [
              { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, 
              { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
              { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }
            ];
            
            // Thêm dữ liệu JSON từ hàng 5
            utils.sheet_add_json(ws, excelData, { origin: "A5", skipHeader: false });

            // Cài đặt độ rộng cột
            ws['!cols'] = [
                { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 15 },
                { wch: 20 }, { wch: 12 }, { wch: 25 }
            ];

            // Làm sạch tên sheet (Excel giới hạn 31 ký tự và không cho phép ký tự đặc biệt)
            const sanitizedClassName = className.replace(/[\/\\?*[\]]/g, '').substring(0, 31);
            utils.book_append_sheet(wb, ws, sanitizedClassName);
        }
    }

    // 2. Tạo trang "Top Vắng" như cũ
    const topAbsences = topAbsentStudents.map(s => ({
        "Họ và Tên": s.studentName, "Mã HS": s.studentCode, "Lớp Văn Hóa": s.academicClass, "Số buổi vắng": s.absenceCount
    }));
    const wsTop = utils.json_to_sheet(topAbsences);
    wsTop['!cols'] = [{wch:22},{wch:8},{wch:12},{wch:15}];
    utils.book_append_sheet(wb, wsTop, "TopVangNhieuNhat");
    
    writeFileXLSX(wb, `Bao_cao_TongHop_VH_${dateValue}.xlsx`);
  };

  const handleExportVocationalAbsencesForAcademicClass = (academicClassName: string, absences: AbsenceRecord[]) => {
    if (!absences || absences.length === 0) {
        alert(`Lớp ${academicClassName} không có dữ liệu vắng để xuất.`);
        return;
    }

    const totalAbsencesCount = absences.length;

    const groupedByVocational = absences.reduce<Record<string, AbsenceRecord[]>>((acc, record) => {
        const key = record.vocationalClass || 'Không xác định';
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(record);
        return acc;
    }, {});

    const teacher = getAcademicTeacher(academicClassName);
    const ws = utils.json_to_sheet([]);
    let currentRow = 0;

    utils.sheet_add_aoa(ws, [
        [`Báo cáo Vắng mặt theo Lớp Nghề của Lớp Văn hóa: ${academicClassName}`],
        [`GVCN: ${teacher}`],
        [`Tổng số lượt vắng: ${totalAbsencesCount}`],
        []
    ], { origin: `A${currentRow + 1}` });
    currentRow += 4;

    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }
    ];

    for (const vocClass in groupedByVocational) {
        const records = groupedByVocational[vocClass];

        utils.sheet_add_aoa(ws, [[`Lớp Nghề: ${vocClass}`]], { origin: `A${currentRow + 1}` });
        ws["!merges"]?.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 5 } });
        currentRow += 1;

        const excelData = records.map(record => ({
            "Ngày Vắng": record.date,
            "Tên Học Sinh": record.studentName,
            "Mã HS": record.studentCode,
            "GV Dạy Nghề": record.vocationalTeacher,
            "Trạng Thái": record.status === 'EXCUSED' ? 'Có phép' : 'Không phép',
            "Ghi Chú": record.note,
        }));

        utils.sheet_add_json(ws, excelData, { origin: `A${currentRow + 1}`, skipHeader: false });
        
        currentRow += records.length + 2;
    }
    
    ws['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 20 },
        { wch: 12 }, { wch: 25 }
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, `DS_Vang_TheoNghe_${academicClassName}`);
    writeFileXLSX(wb, `DS_Vang_TheoNghe_${academicClassName}_${dateValue}.xlsx`);
  };

  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as any;
      setReportType(newType);
      
      const now = new Date();
      // Get current Vietnam date
      const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const [y, m] = vnDate.split('-').map(Number);

      if(newType === 'WEEK') {
          setDateValue(getCurrentWeekStr());
      }
      else if(newType === 'MONTH') {
          setDateValue(vnDate.slice(0, 7));
      }
      else if(newType === 'TERM') {
          // If month >= 9 (Sept), it's Term 1 of current year.
          // If month < 9 (Jan-Aug), it's Term 2 of previous year (start of 2nd semester)
          if (m >= 9) setDateValue(`${y}-1`);
          else setDateValue(`${y-1}-2`);
      }
      else if(newType === 'YEAR') {
          setDateValue(y.toString());
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Báo cáo & Thống kê Lớp Văn hóa</h2>
        <p className="text-slate-500">Tổng hợp và phân tích tình hình chuyên cần của các lớp văn hóa từ dữ liệu điểm danh thực tế. {isSyncing && <span className="text-blue-500 text-xs inline-flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Đang đồng bộ...</span>}</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-48">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Loại báo cáo</label>
              <select 
                  value={reportType}
                  onChange={handleReportTypeChange}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                  <option value="WEEK">Theo Tuần</option>
                  <option value="MONTH">Theo Tháng</option>
                  <option value="TERM">Theo Học Kỳ</option>
                  <option value="YEAR">Theo Năm</option>
              </select>
          </div>
          <div className="w-full md:w-auto">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Thời gian</label>
              {reportType === 'TERM' ? (
                <select value={dateValue} onChange={e => setDateValue(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="2025-1">Học Kỳ I (2025-2026)</option>
                    <option value="2025-2">Học Kỳ II (2025-2026)</option>
                    <option value="2024-1">Học Kỳ I (2024-2025)</option>
                    <option value="2024-2">Học Kỳ II (2024-2025)</option>
                </select>
              ) : (
                <input 
                  type={reportType === 'WEEK' ? 'week' : reportType === 'MONTH' ? 'month' : 'number'}
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  {...(reportType === 'YEAR' && { placeholder: 'YYYY', min: "2020", max: "2030" })}
                />
              )}
          </div>
          <button 
              onClick={handleExportReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-green-700 transition-colors h-[38px] flex items-center justify-center w-full md:w-auto"
          ><FileDown className="w-4 h-4 mr-2" /> Xuất Báo cáo</button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main report column */}
        <div className="lg:col-span-2 space-y-4">
           {Object.keys(groupedAbsences).length > 0 ? (
               Object.keys(groupedAbsences).sort().map(className => {
                   const absences = groupedAbsences[className];
                   const isExpanded = expandedClasses.includes(className);
                   const teacherName = getAcademicTeacher(className);
                   return (
                       <div key={className} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                           <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                               <div onClick={() => toggleClassExpand(className)} className="flex items-center gap-4 flex-grow cursor-pointer">
                                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-bold text-sm min-w-[60px] text-center">{className}</div>
                                    <div>
                                       <span className="text-sm text-slate-600">Tổng số vắng: <span className="font-bold text-red-600">{absences.length}</span> lượt</span>
                                       <div className="text-xs text-slate-500 mt-1 flex items-center">
                                         <User className="w-3 h-3 mr-1.5 text-slate-400" />
                                         GVCN: {teacherName}
                                       </div>
                                    </div>
                               </div>
                               <div className="flex items-center gap-2">
                                     <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportVocationalAbsencesForAcademicClass(className, absences);
                                        }}
                                        className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md flex items-center border border-blue-200 transition-colors"
                                        title={`Xuất danh sách vắng của lớp ${className}`}
                                    >
                                        <FileDown className="w-3 h-3 mr-1"/>
                                        Xuất DS
                                    </button>
                                    <button onClick={() => toggleClassExpand(className)} className="p-1">
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </button>
                               </div>
                           </div>
                           {isExpanded && (
                               <div className="overflow-x-auto max-h-96">
                                   <table className="w-full text-left border-collapse">
                                       <thead className="bg-white border-b border-slate-100 sticky top-0"><tr className="text-xs text-slate-500 uppercase">
                                           <th className="px-4 py-3 font-semibold">Ngày dạy</th><th className="px-4 py-3 font-semibold">Học sinh</th>
                                           <th className="px-4 py-3 font-semibold">Lớp Nghề</th><th className="px-4 py-3 font-semibold">Lý do</th>
                                       </tr></thead>
                                       <tbody className="divide-y divide-slate-100">
                                           {absences.map(record => (
                                               <tr key={record.id} className="hover:bg-slate-50/50">
                                                   <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{record.date.split('-').reverse().join('/')}</td>
                                                   <td className="px-4 py-3"><div className="text-sm font-bold text-slate-800">{record.studentName}</div><div className="text-xs text-slate-400">{record.studentCode}</div></td>
                                                   <td className="px-4 py-3"><div className="text-sm text-slate-800 font-medium">{record.vocationalClass}</div><div className="text-xs text-slate-500">GV: {record.vocationalTeacher}</div></td>
                                                   <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${record.status === 'EXCUSED' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>{record.status === 'EXCUSED' ? 'Có phép' : 'K.Phép'}</span> <span className="text-xs italic text-slate-500">{record.note}</span></td>
                                               </tr>
                                           ))}
                                       </tbody>
                                   </table>
                               </div>
                           )}
                       </div>
                   );
               })
           ) : (
               <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 col-span-full">
                   <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                   <h3 className="text-lg font-medium text-slate-800">Không có dữ liệu vắng</h3>
                   <p className="text-slate-500">Trong khoảng thời gian này không có học sinh nào vắng mặt.</p>
               </div>
           )}
        </div>

        {/* Statistics Column */}
        <div className="space-y-6">
           <div className="bg-white rounded-xl shadow-sm border border-slate-200">
               <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                   <h3 className="font-bold text-slate-800 flex items-center"><BarChart className="w-5 h-5 mr-2 text-primary-600"/>Thống kê chung</h3>
               </div>
               <div className="p-4 space-y-3 text-sm">
                   <div className="flex justify-between items-center">
                       <span className="text-slate-600">Số lớp có dữ liệu:</span>
                       <span className="font-bold text-slate-800">{Object.keys(groupedAbsences).length}</span>
                   </div>
                   <div className="flex justify-between items-center">
                       <span className="text-slate-600">Tổng lượt vắng:</span>
                       <span className="font-bold text-red-600">{filteredAbsences.length}</span>
                   </div>
               </div>
           </div>
           <div className="bg-white rounded-xl shadow-sm border border-slate-200">
               <div className="p-4 border-b border-slate-100 bg-red-50/50">
                   <h3 className="font-bold text-red-800 flex items-center"><TrendingDown className="w-5 h-5 mr-2"/>Học sinh vắng nhiều nhất</h3>
               </div>
               <div className="p-4 space-y-3">
                 {topAbsentStudents.length > 0 ? topAbsentStudents.map(student => (
                   <div key={student.studentCode} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                       <div>
                           <p className="text-sm font-bold text-slate-800">{student.studentName}</p>
                           <p className="text-xs text-slate-500">{student.academicClass} - {student.studentCode}</p>
                       </div>
                       <div className="text-sm font-bold text-white bg-red-500 w-8 h-8 flex items-center justify-center rounded-full shadow-sm border-2 border-white">{student.absenceCount}</div>
                   </div>
                 )) : (
                    <p className="text-center text-sm text-slate-500 py-4">Không có dữ liệu.</p>
                 )}
               </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationReporting;
