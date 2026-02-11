
// --- CẤU HÌNH KẾT NỐI ---
// Bước 1: Deploy Google Apps Script (chế độ Anyone/Bất kỳ ai)
// Bước 2: Copy URL Web App và dán vào bên dưới:
const API_URL = 'https://script.google.com/macros/s/AKfycbw4nxiho0loKAwBSOPC0dgVFr9eI_uUcEUMicrIjC-GzJy1n4CFkVLVKsDEZ7COYOva/exec'; 

// --- KHÓA BẢO MẬT ---
// Phải khớp với biến API_SECRET trong Google Apps Script
const API_KEY = 'TCKN_2026_SECURE_PASS';

// Helper: Chuyển đổi dữ liệu phức tạp (Mảng) thành chuỗi để lưu vào Sheet
const prepareDataForSave = (data: any) => {
    const payload = { ...data }; // Copy object để tránh tham chiếu
    
    // Xử lý mảng giáo viên bộ môn
    if (payload.subjectTeacherIds && Array.isArray(payload.subjectTeacherIds)) {
        payload.subjectTeacherIds = JSON.stringify(payload.subjectTeacherIds);
    }
    
    return payload;
};

export const api = {
  fetch: async (table: string) => {
    try {
      // Gửi apiKey qua query param cho GET request
      const response = await fetch(`${API_URL}?table=${table}&apiKey=${API_KEY}`);
      const json = await response.json();
      
      if (json.status === 'error') {
        // Xử lý riêng trường hợp sai Key hoặc lỗi server
        if (json.message.includes('API Key')) {
            console.error("Lỗi bảo mật: API Key không khớp với Server!");
        } else {
            console.error(`API Error fetching ${table}:`, json.message);
        }
        return [];
      }
      return json.data;
    } catch (error) {
      console.error(`Network Error fetching ${table}:`, error);
      return [];
    }
  },

  create: async (table: string, data: any) => {
    const payload = prepareDataForSave(data);
    return fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'CREATE', table, data: payload, apiKey: API_KEY }),
    }).then(res => res.json());
  },

  update: async (table: string, data: any) => {
    const payload = prepareDataForSave(data);
    return fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'UPDATE', table, data: payload, apiKey: API_KEY }),
    }).then(res => res.json());
  },

  delete: async (table: string, id: string) => {
    return fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'DELETE', table, data: { id }, apiKey: API_KEY }),
    }).then(res => res.json());
  },

  authenticate: async (username: string, password: string) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'LOGIN', 
                data: { username, password },
                apiKey: API_KEY
            }),
        });
        const json = await response.json();
        return json;
    } catch (error) {
        console.error("Auth network error:", error);
        return { status: 'error', message: 'Không thể kết nối đến máy chủ Google Script. Vui lòng kiểm tra đường truyền.' };
    }
  }
};
