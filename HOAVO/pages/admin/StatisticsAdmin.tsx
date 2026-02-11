
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Calendar, Filter, Library, BookOpen, Loader2, Printer, RefreshCw } from 'lucide-react';
import { useSync } from '../../context/SyncContext';

// --- Helper Functions ---
const getTotalSessions = (item: { present: number, excused: number, unexcused: number }): number => {
    return item.present + item.excused + item.unexcused;
}

// --- Printable Report Component ---
const PrintableReport = ({ academicData, vocationalData, timeframe, dateValue }: any) => {
  const timeframeLabels: Record<string, string> = {
    week: 'Tuần', month: 'Tháng', term: 'Học Kỳ', year: 'Năm'
  };

  return (
    <div className="printable-area p-8 font-sans text-black bg-white">
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold uppercase">Trường Trung Cấp Kỹ Nghệ Hà Tĩnh</h1>
        <h2 className="text-2xl font-bold mt-4">BÁO CÁO THỐNG KÊ CHUYÊN CẦN</h2>
        <p className="mt-2 text-sm font-medium">
          {timeframeLabels[timeframe]}: {dateValue}
        </p>
        <p className="text-xs text-gray-600 italic mt-1">Ngày xuất báo cáo: {new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>
      </div>

      {/* Academic Classes Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1 uppercase flex items-center">
            <span className="bg-black text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2">1</span>
            Thống kê Lớp Văn hóa
        </h3>
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-gray-400 p-2 w-12">STT</th>
              <th className="border border-gray-400 p-2 text-left">Tên Lớp</th>
              <th className="border border-gray-400 p-2 text-right">Có mặt</th>
              <th className="border border-gray-400 p-2 text-right">Có phép</th>
              <th className="border border-gray-400 p-2 text-right">Không phép</th>
              <th className="border border-gray-400 p-2 text-right">Tổng lượt</th>
              <th className="border border-gray-400 p-2 text-center">Tỉ lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            {academicData.length > 0 ? academicData.map((item: any, index: number) => (
              <tr key={item.className}>
                <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 p-2 font-semibold">{item.className}</td>
                <td className="border border-gray-400 p-2 text-right">{item.present}</td>
                <td className="border border-gray-400 p-2 text-right">{item.excused}</td>
                <td className="border border-gray-400 p-2 text-right">{item.unexcused}</td>
                <td className="border border-gray-400 p-2 text-right font-semibold">{getTotalSessions(item)}</td>
                <td className="border border-gray-400 p-2 text-center font-bold">{item.attendanceRate}</td>
              </tr>
            )) : (
                <tr><td colSpan={7} className="border border-gray-400 p-4 text-center italic">Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Vocational Classes Table */}
      <div>
        <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1 uppercase flex items-center">
            <span className="bg-black text-white w-6 h-6 flex items-center justify-center rounded-full text-xs mr-2">2</span>
            Thống kê Lớp Nghề
        </h3>
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-gray-400 p-2 w-12">STT</th>
              <th className="border border-gray-400 p-2 text-left">Tên Lớp</th>
              <th className="border border-gray-400 p-2 text-right">Có mặt</th>
              <th className="border border-gray-400 p-2 text-right">Có phép</th>
              <th className="border border-gray-400 p-2 text-right">Không phép</th>
              <th className="border border-gray-400 p-2 text-right">Tổng lượt</th>
              <th className="border border-gray-400 p-2 text-center">Tỉ lệ (%)</th>
            </tr>
          </thead>
          <tbody>
            {vocationalData.length > 0 ? vocationalData.map((item: any, index: number) => (
              <tr key={item.className}>
                <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 p-2 font-semibold">{item.className}</td>
                <td className="border border-gray-400 p-2 text-right">{item.present}</td>
                <td className="border border-gray-400 p-2 text-right">{item.excused}</td>
                <td className="border border-gray-400 p-2 text-right">{item.unexcused}</td>
                <td className="border border-gray-400 p-2 text-right font-semibold">{getTotalSessions(item)}</td>
                <td className="border border-gray-400 p-2 text-center font-bold">{item.attendanceRate}</td>
              </tr>
            )) : (
                <tr><td colSpan={7} className="border border-gray-400 p-4 text-center italic">Không có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
       <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', paddingRight: '20px', paddingLeft: '20px' }}>
          <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 'bold' }}>Người lập biểu</p>
              <p style={{ fontStyle: 'italic', fontSize: '12px' }}>(Ký, ghi rõ họ tên)</p>
          </div>
          <div style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 'bold' }}>Ban Giám Hiệu</p>
              <p style={{ fontStyle: 'italic', fontSize: '12px' }}>(Ký, đóng dấu)</p>
          </div>
      </div>
    </div>
  );
};


