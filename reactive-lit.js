/**
 * Reactive-Lit - 一个轻量级的响应式模板框架
 * 仿照 lit-html 实现，支持最小粒度的 DOM 更新和响应式数据绑定
 */

// ========== 响应式系统核心 ==========

// 当前正在收集依赖的 effect
let currentEffect = null;
// 依赖追踪映射表：target -> key -> Set<effect>
const targetMap = new WeakMap();
// 批量更新队列
const updateQueue = new Set();
let isFlushing = false;
let isFlushPending = false;

/**
 * 创建响应式对象
 * @param {Object} obj - 原始对象
 * @returns {Proxy} 响应式代理对象
 */
function reactive(obj) {
  // 如果已经是响应式对象，直接返回
  if (obj && obj.__isReactive) {
    return obj;
  }
  
  return new Proxy(obj, {
    get(target, key) {
      // 标记为响应式对象
      if (key === '__isReactive') {
        return true;
      }
      
      // 依赖收集
      track(target, key);
      const value = target[key];
      // 如果值是对象，递归创建响应式
      if (value && typeof value === 'object') {
        return reactive(value);
      }
      return value;
    },
    set(target, key, value) {
      const oldValue = target[key];
      if (oldValue !== value) {
        target[key] = value;
        // 触发更新
        trigger(target, key);
      }
      return true;
    }
  });
}

/**
 * 依赖收集
 */
function track(target, key) {
  if (!currentEffect) return;
  
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  
  let deps = depsMap.get(key);
  if (!deps) {
    deps = new Set();
    depsMap.set(key, deps);
  }
  
  deps.add(currentEffect);
  // 让 effect 记住它的依赖，便于清理
  if (currentEffect.deps) {
    currentEffect.deps.push(deps);
  }
}

/**
 * 触发更新（批量处理）
 */
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  
  const deps = depsMap.get(key);
  if (deps) {
    // 将所有 effect 加入更新队列
    deps.forEach(effect => {
      if (effect !== currentEffect) { // 避免无限循环
        queueJob(effect);
      }
    });
  }
}

/**
 * 将 effect 加入队列
 */
function queueJob(job) {
  updateQueue.add(job);
  queueFlush();
}

/**
 * 刷新队列
 */
function queueFlush() {
  if (!isFlushPending && !isFlushing) {
    isFlushPending = true;
    // 使用 Promise.resolve 或 setTimeout 来异步批量更新
    Promise.resolve().then(flushJobs);
  }
}

/**
 * 执行队列中的所有更新
 */
function flushJobs() {
  isFlushPending = false;
  isFlushing = true;
  
  try {
    // 执行所有排队的 effect
    const jobs = Array.from(updateQueue);
    updateQueue.clear();
    jobs.forEach(job => job());
  } finally {
    isFlushing = false;
    // 如果在执行过程中又有新的更新，继续处理
    if (updateQueue.size > 0) {
      queueFlush();
    }
  }
}

/**
 * 清理 effect 的依赖
 */
function cleanupEffect(effect) {
  if (effect.deps) {
    effect.deps.forEach(dep => {
      dep.delete(effect);
    });
    effect.deps.length = 0;
  }
}

/**
 * 创建 effect（副作用函数）
 * @param {Function} fn - 要执行的函数
 * @returns {Function} effect 函数
 */
function effect(fn, options = {}) {
  const effectFn = () => {
    // 清理旧的依赖
    cleanupEffect(effectFn);
    
    const prevEffect = currentEffect;
    currentEffect = effectFn;
    try {
      return fn();
    } finally {
      currentEffect = prevEffect;
    }
  };
  
  // 存储依赖集合
  effectFn.deps = [];
  effectFn.options = options;
  
  // 立即执行一次以建立依赖关系
  if (!options.lazy) {
    effectFn();
  }
  
  return effectFn;
}

/**
 * 创建计算属性
 * @param {Function} getter - 计算函数
 * @returns {Function} 返回计算属性的 getter
 */
function computed(getter) {
  let cache = null;
  let dirty = true;
  
  // 创建一个 lazy effect
  const computedEffect = effect(() => {
    cache = getter();
    dirty = false;
  }, { lazy: true });
  
  // 创建一个响应式对象来追踪计算属性的访问
  const computedRef = {
    get value() {
      if (dirty) {
        computedEffect();
      }
      // 追踪对计算属性的访问
      track(computedRef, 'value');
      return cache;
    }
  };
  
  // 当依赖变化时，标记为脏并触发更新
  effect(() => {
    computedEffect();
    dirty = true;
    trigger(computedRef, 'value');
  });
  
  return () => computedRef.value;
}

