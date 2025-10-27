# HTM+ 

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)]()

> 🚀 一个极简的响应式模板框架，基于 Web Components，支持 JSX 和模板字符串

## 开发HTM+的初衷
React的学习曲线过于陡峭，新手和老手写出的代码完全不一样，上限和下限差别极大

HTM+ 回归html的本质，致力于让每个人都享受到编码的乐趣！

## ✨ 特性

- 🎯 **极简 API**: 有手就会，仅需掌握 `useState`、`createComponent`、`html` 三个核心 API
- ⚡ **轻量化**: gzip后代码仅有10k，无依赖，开箱即用
- ⚡ **高性能**: 每个自定义组件仅渲染一次，无React循环执行和diff开销
- 🎭 **无Virtual DOM**: 在不使用virtual dom的情况下，也能得知差异做最小粒度的dom变更
- 🧩 **Web Components**: 基于标准 Web Components，天然支持组件化
- 📦 **兼容JSX**: 支持模板字符串 `html``` 和 JSX 两种写法
- 🎨 **插槽支持**: 支持 Light DOM 插槽，方便组件组合
- 🔀 **批量更新**: 自动批处理状态更新，减少 DOM 操作

## 📦 安装

### 直接引入（推荐快速开始）
```html
<script src="htmp.js"></script>
<script>
  const { createComponent, html, useState } = window.htmp;
  // 开始使用
</script>
```

## 🚀 快速开始
HTM+ 没有react繁琐的学习周期和坑，你只需要掌握三个函数(createComponent, useState, html)，即可上手开发。

*忘掉hook，指令，回归html的本质，你只要记得你在书写html，它会智能更新即可*

### 第一个组件：计数器

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>我的第一个 HTM+ 应用</title>
    <script src="htmp.js"></script>
</head>
<body>
    <!-- 使用组件 -->
    <my-counter></my-counter>

    <script>
        const { createComponent, html, useState } = window.htmp;

        // 创建组件
        createComponent('my-counter', () => {
            // Setup 阶段：定义状态（只执行一次）
            const count = useState(0);

            // 返回渲染函数（每次状态变化时执行）
            return () => html`
                <div>
                    <h1>计数: ${count()}</h1>
                    <button onClick=${() => count(count() + 1)}>+1</button>
                    <button onClick=${() => count(count() - 1)}>-1</button>
                </div>
            `;
        });
    </script>
</body>
</html>
```

就是这么简单！只需要：
1. 引入 `htmp.js`
2. 使用 `createComponent` 创建组件
3. 在 HTML 中使用自定义标签

## 📚 核心概念

### 1. 响应式状态：`useState`

`useState` 是一个**函数式状态管理器**，一个函数同时处理 get 和 set：

```javascript
const count = useState(0);

// 读取值：无参数调用
console.log(count());  // 0

// 设置值：传入参数
count(10);  // 设置为 10
count(count() + 1);  // 递增
```

#### 支持所有数据类型

```javascript
// 数字
const age = useState(18);
age(age() + 1);

// 字符串
const name = useState('张三');
name('李四');

// 布尔值
const visible = useState(false);
visible(!visible());

// 数组
const list = useState([1, 2, 3]);
list().push(4);  // 自动触发更新！

// 对象
const user = useState({ name: '张三', age: 18 });
user().age = 20;  // 自动触发更新！
```

#### 响应式原理

HTM+ 使用 **Proxy** 实现深度响应式：

- **自动追踪**: 渲染函数中访问状态时，自动建立依赖关系
- **精准更新**: 状态变化时，只更新使用该状态的 DOM 节点
- **深度监听**: 数组、对象的嵌套属性变化也会触发更新

```javascript
const state = useState({
    user: {
        profile: {
            name: '张三'
        }
    }
});

// 深层属性变化也能响应
state().user.profile.name = '李四';  // ✅ 自动更新
```

### 2. 组件创建：`createComponent`

```javascript
createComponent('标签名', setupFunction)
```

#### Setup 函数模式（推荐）

```javascript
createComponent('my-component', () => {
    // 📌 Setup 阶段：只执行一次
    const count = useState(0);
    
    onMounted(() => {
        console.log('组件挂载了');
    });

    // 📌 返回渲染函数：每次状态变化时执行
    return () => html`
        <div>计数: ${count()}</div>
    `;
});
```

这种模式类似 Vue 3 的 Composition API，清晰地分离了初始化逻辑和渲染逻辑。

### 3. 模板渲染：`html`

使用标签模板字符串（Tagged Template）语法：

```javascript
html`
    <div class="container">
        <h1>${title}</h1>
        <p>${content}</p>
    </div>
`
```

#### 支持的插值类型

```javascript
// 1. 文本插值
html`<div>${text}</div>`

