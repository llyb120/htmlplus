# 🚀 Reactive-Lit 快速开始指南

## 📖 5 分钟上手

### 第一步：引入框架

在你的 HTML 文件中引入 `reactive-lit.js`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>我的第一个 Reactive-Lit 应用</title>
    <script src="reactive-lit.js"></script>
</head>
<body>
    <div id="app"></div>
    
    <script>
        // 你的代码写在这里
    </script>
</body>
</html>
```

### 第二步：获取 API

```javascript
const { html, render, createComponent, createState, reactive } = window.ReactiveLit;
```

### 第三步：创建你的第一个组件

```javascript
const container = document.getElementById('app');

createComponent(() => {
    const [count, setCount] = createState(0);
    
    const template = html`
        <div>
            <h1>计数器：${count()}</h1>
            <button onClick=${() => setCount(count() + 1)}>增加</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

🎉 完成！你已经创建了一个响应式的计数器应用！

## 📚 常用模式

### 1. 使用 createState（推荐用于简单状态）

```javascript
createComponent(() => {
    const [name, setName] = createState('张三');
    const [age, setAge] = createState(25);
    
    const template = html`
        <div>
            <p>姓名：${name()}</p>
            <p>年龄：${age()}</p>
            <button onClick=${() => setAge(age() + 1)}>过生日</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 2. 使用 reactive（推荐用于复杂对象）

```javascript
createComponent(() => {
    const state = reactive({
        user: {
            name: '张三',
            age: 25
        },
        todos: ['学习', '工作', '运动']
    });
    
    const template = html`
        <div>
            <h2>${state.user.name} (${state.user.age}岁)</h2>
            <ul>
                ${state.todos.map(todo => html`<li>${todo}</li>`).join('')}
            </ul>
            <button onClick=${() => state.user.age++}>年龄+1</button>
            <button onClick=${() => state.todos.push('新任务')}>添加任务</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 3. 表单输入（双向绑定）

```javascript
createComponent(() => {
    const [text, setText] = createState('');
    
    const template = html`
        <div>
            <input 
                type="text" 
                .value=${text()}
                onInput=${(e) => setText(e.target.value)}
                placeholder="输入一些文字..."
            />
            <p>你输入了：${text()}</p>
        </div>
    `;
    
    render(template, container);
}, container);
```

### 4. 条件渲染

```javascript
createComponent(() => {
    const [isLoggedIn, setIsLoggedIn] = createState(false);
    
    const template = html`
        <div>
            ${isLoggedIn() 
                ? html`
                    <h1>欢迎回来！</h1>
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

### 5. 列表渲染

```javascript
createComponent(() => {
    const state = reactive({
        items: ['苹果', '香蕉', '橙子'],
        newItem: ''
    });
    
    const addItem = () => {
        if (state.newItem.trim()) {
            state.items.push(state.newItem);
            state.newItem = '';
        }
    };
    
    const removeItem = (index) => {
        state.items.splice(index, 1);
    };
    
    const template = html`
        <div>
            <input 
                .value=${state.newItem}
                onInput=${(e) => state.newItem = e.target.value}
                onKeypress=${(e) => e.key === 'Enter' && addItem()}
            />
            <button onClick=${addItem}>添加</button>
            
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

### 6. 计算属性

```javascript
createComponent(() => {
    const state = reactive({
        price: 100,
        quantity: 1
    });
    
    const total = computed(() => state.price * state.quantity);
    
    const template = html`
        <div>
            <p>单价：${state.price}</p>
            <p>数量：${state.quantity}</p>
            <p>总价：${total()}</p>
            
            <button onClick=${() => state.quantity++}>增加数量</button>
            <button onClick=${() => state.quantity--}>减少数量</button>
        </div>
    `;
    
    render(template, container);
}, container);
```

## 🎯 完整示例：Todo 应用

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Todo 应用</title>
    <script src="reactive-lit.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        
        input {
            width: 70%;
            padding: 10px;
            font-size: 16px;
        }
        
        button {
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
        }
        
        .todo-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin: 10px 0;
            background: #f5f5f5;
            border-radius: 5px;
        }
        
        .todo-item.completed {
            text-decoration: line-through;
            opacity: 0.6;
        }
        
        .todo-text {
            flex: 1;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <h1>📝 我的待办事项</h1>
    <div id="app"></div>

    <script>
        const { html, render, reactive, createComponent } = window.ReactiveLit;
        
        const container = document.getElementById('app');
        
        createComponent(() => {
            const state = reactive({
                todos: [
                    { id: 1, text: '学习 Reactive-Lit', completed: false },
                    { id: 2, text: '构建响应式应用', completed: false }
                ],
                newTodo: '',
                filter: 'all' // all, active, completed
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
            
            const deleteTodo = (id) => {
                const index = state.todos.findIndex(t => t.id === id);
                if (index > -1) state.todos.splice(index, 1);
            };
            
            const getFilteredTodos = () => {
                if (state.filter === 'active') {
                    return state.todos.filter(t => !t.completed);
                } else if (state.filter === 'completed') {
                    return state.todos.filter(t => t.completed);
                }
                return state.todos;
            };
            
            const filteredTodos = getFilteredTodos();
            const activeCount = state.todos.filter(t => !t.completed).length;
            
            const template = html`
                <div>
                    <!-- 输入框 -->
                    <div style="margin-bottom: 20px;">
                        <input 
                            type="text" 
                            placeholder="添加新任务..."
                            .value=${state.newTodo}
                            onInput=${(e) => state.newTodo = e.target.value}
                            onKeypress=${(e) => e.key === 'Enter' && addTodo()}
                        />
                        <button onClick=${addTodo}>添加</button>
                    </div>
                    
                    <!-- 过滤器 -->
                    <div style="margin-bottom: 20px;">
                        <button 
                            onClick=${() => state.filter = 'all'}
                            style="${state.filter === 'all' ? 'font-weight: bold;' : ''}">
                            全部
                        </button>
                        <button 
                            onClick=${() => state.filter = 'active'}
                            style="${state.filter === 'active' ? 'font-weight: bold;' : ''}">
                            进行中
                        </button>
                        <button 
                            onClick=${() => state.filter = 'completed'}
                            style="${state.filter === 'completed' ? 'font-weight: bold;' : ''}">
                            已完成
                        </button>
                    </div>
                    
                    <!-- 任务列表 -->
                    <div>
                        ${filteredTodos.length === 0 
                            ? html`<p style="text-align: center; color: #999;">暂无任务</p>`
                            : filteredTodos.map(todo => html`
                                <div class="todo-item ${todo.completed ? 'completed' : ''}">
                                    <span 
                                        class="todo-text"
                                        onClick=${() => toggleTodo(todo.id)}>
                                        ${todo.completed ? '✅' : '⭕'} ${todo.text}
                                    </span>
                                    <button onClick=${() => deleteTodo(todo.id)}>删除</button>
                                </div>
                            `).join('')
                        }
                    </div>
                    
                    <!-- 统计信息 -->
                    <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 5px;">
                        <strong>统计：</strong>
                        总计 ${state.todos.length} 项，
                        待完成 ${activeCount} 项，
                        已完成 ${state.todos.length - activeCount} 项
                    </div>
                </div>
            `;
            
            render(template, container);
        }, container);
    </script>
</body>
</html>
```

## 🎨 样式绑定技巧

### 1. 动态 class

```javascript
html`
    <div class=${{ 
        'active': isActive, 
        'disabled': isDisabled,
        'error': hasError 
    }}>
        内容
    </div>
`;
```

### 2. 动态 style

```javascript
html`
    <div style=${{
        color: textColor,
        fontSize: fontSize + 'px',
        backgroundColor: bgColor
    }}>
        内容
    </div>
`;
```

### 3. 内联样式字符串

```javascript
html`
    <div style="color: ${color}; font-size: ${size}px;">
        内容
    </div>
`;
```

## 🔧 事件处理

### 1. 基础事件

```javascript
html`
    <button onClick=${handleClick}>点击</button>
    <input onInput=${handleInput} />
    <form onSubmit=${handleSubmit}>...</form>
`;
```

### 2. 传递参数

```javascript
const handleClick = (id) => {
    console.log('点击了:', id);
};

html`
    <button onClick=${() => handleClick(123)}>点击</button>
`;
```

### 3. 获取事件对象

```javascript
const handleInput = (e) => {
    console.log('输入值:', e.target.value);
};

html`
    <input onInput=${handleInput} />
`;
```

## 💡 最佳实践

### ✅ 推荐做法

1. **使用 createState 管理简单状态**
```javascript
const [count, setCount] = createState(0);
```

2. **使用 reactive 管理复杂对象**
```javascript
const state = reactive({ user: { name: 'Tom', age: 25 } });
```

3. **使用 computed 优化计算**
```javascript
const total = computed(() => items.reduce((sum, item) => sum + item.price, 0));
```

4. **保持组件小而专注**
```javascript
// 好：每个组件做一件事
function UserCard(user) { ... }
function TodoList(todos) { ... }
```

### ❌ 避免做法

1. **不要在模板中进行复杂计算**
```javascript
// 不好
html`<div>${items.reduce((sum, item) => sum + item.price, 0)}</div>`

// 好
const total = computed(() => items.reduce((sum, item) => sum + item.price, 0));
html`<div>${total()}</div>`
```

2. **不要创建过多的响应式对象**
```javascript
// 不好：每次都创建新对象
items.forEach(item => reactive(item));

// 好：只在需要时创建
const state = reactive({ items: [...] });
```

## 📚 进阶学习

完成了快速开始？继续学习：

1. 📖 **阅读完整文档** → `README-reactive-lit.md`
2. 🎯 **查看丰富示例** → `examples.html`
3. ⚖️ **理解框架优势** → `comparison.html`
4. 📋 **了解项目结构** → `PROJECT-OVERVIEW.md`

## 🎉 恭喜！

你已经掌握了 Reactive-Lit 的基础用法！现在可以开始构建你自己的响应式应用了。

有问题或建议？欢迎反馈！

