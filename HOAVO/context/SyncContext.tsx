
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { api } from '../services/api';

// Định nghĩa cấu trúc Cache cho toàn bộ ứng dụng
interface AppData {
  Students: any[];
  Teachers: any[];
  VocationalClasses: any[];
  AcademicClasses: any[];
  Departments: any[];
  Vocations: any[];
  Users: any[];
  Attendance: any[];
  Behavior: any[];
  SystemConfig: any[];
}

const INITIAL_DATA: AppData = {
  Students: [],
  Teachers: [],
  VocationalClasses: [],
  AcademicClasses: [],
  Departments: [],
  Vocations: [],
  Users: [],
  Attendance: [],
  Behavior: [],
  SystemConfig: []
};

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSynced: Date | null;
  data: AppData;
  syncNow: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
  saveRecord: (table: keyof AppData, item: any, isUpdate?: boolean) => Promise<void>;
  saveBatch: (table: keyof AppData, items: any[]) => Promise<void>;
  removeRecord: (table: keyof AppData, id: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const cached = localStorage.getItem('APP_CACHE');
    const lastTime = localStorage.getItem('LAST_SYNCED');
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cache", e);
      }
    }
    if (lastTime) {
      setLastSynced(new Date(lastTime));
    }
    checkConnection();
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      await api.fetch('Users'); 
      setIsOnline(true);
      return true;
    } catch (e) {
      setIsOnline(false);
      return false;
    }
  }, []);

  // Helper function: Parse chuỗi JSON thành mảng cho trường subjectTeacherIds
  const parseClassData = (classList: any[]) => {
      if (!Array.isArray(classList)) return [];
      return classList.map(cls => {
          let ids = cls.subjectTeacherIds;
          // Nếu là chuỗi JSON (từ Sheet), parse nó ra
          if (typeof ids === 'string' && (ids.startsWith('[') || ids.startsWith('{'))) {
              try {
                  ids = JSON.parse(ids);
              } catch (e) {
                  ids = [];
              }
          }
          // Đảm bảo luôn là mảng
          if (!Array.isArray(ids)) ids = [];
          
          return { ...cls, subjectTeacherIds: ids };
      });
  };

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    
    try {
      const connected = await checkConnection();
      if (connected) {
        console.log("Starting manual sync...");
        const [users, teachers, students, vClasses, aClasses, depts, vocs, attendance, behavior, sysConfig] = await Promise.all([
          api.fetch('Users'),
          api.fetch('Teachers'),
          api.fetch('Students'),
          api.fetch('VocationalClasses'),
          api.fetch('AcademicClasses'),
          api.fetch('Departments'),
          api.fetch('Vocations'),
          api.fetch('Attendance'),
          api.fetch('Behavior'),
          api.fetch('SystemConfig')
        ]);

        const CLASS_TO_DELETE = 'CNT K17A';

        // --- DATA CLEANUP: Lọc và xóa lớp CNT K17A và các dữ liệu liên quan ---
        // 1. Lọc bỏ lớp nghề cần xóa
        const filteredVClasses = (vClasses || []).filter((cls: any) => cls.className !== CLASS_TO_DELETE);

        // 2. Lọc bỏ học sinh thuộc lớp đó
        const filteredStudents = (students || []).filter((stu: any) => stu.class !== CLASS_TO_DELETE);

        // 3. Lọc bỏ các bản ghi điểm danh của lớp đó
        const filteredAttendance = (attendance || []).filter((att: any) => att.classId !== CLASS_TO_DELETE && att.className !== CLASS_TO_DELETE);

        // 4. Lọc bỏ các bản ghi nề nếp của lớp đó
        const filteredBehavior = (behavior || []).filter((beh: any) => beh.classId !== CLASS_TO_DELETE);


        // Xử lý dữ liệu thô từ API trước khi lưu vào State
        const processedVClasses = parseClassData(filteredVClasses);
        const processedAClasses = parseClassData(aClasses);

        const newData: AppData = {
          Users: users || [],
          Teachers: teachers || [],
          Students: filteredStudents || [],
          VocationalClasses: processedVClasses || [],
          AcademicClasses: processedAClasses || [],
          Departments: depts || [],
          Vocations: vocs || [],
          Attendance: filteredAttendance || [], 
          Behavior: filteredBehavior || [],
          SystemConfig: sysConfig || []
        };

        setData(newData);
        localStorage.setItem('APP_CACHE', JSON.stringify(newData));
        
        const now = new Date();
        setLastSynced(now);
        localStorage.setItem('LAST_SYNCED', now.toISOString());
      }
    } catch (err) {
      console.error("Sync failed:", err);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [checkConnection]); 

  useEffect(() => {
    const initTimer = setTimeout(() => {
        syncNow();
    }, 1000); 
    return () => clearTimeout(initTimer);
  }, [syncNow]);

  const saveRecord = async (table: keyof AppData, item: any, isUpdate = false) => {
    const prevList = [...data[table]];
    
    // Update local state immediately (Optimistic UI)
    setData(currentData => {
      const currentList = currentData[table] || [];
      let updatedList;

      if (isUpdate) {
        updatedList = currentList.map((r: any) => r.id === item.id ? item : r);
      } else {
        const filteredList = currentList.filter((r: any) => r.id !== item.id);
        updatedList = [...filteredList, item];
      }
      
      const newData = { ...currentData, [table]: updatedList };
      localStorage.setItem('APP_CACHE', JSON.stringify(newData));
      return newData;
    });

    // Background sync
    (async () => {
      try {
        if (isUpdate) {
          await api.update(table, item);
        } else {
          await api.create(table, item);
        }
      } catch (error) {
        console.error("Background save failed, rolling back...", error);
        setData(currentData => {
          const recoveredData = { ...currentData, [table]: prevList };
          localStorage.setItem('APP_CACHE', JSON.stringify(recoveredData));
          return recoveredData;
        });
        alert(`Lỗi kết nối: Dữ liệu chưa được lưu lên Server.`);
      }
    })();
  };

  const saveBatch = async (table: keyof AppData, items: any[]) => {
    // 1. Optimistic Update: Cập nhật UI ngay lập tức
    const prevList = [...data[table]];
    
    setData(currentData => {
        const currentList = currentData[table] || [];
        // Tạo map để merge nhanh
        const itemMap = new Map(currentList.map((i: any) => [i.id, i]));
        
        // Merge items mới vào (đè lên cũ nếu trùng ID)
        items.forEach(item => {
            itemMap.set(item.id, item);
        });
        
        const updatedList = Array.from(itemMap.values());
        
        const newData = { ...currentData, [table]: updatedList };
        localStorage.setItem('APP_CACHE', JSON.stringify(newData));
        return newData;
    });

    // 2. Background Sync: Gửi từng item hoặc batch lên server
    // Do API Google Script hiện tại chỉ hỗ trợ create/update từng dòng, ta sẽ loop
    // (Lưu ý: Cách này hơi chậm nếu data lớn, nhưng an toàn. Tốt nhất Backend nên hỗ trợ batch)
    (async () => {
        try {
            // Thực hiện tuần tự để tránh nghẽn mạng/quota
            for (const item of items) {
                const exists = prevList.some((r: any) => r.id === item.id);
                if (exists) {
                    await api.update(table, item);
                } else {
                    await api.create(table, item);
                }
                // Delay nhẹ để tránh hit rate limit của Google
                await new Promise(r => setTimeout(r, 100)); 
            }
        } catch (error) {
            console.error("Batch save failed partway", error);
            // Không rollback toàn bộ vì có thể một số đã thành công
            alert(`Cảnh báo: Có lỗi xảy ra trong quá trình đồng bộ lên Server. Vui lòng kiểm tra kết nối.`);
        }
    })();
  };

  const removeRecord = async (table: keyof AppData, id: string) => {
    const prevList = [...data[table]];

    setData(currentData => {
      const currentList = currentData[table] || [];
      const updatedList = currentList.filter((r: any) => r.id !== id);
      const newData = { ...currentData, [table]: updatedList };
      localStorage.setItem('APP_CACHE', JSON.stringify(newData));
      return newData;
    });

    (async () => {
      try {
        await api.delete(table, id);
      } catch (error) {
        console.error("Background delete failed, rolling back...", error);
        setData(currentData => {
          const recoveredData = { ...currentData, [table]: prevList };
          localStorage.setItem('APP_CACHE', JSON.stringify(recoveredData));
          return recoveredData;
        });
        alert(`Lỗi kết nối: Không thể xóa dữ liệu trên Server.`);
      }
    })();
  };

  return (
    <SyncContext.Provider value={{ 
      isOnline, isSyncing, lastSynced, 
      data, syncNow, checkConnection,
      saveRecord, saveBatch, removeRecord
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