// 2. 属性绑定
html`<img src=${imageUrl} alt="图片">`

// 3. 事件绑定
html`<button onClick=${handleClick}>点击</button>`

// 4. 条件渲染
html`
    <div>
        ${show ? html`<p>显示</p>` : ''}
    </div>
`

// 5. 列表渲染（简单文本）
html`
    <ul>
        ${items.map(item => `<li>${item}</li>`)}
    </ul>
`

// 5b. 列表渲染（包含动态内容时使用 html``）
html`
    <ul>
        ${items.map(item => html`<li>${item.name}</li>`)}
    </ul>
`

// 6. 嵌套组件
html`
    <div>
        <child-component name="张三"></child-component>
    </div>
`

// 7. 样式对象
html`<div style=${{ color: 'red', fontSize: '16px' }}>文本</div>`

// 8. 类对象
html`<div class=${{ active: true, disabled: false }}>元素</div>`
```

#### 💡 列表渲染的两种写法

```javascript
// 方式 1：普通字符串模板（自动识别 HTML）
${items.map(item => `<li>${item}</li>`)}
// 框架会自动检测字符串中的 HTML 标签并正确渲染

// 方式 2：html`` 标签模板（用于包含动态绑定时）
${items.map(item => html`<li onClick=${() => handleClick(item)}>${item}</li>`)}
```

**何时使用普通字符串？**
- ✅ 纯静态 HTML 片段
- ✅ 只包含文本插值，无事件绑定
- ✅ 性能要求高的场景（避免创建额外的 TemplateResult 对象）
- ✅ 简单的列表项（如 `<li>`, `<p>`, `<div>` 等）

**何时使用 html``？**
- ✅ 需要事件绑定（如 `onClick`）
- ✅ 需要属性绑定（如 `value=${value()}`）
- ✅ 包含嵌套组件
- ✅ 包含条件渲染

**智能 HTML 检测：**
框架会自动检测字符串中是否包含 HTML 标签（通过正则 `/<[^>]+>/`），如果检测到标签，会使用 `innerHTML` 渲染，否则作为纯文本处理。这意味着你可以混合使用两种方式，框架会自动选择正确的渲染方法！

**⚠️ 重要提示：**
- 普通字符串模板只能包含**纯 HTML 字符串**和**纯文本插值**
- 如果需要使用 **`slot()`、事件绑定、组件**等特殊内容，必须使用 `html``` 模板
- 框架会自动检测错误用法并在控制台显示清晰的错误提示 ✨

```javascript
// ❌ 错误：在字符串模板中使用 slot()
${isOpen() ? `<div>${slot()}</div>` : ''}  
// 框架会检测到 [object Object] 并在控制台显示：
// ❌ 检测到 [object Object]！
// 这通常是因为在字符串模板中使用了 slot()、事件函数或其他对象。
// ✅ 正确用法：html`<div>${slot()}</div>`

// ✅ 正确：使用 html`` 模板
${isOpen() ? html`<div>${slot()}</div>` : ''}

// ✅ 正确：纯静态 HTML 字符串
${items.map(item => `<li>${item.name}</li>`)}  // 只有文本插值，没问题
```

## 🎯 渐进式使用指南

### Level 0: 基础使用（5分钟上手）

只需掌握三个 API：`createComponent`、`useState`、`html`

```javascript
// 创建一个简单的问候组件
createComponent('hello-world', () => {
    const name = useState('世界');
    
    return () => html`
        <div>
            <h1>你好, ${name()}!</h1>
            <input value=${name()} onInput=${(e) => name(e.target.value)}>
        </div>
    `;
});
```

```html
<hello-world></hello-world>
```

### Level 1: Props 传递（组件通信）

#### 基础 Props

**重要：所有 props 都是函数！** 这保持了 API 的一致性，无论是简单属性还是响应式状态。

```javascript
createComponent('user-card', ({ name, age }) => {
    return () => html`
        <div class="card">
            <h2>${name()}</h2>
            <p>年龄: ${age()}</p>
        </div>
    `;
});
```

```html
<user-card name="张三" age="25"></user-card>
```

**为什么所有 props 都是函数？**
- ✅ **统一的 API**：不需要判断是简单值还是响应式状态
- ✅ **未来扩展性**：简单属性可以随时升级为响应式
- ✅ **降低心智负担**：只记住一个规则 - "所有 props 都要调用"

#### 响应式 Props

可以将 `useState` 返回的函数作为 prop 传递，实现父子组件状态共享：

```javascript
// 父组件
createComponent('parent-component', () => {
    const count = useState(0);
    
    return () => html`
        <div>
            <h2>父组件计数: ${count()}</h2>
            <child-display value=${count}></child-display>
            <button onClick=${() => count(count() + 1)}>增加</button>
        </div>
    `;
});

