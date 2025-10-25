# 🎯 响应式框架设计方案

## 当前问题

### 现状
1. ✅ Setup 只执行一次
2. ❌ 渲染函数每次状态变化都执行
3. ✅ 模板系统支持细粒度更新

### 期望
- 渲染函数只执行一次
- 状态变化时，只更新模板中变化的部分
- 不需要像 React 那样每次 diff

## 🔧 解决方案

### 方案 A：当前实现（简单但不够高效）

```javascript
createComponent('my-counter', () => {
  const count = useState(0);
  
  return () => html`<div>${count()}</div>`;
  //     ↑ 每次状态变化都执行
});
```

**流程：**
1. Setup 执行一次
2. 返回渲染函数
3. 渲染函数包在 effect 中
4. 状态变化 → effect 重新执行 → 渲染函数执行 → 生成新 TemplateResult
5. `render()` 调用 `TemplateInstance.update(newValues)`
6. 只更新变化的 parts

**优点：**
- 实现简单
- 兼容性好
- 用户API简单

**缺点：**
- 渲染函数每次都执行（计算新的 values）

### 方案 B：细粒度响应式（复杂但最优）

```javascript
createComponent('my-counter', () => {
  const count = useState(0);
  
  return () => html`<div>${() => count()}</div>`;
  //                        ↑ 传入 getter 函数
});
```

**流程：**
1. Setup 执行一次
2. 渲染函数执行一次，生成 TemplateResult（values 包含 getter 函数）
3. 为每个 TemplatePart 创建独立的 effect
4. 状态变化 → 只重新求值对应的 getter → 只更新对应的 part

**优点：**
- 最细粒度的更新
- 渲染函数只执行一次
- 性能最优

**缺点：**
- 用户需要手动包装 `() => count()`
- 实现复杂
- 需要区分 getter 和事件处理器

### 方案 C：编译时优化（需要构建工具）

使用 Babel/SWC 插件自动转换：

```javascript
// 用户写
html`<div>${count()}</div>`

// 编译后
html`<div>${() => count()}</div>`
```

## 📊 方案对比

| 方案 | 渲染函数执行 | 用户API | 实现难度 | 性能 |
|------|------------|---------|---------|------|
| A - 当前 | 每次 | 简单 | 简单 | 良好 |
| B - 细粒度 | 一次 | 复杂 | 复杂 | 最优 |
| C - 编译 | 一次 | 简单 | 最复杂 | 最优 |

## 🎯 推荐方案

### 短期：保持方案 A
- 实现简单，用户API友好
- 性能已经很好（模板系统做了细粒度更新）
- 渲染函数执行开销不大（只是计算values）

### 长期：实现方案 B + 保持方案 A 兼容

提供两种API：

```javascript
// 简单模式（自动响应式）
createComponent('simple', () => {
  const count = useState(0);
  return () => html`<div>${count()}</div>`;
});

// 高性能模式（手动优化）
createComponent('optimized', () => {
  const count = useState(0);
  return html`<div>${() => count()}</div>`;
  //     ↑ 直接返回模板，不返回函数
  //          values 中的 getter 会被自动包装 effect
});
```

## 🚀 实现细节（方案 B）

### 1. TemplatePart 增加 effect 支持

```javascript
class TemplatePart {
  setValue(value) {
    // 如果是函数且不是事件处理器
    if (typeof value === 'function' && this.name === 'node') {
      // 包装在 effect 中
      if (!this._effect) {
        this._effect = effect(() => {
          const result = value(); // 调用 getter
          this.commit(result);
        });
      }
      return;
    }
    
    // 正常流程
    if (this.value !== value) {
      this.value = value;
      this.commit();
    }
  }
}
```

### 2. 区分 getter 和事件处理器

```javascript
function isGetter(fn) {
  // getter: 箭头函数，无参数，返回值
  // handler: 通常有参数(event)
  const str = fn.toString();
  return /^\(\)\s*=>/.test(str) || /^function\s*\(\)\s*\{/.test(str);
}
```

### 3. 用户API

```javascript
html`
  <div>
    ${() => count()}           <!-- getter: 自动响应式 -->
    <button onClick=${handleClick}>  <!-- handler: 事件 -->
  `
```

## 📝 总结

当前实现已经足够好，渲染函数重新执行的开销很小。如果未来需要极致性能，可以实现方案B作为可选优化。

