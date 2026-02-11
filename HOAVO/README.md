# TCKN Hà Tĩnh - School Management System

Hệ thống quản lý trường học chuyên nghiệp với phân hệ dành cho Quản trị viên và Giáo viên.

## Công nghệ sử dụng
- **Core**: React 19, Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **Charts**: Recharts
- **Icons**: Lucide React

## Hướng dẫn cài đặt

### 1. Cài đặt dependencies
Chạy lệnh sau để cài đặt các thư viện cần thiết:

```bash
npm install
```

### 2. Chạy môi trường phát triển (Local)
Khởi động server development tại http://localhost:5173

```bash
npm run dev
```

### 3. Build cho Production
Tạo bản build tối ưu hóa trong thư mục `dist`:

```bash
npm run build
```

Sau khi build, bạn có thể xem thử bản production bằng lệnh:
```bash
npm run preview
```

## Triển khai (Deployment)

### Vercel
Dự án đã bao gồm file `vercel.json`. Chỉ cần kết nối repository với Vercel và deploy, routing sẽ tự động hoạt động.

### Netlify
Dự án đã được cấu hình để triển khai lên Netlify thông qua file `netlify.toml`. File này sẽ tự động thiết lập lệnh build và xử lý các route của SPA để tránh lỗi 404 khi tải lại trang.