// 子组件
createComponent('child-display', ({ value }) => {
    return () => html`
        <div>
            <p>子组件收到的值: ${value()}</p>
        </div>
    `;
});
```

### Level 2: 插槽（Slot）

支持类似 Vue 的插槽机制，方便组件组合。

**插槽特点：**
- `slot()` 返回 `UnsafeHTML` 对象，包含子元素的原始 HTML
- 像其他 props 一样，slot 也是函数
- 可以直接在 `html`` ` 模板中使用

```javascript
createComponent('card-box', ({ title, slot }) => {
    const isOpen = useState(true);
    
    return () => html`
        <div class="card">
            <div class="header">
                <h3>${title()}</h3>
                <button onClick=${() => isOpen(!isOpen())}>
                    ${isOpen() ? '收起' : '展开'}
                </button>
            </div>
            ${isOpen() ? html`
                <div class="content">
                    ${slot()}
                </div>
            ` : ''}
        </div>
    `;
});
```

```html
<card-box title="我的卡片">
    <p>这是插槽内容</p>
    <button>操作按钮</button>
    <user-card name="张三" age="25"></user-card>
</card-box>
```

### Level 3: 生命周期钩子

```javascript
createComponent('lifecycle-demo', () => {
    const time = useState('');
    let timer;
    
    // 组件挂载时
    onMounted(() => {
        console.log('组件已挂载');
        timer = setInterval(() => {
            time(new Date().toLocaleTimeString());
        }, 1000);
    });
    
    // 组件卸载时
    onUnmounted(() => {
        console.log('组件即将卸载');
        if (timer) clearInterval(timer);
    });
    
    return () => html`
        <div>当前时间: ${time()}</div>
    `;
});
```

### Level 4: 列表渲染与条件渲染

#### 列表渲染

```javascript
createComponent('todo-list', () => {
    const todos = useState([
        { id: 1, text: '学习 HTM+', done: false },
        { id: 2, text: '编写示例', done: false }
    ]);
    
    const addTodo = () => {
        const text = prompt('请输入待办事项:');
        if (text) {
            todos([...todos(), {
                id: Date.now(),
                text,
                done: false
            }]);
        }
    };
    
    const toggleTodo = (id) => {
        const list = todos();
        const todo = list.find(t => t.id === id);
        if (todo) todo.done = !todo.done;
        // 触发更新（因为 Proxy 深度监听）
    };
    
    return () => html`
        <div>
            <button onClick=${addTodo}>添加待办</button>
            <ul>
                ${todos().map(todo => html`
                    <li>
                        <input 
                            type="checkbox" 
                            checked=${todo.done}
                            onChange=${() => toggleTodo(todo.id)}
                        >
                        <span style=${{
                            textDecoration: todo.done ? 'line-through' : 'none'
                        }}>
                            ${todo.text}
                        </span>
                    </li>
                `)}
            </ul>
        </div>
    `;
});
```

#### 条件渲染

```javascript
createComponent('conditional-demo', () => {
    const show = useState(true);
    const mode = useState('light');
    
    return () => html`
        <div>
            <button onClick=${() => show(!show())}>
                ${show() ? '隐藏' : '显示'}
            </button>
            
            ${show() && html`
                <div class=${mode()}>
                    内容区域
                </div>
            `}
            
            ${mode() === 'light' 
                ? html`<p>浅色模式</p>`
                : html`<p>深色模式</p>`
            }
        </div>
    `;
});
```

### Level 5: JSX 语法（可选）

如果你更喜欢 JSX 语法，HTM+ 也完全支持！

#### 在浏览器中使用（开发模式）

```html
<script src="htmp.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="./babel-plugin-jsx-to-html.brower.js"></script>

<script>
    Babel.registerPlugin('jsx-to-html', jsxToHtmlPlugin);