const StatisticsAdmin: React.FC = () => {
  const { data, syncNow, isSyncing } = useSync();
  // Lấy dữ liệu thật từ Context
  const attendanceLogs = data.Attendance || [];
  const students = data.Students || [];
  const vocationalClasses = data.VocationalClasses || [];
  const academicClasses = data.AcademicClasses || [];

  const [timeframe, setTimeframe] = useState('month');
  const [dateValue, setDateValue] = useState(() => {
     const now = new Date();
     const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
     return vnDate.slice(0, 7); // Default current month YYYY-MM
  });
  
  // --- Helpers for Date Logic (Reused) ---
  const getDateRange = (type: string, value: string): { start: string, end: string } => {
    if (!value) return { start: '0000-00-00', end: '9999-99-99' };

    if (type === 'year') {
      return { start: `${value}-01-01`, end: `${value}-12-31` };
    }
    if (type === 'term') {
       // Cập nhật cho năm học 2025-2026
       if (value === '2025-1') return { start: '2025-09-05', end: '2026-01-15' }; // HK1
       if (value === '2025-2') return { start: '2026-01-16', end: '2026-05-31' }; // HK2
       return { start: '0000-00-00', end: '9999-99-99' };
    }
    if (type === 'month') {
      const [y, m] = value.split('-').map(Number);
      const start = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const end = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
      return { start, end };
    } 
    if(type === 'week' && value.includes('-W')) {
        const [yearStr, weekStr] = value.split('-W');
        const y = parseInt(yearStr);
        const w = parseInt(weekStr);
        const simple = new Date(y, 0, 1 + (w - 1) * 7);
        const dayOfWeek = simple.getDay();
        const ISOweekStart = simple;
        if (dayOfWeek <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        
        // FIX: Manual formatting to avoid UTC time zone shifts (e.g. 00:00 VN -> 17:00 Prev Day UTC)
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

  // --- Real-time Aggregation Logic ---
  const { academicChartData, vocationalChartData } = useMemo(() => {
    const { start, end } = getDateRange(timeframe, dateValue);
    
    const filteredLogs = attendanceLogs.filter((log: any) => {
        let normalizedDate = log.date;
        if (normalizedDate && (typeof normalizedDate === 'string') && (normalizedDate.includes('T') || normalizedDate.includes('Z'))) {
            try {
                normalizedDate = new Date(normalizedDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
            } catch (e) {
                normalizedDate = log.date.substring(0, 10);
            }
        }
        return normalizedDate >= start && normalizedDate <= end;
    });

    const vStats: Record<string, any> = {};
    vocationalClasses
        .filter((c: any) => c.className && c.className !== 'N/A')
        .forEach((c: any) => {
            vStats[c.className] = { className: c.className, present: 0, excused: 0, unexcused: 0 };
    });

    const aStats: Record<string, any> = {};
    academicClasses
        .filter((c: any) => c.className && c.className !== 'N/A')
        .forEach((c: any) => {
            aStats[c.className] = { className: c.className, present: 0, excused: 0, unexcused: 0 };
    });

    filteredLogs.forEach((log: any) => {
        const vocClassName = log.classId || log.className;
        if (vStats[vocClassName]) {
             if (log.status === 'PRESENT') vStats[vocClassName].present++;
             else if (log.status === 'EXCUSED') vStats[vocClassName].excused++;
             else if (log.status === 'UNEXCUSED') vStats[vocClassName].unexcused++;
        }

        const student = students.find((s: any) => s.id === log.studentId);
        const acClass = student?.academicClass;
        
        if (acClass && aStats[acClass]) {
            if (log.status === 'PRESENT') aStats[acClass].present++;
            else if (log.status === 'EXCUSED') aStats[acClass].excused++;
            else if (log.status === 'UNEXCUSED') aStats[acClass].unexcused++;
        }
    });

    const processStats = (statsObj: any) => Object.values(statsObj).map((item: any) => {
        const total = item.present + item.excused + item.unexcused;
        return {
            ...item,
            attendanceRate: total === 0 ? '0.0' : ((item.present / total) * 100).toFixed(1)
        };
    });

    return {
        academicChartData: processStats(aStats).sort((a: any, b: any) => a.className.localeCompare(b.className)),
        vocationalChartData: processStats(vStats).sort((a: any, b: any) => a.className.localeCompare(b.className))
    };

  }, [attendanceLogs, students, vocationalClasses, academicClasses, timeframe, dateValue]);

  const handlePrint = () => {
      window.print();
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 z-50">
          <p className="font-bold text-slate-800">{label}</p>
          <p className="text-sm font-semibold text-green-600 mt-1">Tỉ lệ chuyên cần: {payload[0].payload.attendanceRate}%</p>
          <div className="mt-2 space-y-1">
            {payload.map((pld: any) => (
                <div key={pld.dataKey} className="text-xs flex justify-between gap-4">
                <span style={{ color: pld.fill }}>{pld.name}:</span>
                <span className="font-bold">{pld.value}</span>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <PrintableReport 
          academicData={academicChartData} 
          vocationalData={vocationalChartData}
          timeframe={timeframe}
          dateValue={dateValue}
      />
      <div className="space-y-8 no-print">
        {/* Header */}
        <div className="flex justify-between items-start">
            <div>
            <h2 className="text-2xl font-bold text-slate-800">Thống kê chuyên cần</h2>
            <p className="text-slate-500">Biểu đồ tổng hợp tình hình điểm danh toàn trường từ dữ liệu thực tế.</p>
            </div>
            <button onClick={() => syncNow()} disabled={isSyncing} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Làm mới dữ liệu">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-end">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Xem theo</label>
            <select
              value={timeframe}
              onChange={(e) => {
                  const newTimeframe = e.target.value;
                  setTimeframe(newTimeframe);
                  
                  // Reset mốc thời gian phù hợp khi đổi loại (theo giờ VN)
                  const now = new Date();
                  const vnDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                  
                  if (newTimeframe === 'week') setDateValue('2025-W40'); // Giữ mẫu cũ
                  else if (newTimeframe === 'month') setDateValue(vnDate.slice(0, 7));
                  else if (newTimeframe === 'term') setDateValue('2025-1');
                  else if (newTimeframe === 'year') setDateValue(vnDate.slice(0, 4));
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="term">Học kỳ</option>
              <option value="year">Năm</option>
            </select>
          </div>
          <div className="w-full sm:w-64">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Thời gian</label>
              {timeframe === 'term' ? (
                  <select 
                      value={dateValue} 
                      onChange={e => setDateValue(e.target.value)} 
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                      <option value="2025-1">Học Kỳ I (2025-2026)</option>
                      <option value="2025-2">Học Kỳ II (2025-2026)</option>
                  </select>
              ) : (
                  <div className="relative">
                      <input
                          type={timeframe === 'week' ? 'week' : timeframe === 'month' ? 'month' : 'number'}
                          value={dateValue}
                          onChange={(e) => setDateValue(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          {...(timeframe === 'year' && { placeholder: 'YYYY', min: "2020", max: "2030" })}
                      />
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
              )}
          </div>
          <button 
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors flex items-center justify-center shadow-sm ml-auto"
          >
            <Printer className="w-4 h-4 mr-2" />
            In Báo cáo
          </button>
        </div>

        {/* Vocational Classes Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-sky-600" />
            Thống kê theo Lớp Nghề
          </h3>
          <div className="h-96 w-full">
            {vocationalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vocationalChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="className" axisLine={false} tickLine={false} fontSize={12} interval={0} angle={-30} textAnchor="end" height={60} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="present" name="Có mặt" fill="#22c55e" stackId="a" />
                    <Bar dataKey="excused" name="Có phép" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="unexcused" name="Không phép" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]}>
                        <LabelList 
                            dataKey="attendanceRate" 
                            position="top" 
                            fill="#64748b" 
                            fontSize={11} 
                            fontWeight="bold" 
                            formatter={(value: string) => `${value}%`} 
                        />
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">Chưa có dữ liệu thống kê cho lớp nghề</div>
            )}
          </div>
        </div>

        {/* Academic Classes Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center">
            <Library className="w-5 h-5 mr-2 text-indigo-600" />
            Thống kê theo Lớp Văn hóa
          </h3>
          <div className="h-96 w-full">
            {academicChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={academicChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="className" axisLine={false} tickLine={false} fontSize={12} interval={0} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend iconType="circle" />
                    <Bar dataKey="present" name="Có mặt" fill="#22c55e" stackId="a" />
                    <Bar dataKey="excused" name="Có phép" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="unexcused" name="Không phép" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]}>
                        <LabelList 
                            dataKey="attendanceRate" 
                            position="top" 
                            fill="#64748b" 
                            fontSize={11} 
                            fontWeight="bold" 
                            formatter={(value: string) => `${value}%`} 
                        />
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400 italic">Chưa có dữ liệu thống kê cho lớp văn hóa</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StatisticsAdmin;
