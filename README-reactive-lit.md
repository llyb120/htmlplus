# Reactive-Lit 轻量级响应式框架

一个仿照 lit-html 实现的轻量级响应式模板框架，支持最小粒度的 DOM 更新和响应式数据绑定。

## 🌟 核心特性

1. **模板字符串标签函数** - 使用 `html`` ` 语法创建模板
2. **精确的 DOM 更新** - 只更新变化的部分，不重新渲染整个组件
3. **响应式系统** - 自动追踪依赖，数据变化时自动更新视图
4. **函数式 API** - 简洁易用的函数式接口
5. **零依赖** - 不依赖任何第三方库
6. **轻量级** - 核心代码少于 500 行

## 📦 快速开始

### 引入框架

```html
<script src="reactive-lit.js"></script>
```

### 基础使用

```javascript
const { html, render, reactive, createComponent } = window.ReactiveLit;

// 创建响应式组件
const container = document.getElementById('app');
createComponent(() => {
    const state = reactive({ count: 0 });
    
    const template = html`
        <div>
            <h1>计数器: ${state.count}</h1>
            <button onClick=${() => state.count++}>增加</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

## 📚 API 文档

### 核心 API

#### `html`

模板标签函数，用于创建模板。

```javascript
const template = html`
    <div class="container">
        <h1>${title}</h1>
        <p>${content}</p>
    </div>
`;
```

**支持的绑定类型：**

- **文本插值**: `${value}`
- **属性绑定**: `<div id=${id}>`
- **属性（Property）绑定**: `<input .value=${value}>`
- **事件绑定**: `<button onClick=${handler}>`
- **类绑定**: `<div class=${{ active: isActive, disabled: isDisabled }}>`
- **样式绑定**: `<div style=${{ color: 'red', fontSize: '14px' }}>`
- **布尔属性**: `<button disabled=${isDisabled}>`

#### `render(template, container)`

将模板渲染到容器中。

```javascript
const template = html`<div>Hello World</div>`;
render(template, document.getElementById('app'));
```

#### `reactive(obj)`

创建响应式对象。对象的属性变化会自动触发依赖更新。

```javascript
const state = reactive({
    count: 0,
    user: {
        name: '张三',
        age: 25
    }
});

// 修改会自动触发更新
state.count++;
state.user.name = '李四';
```

#### `effect(fn)`

创建副作用函数，自动追踪依赖并在依赖变化时重新执行。

```javascript
const state = reactive({ count: 0 });

effect(() => {
    console.log('Count is:', state.count);
});

state.count++; // 自动输出: Count is: 1
```

#### `computed(getter)`

创建计算属性，返回一个 getter 函数。

```javascript
const state = reactive({
    firstName: '张',
    lastName: '三'
});

const fullName = computed(() => {
    return state.firstName + state.lastName;
});

console.log(fullName()); // 输出: 张三
```

#### `createComponent(setup, container)`

创建组件，返回包含 `update` 和 `unmount` 方法的对象。

```javascript
const component = createComponent(() => {
    const state = reactive({ count: 0 });
    const template = html`<div>${state.count}</div>`;
    render(template, container);
}, container);

// component.unmount(); // 卸载组件
```

#### `createState(initialValue)`

创建状态，返回 `[getter, setter]` 元组。

```javascript
const [count, setCount] = createState(0);

console.log(count()); // 0
setCount(5);
console.log(count()); // 5
```

## 🎯 使用示例

### 示例 1: 计数器

```javascript
createComponent(() => {
    const [count, setCount] = createState(0);
    
    const template = html`
        <div>
            <h1>计数: ${count()}</h1>
            <button onClick=${() => setCount(count() - 1)}>-</button>
            <button onClick=${() => setCount(count() + 1)}>+</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 示例 2: 双向绑定

```javascript
createComponent(() => {
    const [name, setName] = createState('');
    
    const template = html`
        <div>
            <input 
                type="text" 
                .value=${name()}
                onInput=${(e) => setName(e.target.value)}
            />
            <p>你好, ${name() || '访客'}!</p>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 示例 3: Todo List