</script>

<script type="text/babel" data-plugins="jsx-to-html">
    const { createComponent, useState } = window.htmp;

    createComponent('jsx-counter', () => {
        const count = useState(0);
        
        return () => (
            <div style={{ textAlign: 'center' }}>
                <h1>计数: {count()}</h1>
                <button onClick={() => count(count() + 1)}>+1</button>
            </div>
        );
    });
</script>
```

#### 在构建工具中使用（生产模式）

1. 安装依赖：

```bash
npm install --save-dev @babel/core @babel/cli @babel/plugin-syntax-jsx
```

2. 创建 `babel.config.json`：

```json
{
  "plugins": [
    ["@babel/plugin-syntax-jsx"],
    ["./babel-plugin-jsx-to-html.js"]
  ]
}
```

3. 编写 JSX 组件：

```jsx
// app.jsx
createComponent('my-app', () => {
    const count = useState(0);
    
    return () => (
        <div>
            <h1>{count()}</h1>
            <button onClick={() => count(count() + 1)}>
                增加
            </button>
        </div>
    );
});
```

4. 构建：

```bash
npm run build
```

## 🔧 核心 API 参考

### `createComponent(tagName, setupFn)`

创建并注册一个 Web Component。

**参数：**
- `tagName` (string): 组件标签名，必须包含连字符（如 `'my-component'`）
- `setupFn` (Function): Setup 函数，返回渲染函数

**示例：**

```javascript
createComponent('my-button', ({ label, onClick }) => {
    const pressed = useState(false);
    
    return () => html`
        <button 
            onClick=${() => {
                pressed(true);
                setTimeout(() => pressed(false), 200);
                onClick?.();
            }}
            class=${{ pressed: pressed() }}
        >
            ${label || '按钮'}
        </button>
    `;
});
```

### `useState(initialValue)`

创建响应式状态。

**参数：**
- `initialValue` (any): 初始值，支持任意类型

**返回：**
- `stateFunction` (Function): 状态函数
  - 无参数调用时返回当前值
  - 传入参数时设置新值

**示例：**

```javascript
const count = useState(0);
const user = useState({ name: '张三', age: 18 });
const list = useState([1, 2, 3]);

// 读取
console.log(count());        // 0
console.log(user().name);    // '张三'
console.log(list().length);  // 3

// 修改
count(10);
user().name = '李四';  // 深度响应式
list().push(4);        // 数组方法也响应式
```

### `html`

标签模板字符串函数，用于创建模板。

**示例：**

```javascript
const template = html`
    <div class="container">
        <h1>${title}</h1>
        ${content}
    </div>
`;
```

### `onMounted(callback)`

注册组件挂载时的回调函数。

**参数：**
- `callback` (Function): 回调函数

**示例：**

```javascript
onMounted(() => {
    console.log('组件已挂载到 DOM');
    // 可以执行 DOM 操作、发起网络请求等
});
```

### `onUnmounted(callback)`

注册组件卸载时的回调函数。

**参数：**
- `callback` (Function): 回调函数

**示例：**

```javascript
onUnmounted(() => {
    console.log('组件即将卸载');
    // 清理定时器、取消订阅等
});
```

### `unsafeHTML(htmlString)`

插入原始 HTML（谨慎使用，注意 XSS 风险）。

**参数：**
- `htmlString` (string): HTML 字符串

**返回：**
- `UnsafeHTML` 对象

**示例：**

```javascript
const rawHtml = '<strong>粗体文本</strong>';

