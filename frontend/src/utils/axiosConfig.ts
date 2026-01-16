import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: `${API_URL}`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Thêm token vào header nếu có
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý lỗi chung ở đây
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
      
      // Lấy message từ server response nếu có
      const serverMessage = error.response.data?.message;
      if (serverMessage) {
        // Tạo error mới với message từ server
        const customError = new Error(serverMessage);
        (customError as any).response = error.response;
        (customError as any).status = error.response.status;
        return Promise.reject(customError);
      }
      
      // Nếu không có message từ server, tạo message tiếng Việt dựa trên status code
      let errorMessage = 'Đã xảy ra lỗi';
      switch (error.response.status) {
        case 400:
          errorMessage = 'Yêu cầu không hợp lệ';
          break;
        case 401:
          errorMessage = 'Mật khẩu không đúng';
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          break;
        case 403:
          errorMessage = 'Bạn không có quyền thực hiện thao tác này';
          break;
        case 404:
          errorMessage = 'Không tìm thấy tài nguyên';
          break;
        case 500:
          errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau';
          break;
        default:
          errorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại';
      }
      
      const customError = new Error(errorMessage);
      (customError as any).response = error.response;
      (customError as any).status = error.response.status;
      return Promise.reject(customError);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.request);
      const networkError = new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng');
      return Promise.reject(networkError);
    } else {
      // Something else happened
      console.error('Error:', error.message);
      const unknownError = new Error(error.message || 'Đã xảy ra lỗi không xác định');
      return Promise.reject(unknownError);
    }
  }
);

export default axiosInstance;

