import { useState, useEffect } from 'react';
import { DirectSvgIcon, IconInfo } from './components/DirectSvgIcon';

interface IconGroup {
  groupName: string;
  icons: IconInfo[];
}

// Extract group name from icon name
// Supports formats: "group-name", "group/name", "icon-group-name"
function extractGroupFromIconName(iconName: string): string {
  // Try slash format first: "architecture/hospital" -> "architecture"
  if (iconName.includes('/')) {
    return iconName.split('/')[0];
  }
  
  // Try dash format: "architecture-hospital" -> "architecture"
  // But skip if it starts with "icon-" (treat as legacy format)
  if (iconName.includes('-') && !iconName.startsWith('icon-')) {
    const parts = iconName.split('-');
    // If first part looks like a group name (common groups), use it
    const firstPart = parts[0];
    const commonGroups = ['architecture', 'notice', 'arch', 'user', 'system', 'ui', 'nav', 'action'];
    if (commonGroups.includes(firstPart.toLowerCase()) || parts.length >= 3) {
      return firstPart;
    }
  }
  
  // Default: no group (ungrouped)
  return 'other';
}

// Group icons by their prefix/category
function groupIcons(icons: IconInfo[]): IconGroup[] {
  const groups = new Map<string, IconInfo[]>();
  
  icons.forEach(icon => {
    const groupName = extractGroupFromIconName(icon.name);
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)!.push(icon);
  });
  
  // Convert to array and sort
  const groupArray: IconGroup[] = Array.from(groups.entries()).map(([groupName, icons]) => ({
    groupName,
    icons: icons.sort((a, b) => a.name.localeCompare(b.name))
  }));
  
  // Sort groups: named groups first (alphabetically), then "other"
  return groupArray.sort((a, b) => {
    if (a.groupName === 'other') return 1;
    if (b.groupName === 'other') return -1;
    return a.groupName.localeCompare(b.groupName);
  });
}

