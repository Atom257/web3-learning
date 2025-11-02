// ========================================
// 注册页面功能
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // 如果已登录，重定向到首页
    if (TokenManager.isAuthenticated()) {
        window.location.href = '/';
        return;
    }
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // 隐藏错误和成功信息
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        // 表单验证
        if (!username || !email || !password || !confirmPassword) {
            showError('请填写所有字段');
            return;
        }
        
        if (password.length < 6) {
            showError('密码长度至少6位');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            return;
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('请输入有效的邮箱地址');
            return;
        }
        
        try {
            // 调用注册API
            const response = await authAPI.register(username, password, email);
            
            // 注册成功
            if (successMessage) {
                successMessage.textContent = '注册成功！正在跳转到登录页面...';
                successMessage.style.display = 'block';
            }
            
            // 延迟跳转到登录页
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 1500);
            
        } catch (error) {
            console.error('注册失败:', error);
            showError(error.message || '注册失败，请稍后重试');
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

