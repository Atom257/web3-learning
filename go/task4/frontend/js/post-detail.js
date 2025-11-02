// ========================================
// 文章详情页功能
// ========================================

let currentPostId = null;
let currentPostUserId = null;

// 模拟文章数据（与首页一致）
const mockPosts = {
    1: {
        id: 1,
        title: 'Go 语言并发编程的优雅实践',
        content: `Go 语言以其出色的并发模型而闻名。在这篇文章中，我们将深入探讨 goroutine、channel 和 select 语句的使用技巧，以及如何在实际项目中优雅地处理并发编程。

## Goroutine 的使用

Goroutine 是 Go 语言并发的基础。通过简单的 go 关键字，我们可以轻松创建轻量级线程。

\`\`\`go
go func() {
    fmt.Println("这是在一个 goroutine 中")
}()
\`\`\`

## Channel 通信

Channel 是 goroutine 之间通信的桥梁，它提供了类型安全的通信机制。

\`\`\`go
ch := make(chan int, 1)
ch <- 42
value := <-ch
\`\`\`

## Select 语句

Select 语句让 goroutine 可以同时等待多个 channel 操作，这是处理并发场景的强大工具。

通过实际的代码示例，你将学会如何避免常见的并发陷阱，编写出既高效又安全的并发代码。在实际项目中，合理的并发设计可以显著提升系统性能。`,
        username: '技术达人',
        user_id: 1,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    2: {
        id: 2,
        title: 'Gin 框架构建 RESTful API 完整指南',
        content: `Gin 是一个用 Go 编写的 HTTP web 框架，以其高性能和简洁的 API 而受到开发者喜爱。本文将带你从零开始，学习如何使用 Gin 框架构建一个完整的 RESTful API。

## 项目初始化

首先，我们需要初始化一个 Go 模块并安装 Gin 框架。

\`\`\`bash
go mod init myapi
go get -u github.com/gin-gonic/gin
\`\`\`

## 路由设计

Gin 提供了简洁的路由设计方式，支持 RESTful 风格的路由定义。

\`\`\`go
r := gin.Default()
r.GET("/users", getUsers)
r.POST("/users", createUser)
r.PUT("/users/:id", updateUser)
r.DELETE("/users/:id", deleteUser)
\`\`\`

## 中间件使用

中间件是 Gin 框架中非常重要的一部分，可以用于日志记录、认证、CORS 处理等。

我们将涵盖路由设计、中间件使用、参数验证、错误处理等核心内容，帮助你快速上手 Web 开发。`,
        username: '后端工程师',
        user_id: 2,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    3: {
        id: 3,
        title: 'GORM 数据库操作最佳实践',
        content: `GORM 是 Go 语言中最受欢迎的 ORM 库之一。本文将详细介绍 GORM 的高级特性，包括模型定义、关联查询、事务处理、预加载优化等。

## 模型定义

在 GORM 中，模型定义非常简单直观。

\`\`\`go
type User struct {
    ID       uint   \`gorm:"primaryKey"\`
    Username string \`gorm:"uniqueIndex"\`
    Email    string
    CreatedAt time.Time
}
\`\`\`

## 关联查询

GORM 支持多种关联关系：Has One、Has Many、Belongs To、Many To Many。

\`\`\`go
type User struct {
    ID      uint
    Posts   []Post  // Has Many
    Profile Profile // Has One
}
\`\`\`

## 事务处理

GORM 提供了简单的事务处理方式，确保数据的一致性。

通过实际案例，我们将展示如何利用 GORM 简化数据库操作，提高开发效率，同时保证代码的可维护性和性能。`,
        username: '数据库专家',
        user_id: 3,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    4: {
        id: 4,
        title: 'JWT 认证在 Go 项目中的实现',
        content: `JSON Web Token (JWT) 是现代 Web 应用中最常用的身份认证方式之一。本文将教你如何在 Go 项目中实现完整的 JWT 认证流程。

## JWT 简介

JWT 是一种开放标准，用于在各方之间安全地传输信息。它由三部分组成：Header、Payload 和 Signature。

## Token 生成

在 Go 中，我们可以使用 github.com/golang-jwt/jwt 库来生成和验证 JWT。

\`\`\`go
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
tokenString, err := token.SignedString(secretKey)
\`\`\`

## Token 验证

验证 JWT 是确保请求合法性的关键步骤。

\`\`\`go
token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
    return secretKey, nil
})
\`\`\`

我们将讨论安全最佳实践，包括密钥管理、token 刷新机制等，帮助你构建安全可靠的认证系统。`,
        username: '安全专家',
        user_id: 1,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    5: {
        id: 5,
        title: '前后端分离架构下的 API 设计',
        content: `在前后端分离的架构中，良好的 API 设计至关重要。本文将分享 API 设计的最佳实践。

## RESTful 规范

遵循 RESTful 规范可以让 API 更加清晰和易于理解。

- GET: 获取资源
- POST: 创建资源
- PUT: 更新资源
- DELETE: 删除资源

## 状态码使用

合理使用 HTTP 状态码可以让客户端更好地处理响应。

- 200: 成功
- 201: 创建成功
- 400: 请求错误
- 401: 未授权
- 404: 资源不存在
- 500: 服务器错误

## 错误处理

统一的错误响应格式有助于前端统一处理错误情况。

通过实际案例，我们将展示如何设计出既符合规范又易于使用的 API，提升前后端协作效率。`,
        username: '架构师',
        user_id: 2,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    6: {
        id: 6,
        title: '使用 Docker 容器化 Go 应用',
        content: `Docker 已经成为现代应用部署的标准工具。本文将详细介绍如何将 Go 应用容器化。

## Dockerfile 编写

为 Go 应用编写 Dockerfile 需要考虑多阶段构建以减小镜像大小。

\`\`\`dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o app .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/app .
CMD ["./app"]
\`\`\`

## 多阶段构建

多阶段构建可以显著减小最终镜像的大小，提高部署效率。

## 镜像优化

通过合理使用缓存和选择合适的基础镜像，可以进一步优化构建速度。

我们还将探讨如何在开发和生产环境中使用 Docker，以及如何与 CI/CD 流程集成，实现自动化部署。`,
        username: 'DevOps工程师',
        user_id: 3,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
};

// 模拟评论数据
const mockComments = {
    1: [
        {
            id: 1,
            content: '非常实用的文章！goroutine 的使用确实需要仔细考虑。',
            username: 'Go爱好者',
            created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 2,
            content: '感谢分享，channel 的选择策略这部分讲得很清楚。',
            username: '学习者',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
    ],
    2: [
        {
            id: 3,
            content: 'Gin 框架确实很好用，性能也很不错！',
            username: '开发者',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
    ],
    3: [],
    4: [
        {
            id: 4,
            content: 'JWT 的安全性很重要，这篇文章讲得很全面。',
            username: '安全工程师',
            created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
    ],
    5: [],
    6: []
};

document.addEventListener('DOMContentLoaded', () => {
    // 更新导航栏
    updateNavigation();
    
    // 获取文章ID
    const urlParams = new URLSearchParams(window.location.search);
    currentPostId = urlParams.get('id');
    
    if (!currentPostId) {
        showError('文章ID无效');
        return;
    }
    
    // 加载文章详情
    loadPostDetail();
    
    // 加载评论
    loadComments();
    
    // 评论表单提交
    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
    
    // 编辑和删除按钮
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            window.location.href = `/pages/create-post.html?edit=${currentPostId}`;
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeletePost);
    }
    
    // 监听页面可见性变化，当用户从登录页返回时刷新状态
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // 页面变为可见时，重新检查登录状态并更新UI
            updateNavigation();
            loadComments();
        }
    });
    
    // 监听 localStorage 变化（用于多标签页同步登录状态）
    window.addEventListener('storage', (e) => {
        if (e.key === 'token') {
            updateNavigation();
            loadComments();
        }
    });
});

// 加载文章详情
async function loadPostDetail() {
    try {
        let post;
        try {
            const response = await postAPI.getById(currentPostId);
            console.log('文章详情API响应:', response);
            
            // 后端返回格式：{code: 200, data: {post: {...}}}
            if (response && response.data) {
                post = response.data.post || response.data;
            } else {
                post = response;
            }
            
            console.log('提取的文章数据:', post);
            
            if (!post) {
                throw new Error('文章数据为空');
            }
        } catch (error) {
            // 如果 API 调用失败，使用模拟数据
            console.log('API 调用失败，使用模拟数据:', error);
            post = mockPosts[currentPostId];
            
            if (!post) {
                throw new Error('文章不存在');
            }
        }
        
        // 处理用户名字段（兼容多种数据结构）
        // 后端 User 模型使用 Name 字段
        const username = post.username || 
                         (post.user && (post.user.name || post.user.Name)) ||
                         (post.User && (post.User.name || post.User.Name)) ||
                         '未知用户';
        
        // 处理日期字段（兼容多种命名）
        const dateString = post.created_at || post.createdAt || post.CreatedAt || new Date().toISOString();
        
        // 显示文章信息
        document.getElementById('articleTitle').textContent = post.title || '无标题';
        document.getElementById('articleAuthor').textContent = username;
        document.getElementById('articleDate').textContent = utils.formatFullDate(dateString);
        
        // 显示文章内容（简单处理，支持换行）
        const content = post.content || '';
        // 先转义HTML，再处理换行，避免XSS攻击
        const escapedContent = escapeHtml(content);
        const formattedContent = escapedContent.replace(/\n/g, '<br>');
        document.getElementById('articleContent').innerHTML = formattedContent;
        
        // 保存文章作者ID（兼容多种字段名）
        currentPostUserId = post.user_id || 
                           post.userId || 
                           post.UserID ||
                           (post.user && (post.user.id || post.user.ID)) ||
                           (post.User && (post.User.id || post.User.ID)) ||
                           null;
        
        // 检查是否为当前用户的文章
        const userInfo = UserManager.getUserInfo();
        if (userInfo && currentPostUserId) {
            const userId = userInfo.id || userInfo.ID || userInfo.user_id;
            if (userId == currentPostUserId) {
                const articleActions = document.getElementById('articleActions');
                if (articleActions) {
                    articleActions.style.display = 'flex';
                }
            }
        }
        
    } catch (error) {
        console.error('加载文章失败:', error);
        const articleContent = document.getElementById('articleContent');
        if (articleContent) {
            articleContent.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${error.message || '加载文章失败，请稍后重试'}
                </div>
            `;
        }
        // 也更新标题显示错误
        const articleTitle = document.getElementById('articleTitle');
        if (articleTitle) {
            articleTitle.textContent = '加载失败';
        }
    }
}

// 加载评论
async function loadComments() {
    const container = document.getElementById('commentsContainer');
    const emptyState = document.getElementById('commentsEmpty');
    
    // 检查登录状态
    const isAuthenticated = TokenManager.isAuthenticated();
    const commentFormContainer = document.getElementById('commentFormContainer');
    const commentForm = document.getElementById('commentForm');
    
    if (commentFormContainer) {
        if (isAuthenticated) {
            // 用户已登录，显示评论表单
            // 如果之前显示了提示信息，先清空
            const alertDiv = commentFormContainer.querySelector('.alert');
            if (alertDiv) {
                alertDiv.remove();
            }
            // 确保表单存在且显示
            if (commentForm) {
                commentForm.style.display = 'block';
            }
            commentFormContainer.style.display = 'block';
        } else {
            // 用户未登录，隐藏表单，显示提示信息
            if (commentForm) {
                commentForm.style.display = 'none';
            }
            // 检查是否已有提示信息，避免重复添加
            let alertDiv = commentFormContainer.querySelector('.alert');
            if (!alertDiv) {
                alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-info';
                alertDiv.setAttribute('role', 'alert');
                const currentUrl = encodeURIComponent(window.location.href);
                alertDiv.innerHTML = `
                    <i class="bi bi-info-circle me-2"></i>
                    请先 <a href="/pages/login.html?return=${currentUrl}" class="alert-link">登录</a> 后才能发表评论
                `;
                commentFormContainer.appendChild(alertDiv);
            }
            commentFormContainer.style.display = 'block';
        }
    }
    
    try {
        let comments = [];
        try {
            const response = await commentAPI.getByPostId(currentPostId);
            // 处理后端返回的数据结构：{code: 200, data: {comments: [...], count: N}}
            comments = response.data?.comments || response.comments || response.data || [];
        } catch (error) {
            // 如果 API 调用失败，使用模拟数据
            console.log('API 调用失败，使用模拟评论数据:', error);
            comments = mockComments[currentPostId] || [];
        }
        
        if (container) {
            container.innerHTML = '';
        }
        
        if (!comments || comments.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // 渲染评论
        comments.forEach(comment => {
            const commentElement = createCommentElement(comment);
            if (container) {
                container.appendChild(commentElement);
            }
        });
        
    } catch (error) {
        console.error('加载评论失败:', error);
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    加载评论失败
                </div>
            `;
        }
    }
}

// 创建评论元素
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    const formattedDate = utils.formatFullDate(comment.created_at || comment.createdAt);
    
    // 先转义HTML，再处理换行，避免XSS攻击
    const rawContent = comment.content || '';
    const escapedContent = escapeHtml(rawContent);
    const formattedContent = escapedContent.replace(/\n/g, '<br>');
    
    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">
                <i class="bi bi-person-circle me-2"></i>
                ${escapeHtml(comment.username || comment.user?.name || comment.user?.username || '未知用户')}
            </span>
            <span class="comment-date">
                <i class="bi bi-clock me-2"></i>
                ${formattedDate}
            </span>
        </div>
        <div class="comment-content">${formattedContent}</div>
    `;
    
    return div;
}

// 处理评论提交
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    if (!TokenManager.isAuthenticated()) {
        alert('请先登录');
        window.location.href = '/pages/login.html';
        return;
    }
    
    const content = document.getElementById('commentContent').value.trim();
    
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    try {
        await commentAPI.create(currentPostId, content);
        
        // 清空表单
        document.getElementById('commentContent').value = '';
        
        // 重新加载评论
        loadComments();
        
    } catch (error) {
        console.error('发表评论失败:', error);
        alert(error.message || '发表评论失败，请稍后重试');
    }
}

// 删除文章
async function handleDeletePost() {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await postAPI.delete(currentPostId);
        alert('删除成功');
        window.location.href = '/';
    } catch (error) {
        console.error('删除文章失败:', error);
        alert(error.message || '删除失败，请稍后重试');
    }
}

function showError(message) {
    const container = document.getElementById('articleContent');
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

