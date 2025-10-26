// JSX 示例文件
// 使用 Babel 编译: npx babel example.jsx --out-file example.compiled.js

// const { h, Fragment, createComponent, useState, onMounted, onUnmounted } = window.ReactiveLit;

// 示例 1: 简单计数器
createComponent('jsx-counter', () => {
  const count = useState(0);
  
  return () => (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>JSX 计数器</h2>
      <p style={{ fontSize: '3em', color: '#667eea' }}>{count()}</p>
      <button onClick={() => count(count() - 1)}>-1</button>
      <button onClick={() => count(0)}>重置</button>
      <button onClick={() => count(count() + 1)}>+1</button>
    </div>
  );
});

// 示例 2: 列表渲染
createComponent('jsx-list', () => {
  const items = useState([1, 2, 3]);
  
  const addItem = () => {
    items([...items(), items().length + 1]);
  };
  
  const removeItem = () => {
    items(items().slice(0, -1));
  };
  
  return () => (
    <div style={{ padding: '20px' }}>
      <h3>列表 ({items().length} 项)</h3>
      <div>
        {items().map(item => (
          <div key={item} style={{ 
            padding: '10px', 
            margin: '5px', 
            background: '#f0f0f0',
            borderRadius: '5px'
          }}>
            项目 #{item}
          </div>
        ))}
      </div>
      <button onClick={addItem}>➕ 添加</button>
      <button onClick={removeItem}>➖ 删除</button>
    </div>
  );
});

// 示例 3: 带生命周期的组件
createComponent('jsx-lifecycle', () => {
  const message = useState('等待中...');
  let timer;
  
  onMounted(() => {
    message('组件已挂载');
    timer = setInterval(() => {
      message(`时间: ${new Date().toLocaleTimeString()}`);
    }, 1000);
  });
  
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
  
  return () => (
    <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
      <h3>生命周期示例</h3>
      <p>{message()}</p>
    </div>
  );
});

// 示例 4: 子组件
createComponent('jsx-buttons', () => {
  const count = useState(0);
  
  return () => (
    <div style={{ padding: '20px' }}>
      <h3>自定义按钮组件</h3>
      <p>计数: {count()}</p>
      <button onClick={() => count(count() + 1)} type="primary">
        增加
      </button>
      <button onClick={() => count(count() - 1)} type="danger">
        减少
      </button>
      <button onClick={() => count(0)} type="success">
        重置
      </button>
    </div>
  );
});

// 示例 5: Fragment
createComponent('jsx-fragment', () => {
  return () => (
    <>
      <h3>Fragment 示例</h3>
      <p>这些元素没有额外的包裹div</p>
      <p>它们直接渲染在父容器中</p>
    </>
  );
});

// 示例 6: 条件渲染
createComponent('jsx-conditional', () => {
  const show = useState(true);
  const mode = useState('light');
  
  return () => (
    <div style={{ padding: '20px' }}>
      <h3>条件渲染</h3>
      
      <button onClick={() => show(!show())}>
        {show() ? '隐藏' : '显示'}
      </button>
      
      <button onClick={() => mode(mode() === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>
      
      {show() && (
        <div style={{
          padding: '20px',
          margin: '10px 0',
          background: mode() === 'light' ? '#f5f5f5' : '#333',
          color: mode() === 'light' ? '#333' : '#f5f5f5',
          borderRadius: '5px'
        }}>
          当前主题: {mode()}
        </div>
      )}
    </div>
  );
});

// 示例 7: 表单输入
createComponent('jsx-form', () => {
  const name = useState('');
  const email = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`姓名: ${name()}, 邮箱: ${email()}`);
  };
  
  return () => (
    <div style={{ padding: '20px' }}>
      <h3>表单示例</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            姓名:
            <input 
              type="text" 
              value={name()}
              onInput={(e) => name(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>
            邮箱:
            <input 
              type="email" 
              value={email()}
              onInput={(e) => email(e.target.value)}
              style={{ marginLeft: '10px', padding: '5px' }}
            />
          </label>
        </div>
        
        <button type="submit">提交</button>
      </form>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
        <p>姓名: {name()}</p>
        <p>邮箱: {email()}</p>
      </div>
    </div>
  );
});

