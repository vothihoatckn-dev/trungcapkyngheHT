
import React, { useState, useEffect } from 'react';
import { Settings, Book, Users, Shield, Plus, Trash2, Save, ToggleLeft, ToggleRight, Loader2, Database } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { Link } from 'react-router-dom';

const SystemSettings: React.FC = () => {
  const { data, saveRecord, removeRecord } = useSync();
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'CLASSES' | 'PERMISSIONS'>('GENERAL');
  
  // Dữ liệu thật từ Context
  const vocationalClasses = data.VocationalClasses || [];
  const teachers = data.Teachers || [];
  const systemConfigs = data.SystemConfig || [];

  // State local cho SystemConfig để edit
  const [configList, setConfigList] = useState<any[]>([]);

  useEffect(() => {
    if (systemConfigs.length > 0) {
        setConfigList(systemConfigs);
    } else {
        // Không sử dụng dữ liệu demo, để trống nếu chưa đồng bộ
        setConfigList([]);
    }
  }, [systemConfigs]);

  // --- LOGIC: PERMISSIONS (TEACHERS) ---
  const toggleTeacherPermission = async (id: string, field: 'canEditReport' | 'isHeadTeacher') => {
    const teacher = teachers.find((t: any) => t.id === id);
    if (!teacher) return;

    // Toggle giá trị
    const updatedTeacher = { 
        ...teacher, 
        [field]: !teacher[field] 
    };

    // Lưu Optimistic UI
    await saveRecord('Teachers', updatedTeacher, true);
  };

  // --- LOGIC: CLASSES ---
  const deleteClass = async (id: string) => {
    if(window.confirm("Bạn có chắc chắn muốn xóa lớp nghề này không?")) {
        await removeRecord('VocationalClasses', id);
    }
  }

  // --- LOGIC: GENERAL CONFIG ---
  const handleConfigChange = (id: string, newValue: string) => {
      setConfigList(prev => prev.map(item => item.id === id ? { ...item, value: newValue } : item));
  };

  const saveConfig = async (item: any) => {
      // Nếu item chưa có id thật (dữ liệu mẫu), tạo id mới
      const record = { ...item, id: item.id.startsWith('conf_') ? Math.random().toString(36).substr(2, 9) : item.id };
      await saveRecord('SystemConfig', record, !item.id.startsWith('conf_'));
      alert(`Đã lưu cấu hình: ${item.label}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cấu hình hệ thống</h2>
          <p className="text-slate-500">Quản lý danh mục, tham số và phân quyền người dùng</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full lg:w-64 bg-white rounded-xl shadow-sm border border-slate-200 h-fit overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="font-bold text-slate-700 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Danh mục
                </h3>
            </div>
            <nav className="p-2 space-y-1">
                <button
                    onClick={() => setActiveTab('GENERAL')}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'GENERAL' 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Database className="w-4 h-4 mr-3" />
                    Tham số chung
                </button>
                <button
                    onClick={() => setActiveTab('CLASSES')}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'CLASSES' 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Book className="w-4 h-4 mr-3" />
                    Lớp nghề
                </button>
                <button
                    onClick={() => setActiveTab('PERMISSIONS')}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === 'PERMISSIONS' 
                        ? 'bg-primary-50 text-primary-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <Shield className="w-4 h-4 mr-3" />
                    Phân quyền Giáo viên
                </button>
            </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1">
            {activeTab === 'GENERAL' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800">Tham số hệ thống</h3>
                        <p className="text-sm text-slate-500">Các cấu hình dùng chung cho toàn bộ ứng dụng</p>
                    </div>
                    <div className="p-6 space-y-6">
                        {configList.map((config) => (
                            <div key={config.id} className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                                <div className="flex-1 pr-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{config.label || config.key}</label>
                                    <div className="text-xs text-slate-400 font-mono">{config.key}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="text" 
                                        value={config.value}
                                        onChange={(e) => handleConfigChange(config.id, e.target.value)}
                                        className="w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button 
                                        onClick={() => saveConfig(config)}
                                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        title="Lưu tham số này"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {configList.length === 0 && (
                            <div className="text-center py-8">
                                <p className="text-slate-500 italic mb-2">Chưa có tham số nào được đồng bộ.</p>
                                <p className="text-xs text-slate-400">Vui lòng kiểm tra Sheet "SystemConfig" hoặc chờ đồng bộ.</p>
                            </div>
                        )}
                        
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mt-6">
                            <strong>Lưu ý:</strong> Để các cấu hình này được lưu vĩnh viễn, bạn cần tạo một Sheet mới tên là <code>SystemConfig</code> trên Google Sheet với các cột: <code>id</code>, <code>key</code>, <code>value</code>, <code>label</code>.
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'CLASSES' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Danh sách lớp nghề</h3>
                        <Link to="/admin/classes" className="inline-flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
                            <Plus className="w-4 h-4 mr-2" />
                            Quản lý chi tiết
                        </Link>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {vocationalClasses.length > 0 ? vocationalClasses.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{item.className}</h4>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded mt-1 inline-block mr-2">{item.vocational}</span>
                                        <span className="text-xs text-slate-400">{item.status === 'Studying' ? 'Đang học' : 'Đã tốt nghiệp'}</span>
                                    </div>
                                    <button 
                                        onClick={() => deleteClass(item.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-2"
                                        title="Xóa lớp"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            )) : (
                                <p className="text-center text-slate-500 py-4">Chưa có lớp nghề nào được tạo. Vui lòng thêm mới trong Quản lý lớp.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'PERMISSIONS' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                     <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Phân quyền Giáo viên</h3>
                            <p className="text-xs text-slate-500 mt-1">Thay đổi sẽ được lưu tự động</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold">Giáo viên</th>
                                    <th className="px-6 py-4 font-semibold text-center">Sửa báo cáo</th>
                                    <th className="px-6 py-4 font-semibold text-center">Tổ trưởng chuyên môn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {teachers.map((teacher: any) => (
                                    <tr key={teacher.id}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{teacher.fullName}</div>
                                            <div className="text-xs text-slate-500">{teacher.email || 'Chưa có email'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => toggleTeacherPermission(teacher.id, 'canEditReport')}
                                                className={`transition-colors focus:outline-none ${teacher.canEditReport ? 'text-primary-600' : 'text-slate-300'}`}
                                                title={teacher.canEditReport ? "Đang bật" : "Đang tắt"}
                                            >
                                                {teacher.canEditReport ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                             <button 
                                                onClick={() => toggleTeacherPermission(teacher.id, 'isHeadTeacher')}
                                                className={`transition-colors focus:outline-none ${teacher.isHeadTeacher ? 'text-primary-600' : 'text-slate-300'}`}
                                                title={teacher.isHeadTeacher ? "Đang bật" : "Đang tắt"}
                                            >
                                                {teacher.isHeadTeacher ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {teachers.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-8 text-slate-500">Chưa có dữ liệu giáo viên.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-amber-50 p-4 text-sm text-amber-800 border-t border-amber-100">
                        <strong>Quan trọng:</strong> Nếu tải lại trang mà mất quyền, vui lòng vào Google Sheet tab <code>Teachers</code> và thêm 2 cột mới: <code>canEditReport</code> và <code>isHeadTeacher</code>.
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
