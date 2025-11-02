// ========================================
// 登录页面功能
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    
    // 如果已登录，重定向到首页
    if (TokenManager.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // 隐藏错误信息
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        // 表单验证
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }
        
        try {
            // 调用登录API
            const response = await authAPI.login(username, password);
            
            // 保存token和用户信息
            // 后端返回格式：{code: 200, data: {token: "...", user: {...}}}
            const responseData = response.data || response;
            
            // 保存token和用户信息
            if (responseData.token) {
                TokenManager.setToken(responseData.token);
                console.log('Token已保存:', responseData.token.substring(0, 20) + '...');
            } else {
                console.error('登录响应中没有token:', responseData);
            }
            
            if (responseData.user) {
                UserManager.setUserInfo(responseData.user);
                console.log('用户信息已保存:', responseData.user);
            }
            
            // 验证保存是否成功
            const savedToken = TokenManager.getToken();
            if (!savedToken) {
                console.error('Token保存失败！');
                showError('登录状态保存失败，请重试');
                return;
            }
            
            // 登录成功，跳转到原页面或首页
            // 使用 setTimeout 确保 localStorage 写入完成
            setTimeout(() => {
                const returnUrl = new URLSearchParams(window.location.search).get('return') || 
                                  document.referrer || 
                                  '/';
                // 如果是文章详情页，返回文章详情页
                if (returnUrl.includes('/pages/post-detail.html')) {
                    window.location.href = returnUrl;
                } else {
                    window.location.href = '/';
                }
            }, 100);
            
        } catch (error) {
            console.error('登录失败:', error);
            showError(error.message || '登录失败，请检查用户名和密码');
        }
    });
});

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