// ========== 模板引擎核心 ==========

// 标记类型
const MARKER_PREFIX = '{{lit-';
const MARKER_SUFFIX = '}}';
let markerId = 0;

/**
 * 模板部分类 - 代表一个模板片段
 */
class TemplatePart {
  constructor(node, name, strings) {
    this.node = node;
    this.name = name; // 属性名或 'node' 表示文本节点
    this.strings = strings;
    this.value = undefined;
  }
  
  /**
   * 更新部分内容
   */
  setValue(value) {
    if (this.value === value) return; // 值未变化，不更新
    this.value = value;
    this.commit();
  }
  
  /**
   * 提交更改到 DOM
   */
  commit() {
    const value = this.value;
    
    if (this.name === 'node') {
      // 文本节点更新
      this.node.textContent = value == null ? '' : value;
    } else if (this.name.startsWith('on')) {
      // 事件监听器
      const eventName = this.name.slice(2).toLowerCase();
      if (this._listener) {
        this.node.removeEventListener(eventName, this._listener);
      }
      if (typeof value === 'function') {
        this._listener = value;
        this.node.addEventListener(eventName, value);
      }
    } else if (this.name === 'class') {
      // class 属性
      if (typeof value === 'object') {
        const classes = Object.keys(value).filter(k => value[k]);
        this.node.className = classes.join(' ');
      } else {
        this.node.className = value || '';
      }
    } else if (this.name === 'style') {
      // style 属性
      if (typeof value === 'object') {
        Object.assign(this.node.style, value);
      } else {
        this.node.style.cssText = value || '';
      }
    } else if (this.name.startsWith('.')) {
      // 属性设置（property）
      const propName = this.name.slice(1);
      this.node[propName] = value;
    } else {
      // 普通属性
      if (value == null || value === false) {
        this.node.removeAttribute(this.name);
      } else if (value === true) {
        this.node.setAttribute(this.name, '');
      } else {
        this.node.setAttribute(this.name, value);
      }
    }
  }
}

/**
 * 模板结果类
 */
class TemplateResult {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
  }
}

/**
 * 模板实例类 - 管理一个模板的实例化和更新
 */
class TemplateInstance {
  constructor(template, container) {
    this.template = template;
    this.container = container;
    this.parts = [];
    this._createInstance();
  }
  
  /**
   * 创建模板实例
   */
  _createInstance() {
    const fragment = this.template.element.content.cloneNode(true);
    const walker = document.createTreeWalker(
      fragment,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT,
      null
    );
    
    const parts = [];
    let node;
    let partIndex = 0;
    
    while ((node = walker.nextNode())) {
      // 处理元素节点的属性
      if (node.nodeType === Node.ELEMENT_NODE) {
        const attributes = node.attributes;
        for (let i = 0; i < attributes.length; i++) {
          const attr = attributes[i];
          const name = attr.name;
          const value = attr.value;
          
          // 查找标记
          const markerMatch = value.match(new RegExp(MARKER_PREFIX + '(\\d+)' + MARKER_SUFFIX));
          if (markerMatch) {
            const index = parseInt(markerMatch[1]);
            const part = new TemplatePart(node, name, this.template.strings);
            parts[index] = part;
            
            // 清除标记属性
            node.removeAttribute(name);
            i--;
          }
        }
      }
      
      // 处理注释节点（文本内容标记）
      if (node.nodeType === Node.COMMENT_NODE) {
        const match = node.textContent.match(new RegExp(MARKER_PREFIX + '(\\d+)' + MARKER_SUFFIX));
        if (match) {
          const index = parseInt(match[1]);
          // 创建文本节点
          const textNode = document.createTextNode('');
          node.parentNode.insertBefore(textNode, node);
          const part = new TemplatePart(textNode, 'node', this.template.strings);
          parts[index] = part;
        }
      }
    }
    
    this.parts = parts;
    this._fragment = fragment;
  }
  
  /**
   * 更新模板值
   */
  update(values) {
    this.parts.forEach((part, index) => {
      if (part) {
        part.setValue(values[index]);
      }
    });
  }
  
  /**
   * 挂载到容器
   */
  mount() {
    this.container.appendChild(this._fragment);
  }
}

/**
 * 模板类 - 缓存和管理模板
 */
