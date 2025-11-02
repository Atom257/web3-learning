// ========================================
// 首页功能脚本
// ========================================

// 模拟数据
const mockPosts = [
    {
        id: 1,
        title: 'Go 语言并发编程的优雅实践',
        content: 'Go 语言以其出色的并发模型而闻名。在这篇文章中，我们将深入探讨 goroutine、channel 和 select 语句的使用技巧，以及如何在实际项目中优雅地处理并发编程。通过实际的代码示例，你将学会如何避免常见的并发陷阱，编写出既高效又安全的并发代码。',
        username: '技术达人',
        user_id: 1,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2小时前
    },
    {
        id: 2,
        title: 'Gin 框架构建 RESTful API 完整指南',
        content: 'Gin 是一个用 Go 编写的 HTTP web 框架，以其高性能和简洁的 API 而受到开发者喜爱。本文将带你从零开始，学习如何使用 Gin 框架构建一个完整的 RESTful API。我们将涵盖路由设计、中间件使用、参数验证、错误处理等核心内容，帮助你快速上手 Web 开发。',
        username: '后端工程师',
        user_id: 2,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5小时前
    },
    {
        id: 3,
        title: 'GORM 数据库操作最佳实践',
        content: 'GORM 是 Go 语言中最受欢迎的 ORM 库之一。本文将详细介绍 GORM 的高级特性，包括模型定义、关联查询、事务处理、预加载优化等。通过实际案例，我们将展示如何利用 GORM 简化数据库操作，提高开发效率，同时保证代码的可维护性和性能。',
        username: '数据库专家',
        user_id: 3,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1天前
    },
    {
        id: 4,
        title: 'JWT 认证在 Go 项目中的实现',
        content: 'JSON Web Token (JWT) 是现代 Web 应用中最常用的身份认证方式之一。本文将教你如何在 Go 项目中实现完整的 JWT 认证流程，包括 token 生成、验证、刷新机制，以及如何与 Gin 框架集成。我们还将讨论安全最佳实践，帮助你构建安全可靠的认证系统。',
        username: '安全专家',
        user_id: 1,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2天前
    },
    {
        id: 5,
        title: '前后端分离架构下的 API 设计',
        content: '在前后端分离的架构中，良好的 API 设计至关重要。本文将分享 API 设计的最佳实践，包括 RESTful 规范、状态码使用、错误处理、版本控制等。通过实际案例，我们将展示如何设计出既符合规范又易于使用的 API，提升前后端协作效率。',
        username: '架构师',
        user_id: 2,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3天前
    },
    {
        id: 6,
        title: '使用 Docker 容器化 Go 应用',
        content: 'Docker 已经成为现代应用部署的标准工具。本文将详细介绍如何将 Go 应用容器化，包括 Dockerfile 编写、多阶段构建、镜像优化等技巧。我们还将探讨如何在开发和生产环境中使用 Docker，以及如何与 CI/CD 流程集成，实现自动化部署。',
        username: 'DevOps工程师',
        user_id: 3,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5天前
    }
];

// 分页相关变量
let currentPage = 1;
let pageSize = 10;
let totalPosts = 0;
let totalPages = 0;

// 加载文章列表
async function loadPosts(page = 1) {
    const container = document.getElementById('postsContainer');
    const emptyState = document.getElementById('emptyState');
    const spinnerElement = container ? container.querySelector('.spinner-border') : null;
    const loadingElement = spinnerElement ? spinnerElement.parentElement : null;
    
    // 更新当前页码
    currentPage = page;
    
    // 从URL参数获取页码
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
        const parsedPage = parseInt(pageParam);
        if (parsedPage > 0) {
            currentPage = parsedPage;
        }
    }
    
    try {
        let posts = [];
        let pagination = null;
        
        try {
            const response = await postAPI.getAll(currentPage, pageSize);
            console.log('API响应:', response);
            
            // 正确提取文章数组和分页信息
            // 后端返回格式：{code: 200, data: {posts: [...], pagination: {...}}}
            if (response && response.data) {
                posts = response.data.posts || [];
                pagination = response.data.pagination || null;
                
                // 更新分页信息
                if (pagination) {
                    currentPage = pagination.page || currentPage;
                    pageSize = pagination.page_size || pageSize;
                    totalPosts = pagination.total || 0;
                    totalPages = pagination.total_page || 0;
                }
            } else if (Array.isArray(response)) {
                // 兼容直接返回数组的情况
                posts = response;
            }
            
            console.log('提取的文章:', posts);
            console.log('分页信息:', pagination);
        } catch (error) {
            console.error('API 调用失败:', error);
            // 如果 API 调用失败，使用模拟数据
            posts = mockPosts;
        }
        
        // 隐藏加载动画
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 清空容器
        if (container) {
            container.innerHTML = '';
        }
        
        // 检查是否为空数组（添加数组类型检查）
        if (!Array.isArray(posts) || posts.length === 0) {
            // 显示空状态
            if (emptyState) {
                emptyState.style.display = 'block';
            }
            return;
        }
        
        // 隐藏空状态
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // 渲染文章卡片
        posts.forEach((post, index) => {
            const postCard = createPostCard(post);
            if (container) {
                container.appendChild(postCard);
                // 添加淡入动画
                setTimeout(() => {
                    postCard.classList.add('fade-in');
                }, index * 50);
            }
        });
        
        // 渲染分页控件
        renderPagination();
        
    } catch (error) {
        console.error('加载文章失败:', error);
        // 如果出错，尝试使用模拟数据
        if (container) {
            container.innerHTML = '';
            // 隐藏加载动画
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            // 隐藏空状态
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            mockPosts.forEach((post, index) => {
                const postCard = createPostCard(post);
                container.appendChild(postCard);
                setTimeout(() => {
                    postCard.classList.add('fade-in');
                }, index * 50);
            });
        }
    }
}

