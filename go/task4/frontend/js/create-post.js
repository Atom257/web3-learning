// ========================================
// 创建/编辑文章页面功能
// ========================================

let isEditMode = false;
let editPostId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态
    if (!TokenManager.isAuthenticated()) {
        alert('请先登录');
        window.location.href = '/pages/login.html';
        return;
    }
    
    // 检查是否为编辑模式
    const urlParams = new URLSearchParams(window.location.search);
    editPostId = urlParams.get('edit');
    
    if (editPostId) {
        isEditMode = true;
        document.getElementById('pageTitle').textContent = '编辑文章 - 个人博客';
        document.getElementById('formTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>编辑文章';
        document.querySelector('button[type="submit"]').innerHTML = '<i class="bi bi-check-circle me-2"></i>保存修改';
        loadPostForEdit();
    }
    
    // 表单提交
    const postForm = document.getElementById('postForm');
    if (postForm) {
        postForm.addEventListener('submit', handleFormSubmit);
    }
});

// 加载文章用于编辑
async function loadPostForEdit() {
    try {
        const response = await postAPI.getById(editPostId);
        console.log('编辑模式 - API响应:', response);
        
        // 后端返回格式：{code: 200, data: {post: {...}}}
        let post = null;
        if (response && response.data) {
            post = response.data.post || response.data;
        } else {
            post = response;
        }
        
        if (!post) {
            throw new Error('无法获取文章数据');
        }
        
        console.log('编辑模式 - 文章数据:', post);
        
        // 检查权限
        const userInfo = UserManager.getUserInfo();
        const postUserId = post.user_id || 
                          post.userId || 
                          post.UserID ||
                          (post.user && (post.user.id || post.user.ID)) ||
                          null;
        
        if (userInfo && postUserId) {
            const userId = userInfo.id || userInfo.ID || userInfo.user_id;
            if (userId != postUserId) {
                alert('您没有权限编辑这篇文章');
                window.location.href = '/';
                return;
            }
        }
        
        // 填充表单
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('postContent').value = post.content || '';
        
    } catch (error) {
        console.error('加载文章失败:', error);
        alert('加载文章失败: ' + (error.message || '未知错误'));
        window.location.href = '/';
    }
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const errorMessage = document.getElementById('errorMessage');
    
    // 隐藏错误信息
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    // 表单验证
    if (!title || !content) {
        showError('请填写标题和内容');
        return;
    }
    
    if (title.length < 3) {
        showError('标题至少需要3个字符');
        return;
    }
    
    if (content.length < 10) {
        showError('内容至少需要10个字符');
        return;
    }
    
    try {
        if (isEditMode) {
            // 更新文章
            await postAPI.update(editPostId, title, content);
            alert('文章更新成功！');
            window.location.href = `/pages/post-detail.html?id=${editPostId}`;
        } else {
            // 创建文章
            const response = await postAPI.create(title, content);
            console.log('创建文章响应:', response);
            
            // 后端返回格式：{code: 200, data: {post_id: 123, title: "..."}}
            // 兼容多种可能的字段名
            let postId = null;
            if (response && response.data) {
                postId = response.data.post_id || response.data.postId || response.data.id || response.data.ID;
            } else {
                postId = response.post_id || response.postId || response.id || response.ID;
            }
            
            if (!postId) {
                console.error('无法获取文章ID，响应数据:', response);
                showError('发布成功，但无法获取文章ID');
                return;
            }
            
            alert('文章发布成功！');
            window.location.href = `/pages/post-detail.html?id=${postId}`;
        }
    } catch (error) {
        console.error('保存文章失败:', error);
        showError(error.message || '保存失败，请稍后重试');
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