class Template {
  constructor(strings) {
    this.strings = strings;
    this.element = this._createElement(strings);
  }
  
  /**
   * 创建模板元素
   */
  _createElement(strings) {
    const template = document.createElement('template');
    let html = '';
    
    for (let i = 0; i < strings.length; i++) {
      html += strings[i];
      if (i < strings.length - 1) {
        // 检查是否在属性位置
        if (this._isAttributePosition(html)) {
          // 属性值位置
          html += MARKER_PREFIX + i + MARKER_SUFFIX;
        } else {
          // 文本内容位置
          html += `<!--${MARKER_PREFIX}${i}${MARKER_SUFFIX}-->`;
        }
      }
    }
    
    template.innerHTML = html;
    return template;
  }
  
  /**
   * 判断是否在属性位置
   */
  _isAttributePosition(html) {
    const lastOpenTag = html.lastIndexOf('<');
    const lastCloseTag = html.lastIndexOf('>');
    return lastOpenTag > lastCloseTag;
  }
}

// 模板缓存
const templateCache = new Map();

/**
 * 获取或创建模板
 */
function getTemplate(strings) {
  let template = templateCache.get(strings);
  if (!template) {
    template = new Template(strings);
    templateCache.set(strings, template);
  }
  return template;
}

/**
 * html 模板标签函数
 * @param {Array<string>} strings - 字符串片段
 * @param {...any} values - 插值
 * @returns {TemplateResult}
 */
function html(strings, ...values) {
  return new TemplateResult(strings, values);
}

/**
 * 渲染函数 - 将模板渲染到容器中
 * @param {TemplateResult} result - 模板结果
 * @param {HTMLElement} container - 容器元素
 */
function render(result, container) {
  if (!(result instanceof TemplateResult)) {
    throw new Error('render() 需要 TemplateResult 参数');
  }
  
  // 获取或创建实例
  if (!container._templateInstance || 
      container._templateInstance.template.strings !== result.strings) {
    container.innerHTML = '';
    const template = getTemplate(result.strings);
    const instance = new TemplateInstance(template, container);
    container._templateInstance = instance;
    instance.update(result.values);
    instance.mount();
  } else {
    // 只更新值
    container._templateInstance.update(result.values);
  }
}

// 存储组件的状态，避免重复创建
let currentComponentStates = null;
let currentStateIndex = 0;

/**
 * 创建组件函数
 * @param {Function} setup - 组件的设置函数
 * @param {HTMLElement} container - 挂载容器
 * @returns {Object} 包含 update 和 unmount 方法的对象
 */
function createComponent(setup, container) {
  // 该组件的所有状态存储在这个数组中
  const states = [];
  
  // 创建一个 effect，setup 函数在 effect 中执行
  const updateEffect = effect(() => {
    // 设置当前组件上下文
    const prevStates = currentComponentStates;
    const prevIndex = currentStateIndex;
    
    currentComponentStates = states;
    currentStateIndex = 0;
    
    try {
      // 执行 setup 函数，它会调用 createState 和 render
      setup();
    } finally {
      // 恢复之前的上下文（支持组件嵌套）
      currentComponentStates = prevStates;
      currentStateIndex = prevIndex;
    }
  });
  
  return {
    update: () => updateEffect(),
    unmount: () => {
      container.innerHTML = '';
    }
  };
}

/**
 * 创建响应式状态
 * @param {any} initialValue - 初始值
 * @returns {Array} [getter, setter]
 */
function createState(initialValue) {
  if (!currentComponentStates) {
    throw new Error('createState 必须在 createComponent 的 setup 函数中调用');
  }
  
  // 获取当前状态索引
  const index = currentStateIndex++;
  const states = currentComponentStates;
  
  // 如果状态不存在，创建它（只在第一次渲染时创建）
  if (!states[index]) {
    const state = reactive({ value: initialValue });
    states[index] = state;
  }
  
  const state = states[index];
  
  // 返回 getter 和 setter
  const getter = () => {
    // 在 getter 被调用时追踪依赖
    return state.value;
  };
  
  const setter = (newValue) => {
    state.value = newValue;
  };
  
  return [getter, setter];
}

// ========== 对外暴露的 API ==========

// 导出所有公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    html,
    render,
    reactive,
    effect,
    computed,
    createComponent,
    createState
  };
} else if (typeof window !== 'undefined') {
  window.ReactiveLit = {
    html,
    render,
    reactive,
    effect,
    computed,
    createComponent,
    createState
  };
}