// 创建文章卡片元素
function createPostCard(post) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    // 截取文章内容预览（去除HTML标签）
    const contentPreview = post.content 
        ? post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
        : '暂无内容预览';
    
    // 处理日期字段（兼容多种命名：created_at, createdAt, CreatedAt）
    const dateString = post.created_at || post.createdAt || post.CreatedAt || new Date().toISOString();
    const formattedDate = utils.formatDate(dateString);
    
    // 处理文章ID（兼容 id 和 ID）
    const postId = post.id || post.ID || '';
    
    // 处理用户名字段（兼容多种数据结构）
    // 后端 User 模型使用 Name 字段，不是 username
    const username = post.username || 
                     (post.user && (post.user.name || post.user.Name)) ||
                     (post.User && (post.User.name || post.User.Name)) ||
                     '未知用户';
    
    col.innerHTML = `
        <a href="/pages/post-detail.html?id=${postId}" class="post-card">
            <h3 class="post-title">${escapeHtml(post.title || '无标题')}</h3>
            <p class="post-content">${escapeHtml(contentPreview)}</p>
            <div class="post-meta">
                <div class="post-author">
                    <i class="bi bi-person-circle"></i>
                    <span>${escapeHtml(username)}</span>
                </div>
                <div class="post-date">
                    <i class="bi bi-clock"></i>
                    <span>${formattedDate}</span>
                </div>
            </div>
        </a>
    `;
    
    return col;
}

// HTML 转义函数（防止XSS）
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 渲染分页控件
function renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) {
        return;
    }
    
    // 如果没有分页信息或只有一页，隐藏分页控件
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<nav aria-label="文章分页"><ul class="pagination justify-content-center">';
    
    // 上一页按钮
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                    <i class="bi bi-chevron-left"></i> 上一页
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link"><i class="bi bi-chevron-left"></i> 上一页</span>
            </li>
        `;
    }
    
    // 页码按钮
    const maxVisiblePages = 5; // 最多显示5个页码
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页码
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 第一页
    if (startPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(1); return false;">1</a>
            </li>
        `;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            paginationHTML += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }
    }
    
    // 最后一页
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a>
            </li>
        `;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                    下一页 <i class="bi bi-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        paginationHTML += `
            <li class="page-item disabled">
                <span class="page-link">下一页 <i class="bi bi-chevron-right"></i></span>
            </li>
        `;
    }
    
    paginationHTML += '</ul></nav>';
    
    // 添加分页信息
    paginationHTML += `
        <div class="text-center mt-3 text-muted">
            第 ${currentPage} / ${totalPages} 页，共 ${totalPosts} 篇文章
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

// 跳转到指定页码
function goToPage(page) {
    if (page < 1 || page > totalPages) {
        return;
    }
    
    // 更新URL参数
    const url = new URL(window.location);
    if (page === 1) {
        url.searchParams.delete('page');
    } else {
        url.searchParams.set('page', page);
    }
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 加载对应页的文章
    loadPosts(page);
    
    // 更新浏览器历史记录（可选）
    window.history.pushState({ page: page }, '', url);
}

// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    // 从URL参数获取初始页码
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const initialPage = pageParam ? parseInt(pageParam) : 1;
    loadPosts(initialPage);
});