```javascript
createComponent(() => {
    const state = reactive({
        todos: [],
        newTodo: ''
    });
    
    const addTodo = () => {
        if (state.newTodo.trim()) {
            state.todos.push({
                id: Date.now(),
                text: state.newTodo,
                completed: false
            });
            state.newTodo = '';
        }
    };
    
    const toggleTodo = (id) => {
        const todo = state.todos.find(t => t.id === id);
        if (todo) todo.completed = !todo.completed;
    };
    
    const template = html`
        <div>
            <input 
                .value=${state.newTodo}
                onInput=${(e) => state.newTodo = e.target.value}
                placeholder="添加任务..."
            />
            <button onClick=${addTodo}>添加</button>
            
            <ul>
                ${state.todos.map(todo => html`
                    <li 
                        onClick=${() => toggleTodo(todo.id)}
                        style="${todo.completed ? 'text-decoration: line-through;' : ''}"
                    >
                        ${todo.text}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 示例 4: 条件渲染

```javascript
createComponent(() => {
    const [isLoggedIn, setIsLoggedIn] = createState(false);
    const [username, setUsername] = createState('张三');
    
    const template = html`
        <div>
            ${isLoggedIn() 
                ? html`
                    <h1>欢迎, ${username()}!</h1>
                    <button onClick=${() => setIsLoggedIn(false)}>登出</button>
                  `
                : html`
                    <h1>请登录</h1>
                    <button onClick=${() => setIsLoggedIn(true)}>登录</button>
                  `
            }
        </div>
    `;
    
    render(template, container);
}, container);
```

### 示例 5: 动态样式和类

```javascript
createComponent(() => {
    const state = reactive({
        isActive: false,
        color: 'blue'
    });
    
    const template = html`
        <div>
            <div 
                class=${{
                    'active': state.isActive,
                    'inactive': !state.isActive
                }}
                style=${{
                    color: state.color,
                    fontSize: '20px',
                    padding: '10px'
                }}
            >
                状态: ${state.isActive ? '激活' : '未激活'}
            </div>
            
            <button onClick=${() => state.isActive = !state.isActive}>
                切换状态
            </button>
            <button onClick=${() => state.color = state.color === 'blue' ? 'red' : 'blue'}>
                切换颜色
            </button>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 示例 6: 计算属性

```javascript
createComponent(() => {
    const state = reactive({
        items: [
            { name: '苹果', price: 5, quantity: 2 },
            { name: '香蕉', price: 3, quantity: 5 }
        ]
    });
    
    const totalPrice = computed(() => {
        return state.items.reduce((sum, item) => 
            sum + item.price * item.quantity, 0
        );
    });
    
    const template = html`
        <div>
            <h2>购物车</h2>
            <ul>
                ${state.items.map((item, index) => html`
                    <li>
                        ${item.name} - ¥${item.price} x ${item.quantity}
                        <button onClick=${() => state.items[index].quantity++}>+</button>
                        <button onClick=${() => state.items[index].quantity--}>-</button>
                    </li>
                `).join('')}
            </ul>
            <h3>总价: ¥${totalPrice()}</h3>
        </div>
    `;
    
    render(template, container);
}, container);
```

## 🎨 高级特性

### 嵌套组件

```javascript
function ChildComponent(props) {
    return html`
        <div class="child">
            <h3>${props.title}</h3>
            <p>${props.content}</p>
        </div>
    `;
}

createComponent(() => {
    const state = reactive({
        title: '子组件标题',
        content: '子组件内容'
    });
    
    const template = html`
        <div class="parent">
            <h1>父组件</h1>
            ${ChildComponent(state)}
        </div>
    `;
    
    render(template, container);
}, container);
```

### 列表渲染优化

```javascript
createComponent(() => {
    const state = reactive({
        items: ['项目 1', '项目 2', '项目 3']
    });
    
    const addItem = () => {
        state.items.push(`项目 ${state.items.length + 1}`);
    };
    
    const removeItem = (index) => {
        state.items.splice(index, 1);
    };
    
    const template = html`
        <div>
            <button onClick=${addItem}>添加项目</button>
            <ul>
                ${state.items.map((item, index) => html`
                    <li>
                        ${item}
                        <button onClick=${() => removeItem(index)}>删除</button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    render(template, container);
}, container);
```

## 🔧 实现原理

### 1. 响应式系统

使用 Proxy 拦截对象的读写操作：
- **读取（get）**: 收集依赖（track）
- **写入（set）**: 触发更新（trigger）

### 2. 模板解析

1. 解析模板字符串，识别插值位置
2. 在属性位置插入标记属性
3. 在文本位置插入注释节点
4. 缓存模板以提高性能

### 3. DOM 更新

1. 首次渲染：创建完整的 DOM 树
2. 更新时：只更新变化的部分（TemplatePart）
3. 比较新旧值，避免不必要的 DOM 操作

### 4. 依赖追踪

```
响应式对象 -> 属性 -> 依赖集合（Set<effect>）
     ↓
  数据变化
     ↓
触发所有依赖的 effect 重新执行
```

## 🎯 最佳实践

### 1. 状态管理

- 使用 `reactive()` 创建响应式状态
- 避免在响应式对象中存储非序列化数据
- 对于简单状态，使用 `createState()`

### 2. 性能优化

- 避免在模板中进行复杂计算，使用 `computed()`
- 列表渲染时尽量使用唯一的 key（虽然当前版本未实现 key 优化）
- 避免创建过多的响应式对象

### 3. 事件处理

- 使用箭头函数或 bind 确保正确的 this 指向
- 避免在事件处理器中直接修改大量数据

### 4. 组件设计

- 保持组件小而专注
- 使用 props 传递数据
- 通过回调函数向上通信

## 📊 对比 lit-html

| 特性 | Reactive-Lit | lit-html |
|------|-------------|----------|
| 模板语法 | ✅ html`` | ✅ html`` |
| 响应式系统 | ✅ 内置 | ❌ 需配合其他库 |
| 自动更新 | ✅ 自动 | ❌ 手动调用 render |
| 大小 | ~10KB | ~3KB |
| 指令系统 | ❌ 未实现 | ✅ 支持 |
| 异步渲染 | ❌ 未实现 | ✅ 支持 |

## 🚀 未来计划

- [ ] 实现指令系统（if、repeat、classMap 等）
- [ ] 添加 key 优化列表渲染
- [ ] 支持异步组件
- [ ] 添加生命周期钩子
- [ ] 实现虚拟滚动
- [ ] SSR 支持

## 📄 许可

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

