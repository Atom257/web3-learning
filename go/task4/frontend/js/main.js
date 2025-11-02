// ========================================
// 全局配置和工具函数
// ========================================

// API 基础URL（根据你的后端地址修改）
const API_BASE_URL = 'http://localhost:8080/api';

// Token 管理
const TokenManager = {
    getToken: () => {
        return localStorage.getItem('token');
    },
    
    setToken: (token) => {
        localStorage.setItem('token', token);
    },
    
    removeToken: () => {
        localStorage.removeItem('token');
    },
    
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    }
};

// 用户信息管理
const UserManager = {
    getUserInfo: () => {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    },
    
    setUserInfo: (userInfo) => {
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
    },
    
    removeUserInfo: () => {
        localStorage.removeItem('userInfo');
    }
};

// API 请求封装
const api = {
    async request(url, options = {}) {
        const token = TokenManager.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, finalOptions);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || '请求失败');
            }
            
            return data;
        } catch (error) {
            console.error('API请求错误:', error);
            throw error;
        }
    },
    
    get(url) {
        return this.request(url, { method: 'GET' });
    },
    
    post(url, body) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    put(url, body) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    delete(url) {
        return this.request(url, { method: 'DELETE' });
    }
};

// 用户认证相关 API
const authAPI = {
    register: (username, password, email) => {
        return api.post('/auth/register', { name: username, password, email });
    },
    
    login: (username, password) => {
        return api.post('/auth/login', { name: username, password });
    },
    
    logout: () => {
        TokenManager.removeToken();
        UserManager.removeUserInfo();
        window.location.href = '/';
    }
};

// 文章相关 API
const postAPI = {
    getAll: (page = 1, pageSize = 10) => {
        return api.get(`/posts?page=${page}&page_size=${pageSize}`);
    },
    
    getById: (id) => {
        return api.get(`/posts/${id}`);
    },
    
    create: (title, content) => {
        return api.post('/posts', { title, content });
    },
    
    update: (id, title, content) => {
        return api.put(`/posts/${id}`, { title, content });
    },
    
    delete: (id) => {
        return api.delete(`/posts/${id}`);
    }
};

// 评论相关 API
const commentAPI = {
    getByPostId: (postId) => {
        return api.get(`/comments/post/${postId}`);
    },
    
    create: (postId, content) => {
        return api.post('/comments', { post_id: postId, content });
    }
};

// UI 更新函数
function updateNavigation() {
    const isAuthenticated = TokenManager.isAuthenticated();
    const userInfo = UserManager.getUserInfo();
    
    const userInfoDiv = document.getElementById('userInfo');
    const guestButtonsDiv = document.getElementById('guestButtons');
    const createPostLink = document.getElementById('createPostLink');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    console.log('updateNavigation - isAuthenticated:', isAuthenticated, 'token:', TokenManager.getToken() ? '存在' : '不存在');
    console.log('updateNavigation - userInfo:', userInfo);
    
    if (isAuthenticated) {
        // 已登录状态（只要有 token 就算已登录）
        if (userInfoDiv) {
            userInfoDiv.style.display = 'block';
        }
        if (guestButtonsDiv) {
            guestButtonsDiv.style.display = 'none';
        }
        if (createPostLink) {
            // 链接元素应该使用 inline-block 或直接移除 display:none
            createPostLink.style.display = '';
            console.log('写文章按钮已显示');
        }
        // 后端返回的字段是 name，不是 username
        if (usernameDisplay) {
            usernameDisplay.textContent = userInfo?.name || userInfo?.username || '用户';
        }
    } else {
        // 未登录状态
        if (userInfoDiv) {
            userInfoDiv.style.display = 'none';
        }
        if (guestButtonsDiv) {
            guestButtonsDiv.style.display = 'flex';
        }
        if (createPostLink) {
            createPostLink.style.display = 'none';
        }
    }
}

// 初始化函数
document.addEventListener('DOMContentLoaded', () => {
    // 延迟一点更新导航栏，确保 localStorage 已完全加载
    setTimeout(() => {
        updateNavigation();
    }, 0);
    
    // 退出按钮事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authAPI.logout();
        });
    }
    
    // 写文章链接
    const createPostLink = document.getElementById('createPostLink');
    if (createPostLink) {
        createPostLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/pages/create-post.html';
        });
    }
    
    // 监听页面可见性变化，当用户从登录页返回时刷新状态
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // 页面变为可见时，重新检查登录状态并更新UI
            updateNavigation();
        }
    });
    
    // 监听 localStorage 变化（用于多标签页同步登录状态）
    window.addEventListener('storage', (e) => {
        if (e.key === 'token' || e.key === 'userInfo') {
            updateNavigation();
        }
    });
});

// 工具函数
const utils = {
    formatDate: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}天前`;
        } else if (hours > 0) {
            return `${hours}小时前`;
        } else if (minutes > 0) {
            return `${minutes}分钟前`;
        } else {
            return '刚刚';
        }
    },
    
    formatFullDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    showAlert: (message, type = 'info') => {
        // 简单的提示函数，可以后续用更好的UI组件替代
        alert(message);
    }
};