return () => html`
    <div>${unsafeHTML(rawHtml)}</div>
`;
```

## 🎨 实战示例

### 完整的 Todo 应用

```javascript
createComponent('todo-app', () => {
    const todos = useState([]);
    const filter = useState('all'); // all, active, completed
    const inputValue = useState('');
    
    const addTodo = () => {
        const text = inputValue().trim();
        if (text) {
            todos([...todos(), {
                id: Date.now(),
                text,
                completed: false
            }]);
            inputValue('');
        }
    };
    
    const toggleTodo = (id) => {
        const todo = todos().find(t => t.id === id);
        if (todo) todo.completed = !todo.completed;
    };
    
    const deleteTodo = (id) => {
        todos(todos().filter(t => t.id !== id));
    };
    
    const filteredTodos = () => {
        const list = todos();
        if (filter() === 'active') return list.filter(t => !t.completed);
        if (filter() === 'completed') return list.filter(t => t.completed);
        return list;
    };
    
    const clearCompleted = () => {
        todos(todos().filter(t => !t.completed));
    };
    
    return () => html`
        <div class="todo-app">
            <h1>待办事项</h1>
            
            <div class="input-box">
                <input 
                    type="text"
                    value=${inputValue()}
                    onInput=${(e) => inputValue(e.target.value)}
                    onKeyPress=${(e) => e.key === 'Enter' && addTodo()}
                    placeholder="输入待办事项..."
                >
                <button onClick=${addTodo}>添加</button>
            </div>
            
            <div class="filters">
                <button 
                    class=${{ active: filter() === 'all' }}
                    onClick=${() => filter('all')}
                >
                    全部
                </button>
                <button 
                    class=${{ active: filter() === 'active' }}
                    onClick=${() => filter('active')}
                >
                    进行中
                </button>
                <button 
                    class=${{ active: filter() === 'completed' }}
                    onClick=${() => filter('completed')}
                >
                    已完成
                </button>
            </div>
            
            <ul class="todo-list">
                ${filteredTodos().map(todo => html`
                    <li class=${{ completed: todo.completed }}>
                        <input 
                            type="checkbox"
                            checked=${todo.completed}
                            onChange=${() => toggleTodo(todo.id)}
                        >
                        <span>${todo.text}</span>
                        <button onClick=${() => deleteTodo(todo.id)}>删除</button>
                    </li>
                `)}
            </ul>
            
            <div class="footer">
                <span>${todos().filter(t => !t.completed).length} 项待完成</span>
                <button onClick=${clearCompleted}>清除已完成</button>
            </div>
        </div>
    `;
});
```

## 🔍 工作原理

### 响应式系统架构

```
┌─────────────────────────────────────────────────────┐
│                   响应式核心流程                        │
└─────────────────────────────────────────────────────┘

1. 依赖收集（Track）
   ┌──────────────┐
   │ 渲染函数执行    │
   │  count()      │ ──> 访问状态
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ Proxy get 拦截│
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ 记录依赖关系   │  currentEffect <--> count
   └──────────────┘

2. 触发更新（Trigger）
   ┌──────────────┐
   │ 修改状态      │
   │ count(10)     │ ──> 设置新值
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ Proxy set 拦截│
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ 查找所有依赖   │
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ 批量更新队列   │  queueJob()
   └──────────────┘
          │
          ▼
   ┌──────────────┐
   │ 微任务执行     │  Promise.resolve().then()
   │ 重新渲染      │
   └──────────────┘
```

### 模板编译流程

```
JSX / html``
     │
     ▼
┌─────────────┐
│  解析模板    │  识别静态部分和动态部分
└─────────────┘
     │
     ▼
┌─────────────┐
│ 生成 HTML    │  静态部分 + 占位符标记
└─────────────┘
     │
     ▼
┌─────────────┐
│ 创建 DOM     │  使用 <template> 克隆
└─────────────┘
     │
     ▼
┌─────────────┐
│ 绑定动态部分 │  TemplatePart 关联节点
└─────────────┘
     │
     ▼
┌─────────────┐
│ 挂载到页面   │
└─────────────┘
```

### 组件生命周期

```
创建阶段
  │
  ├─> constructor()        [创建实例]
  │
  ├─> Setup 函数执行        [只执行一次]
  │    ├─> useState()      [初始化状态]
  │    ├─> onMounted()     [注册钩子]
  │    └─> return 渲染函数
  │
挂载阶段
  │
  ├─> connectedCallback()  [DOM 挂载]
  │    ├─> 执行 onMounted 回调
  │    └─> 首次渲染
  │
更新阶段
  │
  ├─> 状态变化
  │    ├─> trigger()       [触发更新]
  │    ├─> queueJob()      [加入队列]
  │    └─> 渲染函数重新执行
  │
卸载阶段
  │
  └─> disconnectedCallback()
       └─> 执行 onUnmounted 回调
```

### 适用场景

**✅ 推荐使用 HTM+：**
- 小型项目、原型开发
- 不需要复杂工具链
- 希望快速上手
- 需要与现有页面集成
- 教学和学习响应式原理

**⚠️ 谨慎使用：**
- 大型企业级应用
- 需要完整 TypeScript 支持
- 需要丰富的生态系统
- 需要服务端渲染 (SSR)

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

<p align="center">
  用 ❤️ 打造的极简响应式框架
</p>