function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [icons, setIcons] = useState<IconInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [iconName, setIconName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('dev-api-key-12345'); // 默认开发环境 API Key
  const [copiedIcon, setCopiedIcon] = useState<string | null>(null); // 用于显示复制成功提示
  const [deletingIcon, setDeletingIcon] = useState<string | null>(null); // 正在删除的图标

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      .icon-card:hover .delete-btn {
        opacity: 0.8 !important;
      }
      
      .delete-btn:hover {
        background: #d32f2f !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check API server health on mount
  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then(res => res.json())
      .then(() => {
        setApiStatus('connected');
        loadIcons();
      })
      .catch(err => {
        setApiStatus('error');
        setErrorMessage('无法连接到 API 服务器。请确保 API 服务器正在运行 (npm run dev 在 packages/api 目录)。');
        console.error('API server connection failed:', err);
      });
  }, []);

  // Load all icons from API
  const loadIcons = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/gd.json');
      if (!response.ok) {
        throw new Error('Failed to fetch icons');
      }
      const data = await response.json();
      console.log('Loaded icon data:', data);
      const iconList = Object.keys(data.icons).map(name => ({
        name,
        ...data.icons[name]
      }));
      console.log('Icon list:', iconList);
      setIcons(iconList);
    } catch (err) {
      console.error('Failed to load icons:', err);
      setErrorMessage('加载图标列表失败');
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setUploadMessage('');
      } else {
        setUploadStatus('error');
        setUploadMessage('请选择 SVG 文件');
        setSelectedFile(null);
      }
    }
  };

  // Handle icon upload
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !iconName) {
      setUploadStatus('error');
      setUploadMessage('请填写图标名称并选择 SVG 文件');
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('');

    const formData = new FormData();
    formData.append('icon', selectedFile);
    formData.append('name', iconName);
    formData.append('namespace', 'gd');
    formData.append('conflictStrategy', 'overwrite');

    try {
      const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(`图标 "${iconName}" 上传成功！`);
        setIconName('');
        setSelectedFile(null);
        // Reload icons list
        await loadIcons();
        // Reset form after 2 seconds
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadMessage('');
          setShowUploadForm(false);
        }, 2000);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.error?.message || '上传失败');
      }
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage('上传失败：' + (err as Error).message);
    }
  };

  // Clear server cache
  const clearCache = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/cache/clear', {
        method: 'POST',
      });
      const result = await response.json();
      if (response.ok) {
        console.log('✅ Cache cleared:', result.message);
        // Reload icons after clearing cache
        await loadIcons();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  // Copy icon name to clipboard
  const copyIconName = async (iconName: string) => {
    const fullIconName = `gd:${iconName}`;
    try {
      await navigator.clipboard.writeText(fullIconName);
      setCopiedIcon(iconName);
      // 2秒后清除提示
      setTimeout(() => {
        setCopiedIcon(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // 降级方案：使用旧的复制方法
      const textArea = document.createElement('textarea');
      textArea.value = fullIconName;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIcon(iconName);
        setTimeout(() => {
          setCopiedIcon(null);
        }, 2000);
      } catch (err2) {
        console.error('Fallback copy failed:', err2);
      }
      document.body.removeChild(textArea);
    }
  };

  // Delete icon
  const deleteIcon = async (iconName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 防止触发复制功能
    
    // 确认删除
    if (!window.confirm(`确定要删除图标 "${iconName}" 吗？此操作不可撤销。`)) {
      return;
    }
    
    setDeletingIcon(iconName);
    
    try {
      const response = await fetch(`http://localhost:3000/api/icons/gd/${iconName}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': apiKey,
        },
      });

      if (response.ok) {
        console.log(`✅ 图标 "${iconName}" 已删除`);
        // 刷新图标列表
        await loadIcons();
      } else {
        const result = await response.json();
        alert(`删除失败: ${result.error?.message || '未知错误'}`);
      }
    } catch (err) {
      console.error('Failed to delete icon:', err);
      alert(`删除失败: ${(err as Error).message}`);
    } finally {
      setDeletingIcon(null);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1>🎨 Iconify 私有图标库</h1>
          <p style={{ color: '#666', margin: '0.5rem 0' }}>
            使用自定义命名空间 "gd" 的私有图标库
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '1.25rem' }}>+</span>
          {showUploadForm ? '取消上传' : '上传图标'}
        </button>
      </div>

      {/* API Status Banner */}
      {apiStatus === 'checking' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#fff3e0',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#e65100',
          }}
        >
          <strong>⏳ 检查中：</strong> 正在连接到 API 服务器...
        </div>
      )}

      {apiStatus === 'error' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#ffebee',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#c62828',
          }}
        >
          <strong>❌ 连接失败：</strong> {errorMessage}
        </div>
      )}

      {apiStatus === 'connected' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#e8f5e9',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: '#2e7d32',
          }}
        >
          <strong>✅ 已连接：</strong> API 服务器运行正常 | 共 {icons.length} 个图标
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: '#f5f5f5',
            borderRadius: '8px',
            border: '2px dashed #1976d2',
          }}
        >
          <h3 style={{ marginTop: 0 }}>上传新图标</h3>
          <form onSubmit={handleUpload}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                图标名称 *
              </label>
              <input
                type="text"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="例如: my-icon (只能包含字母、数字、连字符和下划线)"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                pattern="[a-zA-Z0-9_-]{1,50}"
                required
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                SVG 文件 *
              </label>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
                required
              />
              {selectedFile && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                  已选择: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="输入 API Key"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#666' }}>
                默认开发环境 API Key: dev-api-key-12345
              </div>
            </div>

            <button
              type="submit"
              disabled={uploadStatus === 'uploading'}
              style={{
                padding: '0.75rem 2rem',
                background: uploadStatus === 'uploading' ? '#ccc' : '#388e3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: uploadStatus === 'uploading' ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
              }}
            >
              {uploadStatus === 'uploading' ? '上传中...' : '上传图标'}
            </button>

            {uploadMessage && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: uploadStatus === 'success' ? '#e8f5e9' : '#ffebee',
                  color: uploadStatus === 'success' ? '#2e7d32' : '#c62828',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                }}
              >
                {uploadStatus === 'success' ? '✅ ' : '❌ '}
                {uploadMessage}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Icons Grid */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>所有图标 ({icons.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={clearCache}
              style={{
                padding: '0.5rem 1rem',
                background: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
              title="清除服务器缓存并刷新"
            >
              🗑️ 清除缓存
            </button>
            <button
              onClick={loadIcons}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                background: '#f5f5f5',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {loading ? '加载中...' : '🔄 刷新'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            加载图标中...
          </div>
        ) : icons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            暂无图标，请上传第一个图标
          </div>
        ) : (
          <>
            {/* Group icons by category */}
            {groupIcons(icons).map((group) => (
              <div key={group.groupName} style={{ marginBottom: '3rem' }}>
                {/* Group Header */}
                <div style={{ 
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <h3 style={{ 
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#333',
                    textTransform: 'capitalize'
                  }}>
                    {group.groupName === 'other' ? '其他' : group.groupName}
                  </h3>
                  <span style={{
                    background: '#e3f2fd',
                    color: '#1976d2',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {group.icons.length} 个图标
                  </span>
                </div>

                {/* Icons Grid for this group */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {group.icons.map((icon) => (
                    <div
                      key={icon.name}
                      className="icon-card"
                      style={{
                        padding: '1.5rem',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        background: 'white',
                        position: 'relative',
                      }}
                      onClick={() => copyIconName(icon.name)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1976d2';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                      title={`点击复制: gd:${icon.name}`}
                    >
                      {/* 删除按钮 */}
                      <button
                        onClick={(e) => deleteIcon(icon.name, e)}
                        disabled={deletingIcon === icon.name}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: deletingIcon === icon.name ? '#ccc' : '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: deletingIcon === icon.name ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: '0',
                          transition: 'all 0.2s ease',
                          zIndex: 10,
                        }}
                        onMouseEnter={(e) => {
                          if (deletingIcon !== icon.name) {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'scale(1.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title={`删除图标: ${icon.name}`}
                        className="delete-btn"
                      >
                        {deletingIcon === icon.name ? '...' : '×'}
                      </button>

                      {/* 复制成功提示 */}
                      {copiedIcon === icon.name && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            left: '0.5rem',
                            background: '#4caf50',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            animation: 'fadeIn 0.3s ease',
                            zIndex: 11,
                          }}
                        >
                          ✓ 已复制
                        </div>
                      )}
                      
                      {/* Render SVG directly from loaded data */}
                      <DirectSvgIcon icon={icon} width={48} height={48} />
                      
                      <div style={{ marginTop: '0.75rem', fontWeight: '600', fontSize: '0.875rem' }}>
                        {icon.name}
                      </div>
                      <code
                        style={{
                          fontSize: '0.7rem',
                          color: '#666',
                          background: '#f5f5f5',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginTop: '0.5rem',
                        }}
                      >
                        gd:{icon.name}
                      </code>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#999' }}>
                        {icon.width}×{icon.height}
                      </div>
                      {/* Debug: Show raw SVG body */}
                      <details 
                        style={{ marginTop: '0.5rem', fontSize: '0.6rem', textAlign: 'left' }}
                        onClick={(e) => e.stopPropagation()} // 防止点击详情时触发复制
                      >
                        <summary style={{ cursor: 'pointer', color: '#999' }}>查看 SVG</summary>
                        <pre style={{ 
                          background: '#f5f5f5', 
                          padding: '0.5rem', 
                          borderRadius: '4px',
                          overflow: 'auto',
                          maxHeight: '100px',
                          fontSize: '0.6rem'
                        }}>
                          {icon.body}
                        </pre>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Examples Section */}
      {icons.length > 0 && (
        <>
          <div style={{ marginTop: '3rem' }}>
            <h2>不同尺寸</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <DirectSvgIcon icon={icons[0]} width={16} height={16} />
              <DirectSvgIcon icon={icons[0]} width={24} height={24} />
              <DirectSvgIcon icon={icons[0]} width={32} height={32} />
              <DirectSvgIcon icon={icons[0]} width={48} height={48} />
              <DirectSvgIcon icon={icons[0]} width={64} height={64} />
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h2>不同颜色</h2>
            <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
              注意：只有使用 currentColor 或没有硬编码颜色的图标才能改变颜色
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <DirectSvgIcon icon={icons[0]} width={48} height={48} style={{ color: '#1976d2' }} removeColors={true} />
              <DirectSvgIcon icon={icons[0]} width={48} height={48} style={{ color: '#388e3c' }} removeColors={true} />
              <DirectSvgIcon icon={icons[0]} width={48} height={48} style={{ color: '#d32f2f' }} removeColors={true} />
              <DirectSvgIcon icon={icons[0]} width={48} height={48} style={{ color: '#f57c00' }} removeColors={true} />
              <DirectSvgIcon icon={icons[0]} width={48} height={48} style={{ color: '#7b1fa2' }} removeColors={true} />
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h2>在按钮中使用</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {icons.slice(0, 3).map((icon) => (
                <button
                  key={icon.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  <DirectSvgIcon icon={icon} width={20} height={20} />
                  <span>{icon.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div
        style={{
          marginTop: '3rem',
          padding: '1rem',
          background: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#1565c0',
        }}
      >
        <strong>💡 提示：</strong> 图标正在从自建 API 服务器 (http://localhost:3000) 动态加载。
        所有图标使用 "gd" 命名空间，不依赖任何开源图标库。
        <strong style={{ marginLeft: '1rem' }}>🖱️ 点击图标卡片可复制图标名称！</strong>
      </div>

      {/* Debug Section */}
      <details style={{ marginTop: '2rem' }}>
        <summary style={{ 
          cursor: 'pointer', 
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontWeight: '600'
        }}>
          🔍 调试信息
        </summary>
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '0.875rem'
        }}>
          <div><strong>API 状态:</strong> {apiStatus}</div>
          <div><strong>图标数量:</strong> {icons.length}</div>
          <div><strong>加载状态:</strong> {loading ? '加载中' : '已完成'}</div>
          <div style={{ marginTop: '1rem' }}>
            <strong>API 端点测试:</strong>
            <div style={{ marginTop: '0.5rem' }}>
              <a 
                href="http://localhost:3000/health" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#1976d2', textDecoration: 'underline' }}
              >
                测试 /health 端点
              </a>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <a 
                href="http://localhost:3000/gd.json" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#1976d2', textDecoration: 'underline' }}
              >
                测试 /gd.json 端点
              </a>
            </div>
          </div>
          {icons.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong>图标列表:</strong>
              <pre style={{ 
                background: 'white',
                padding: '0.5rem',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: '0.75rem',
                marginTop: '0.5rem'
              }}>
                {JSON.stringify(icons.map(i => i.name), null, 2)}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

export default App;
