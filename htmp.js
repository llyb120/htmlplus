/**
 * 极简响应式模板框架
 * 特性：
 * 1. useState(initialValue) - 一个函数搞定 get/set
 * 2. 基于 Web Components 的函数式组件
 * 3. 支持插槽（slots）
 * 4. 自动批量更新
 */

// ========== Props 传递系统 ==========
; (function () {
    // 全局 prop ID 计数器
    let propIdCounter = 0;

    // 全局 WeakMap 存储 prop 函数
    // key: 组件实例, value: Map<propId, propFunction>
    const globalPropsMap = new WeakMap();

    /**
     * 创建 prop 函数并注册到全局 map
     */
    function createPropFunction(componentInstance, propName, value) {
        const propId = `__prop_${propIdCounter++}`;

        // 如果值已经是函数，直接使用
        if (typeof value === 'function') {
            return { propId, propFunc: value };
        }

        // 否则包装成 useState 风格的函数
        let currentValue = value;
        const propFunc = function (newValue) {
            if (arguments.length === 0) {
                return currentValue;
            } else {
                currentValue = newValue;
                // 触发组件更新
                if (componentInstance._mounted && componentInstance._effect) {
                    queueJob(componentInstance._effect);
                }
            }
        };

        return { propId, propFunc };
    }

    /**
     * 注册 prop 函数到元素上（改为直接存储在子组件元素上）
     */
    function registerProp(element, propId, propFunc) {
        if (!element._propsStore) {
            element._propsStore = new Map();
        }
        element._propsStore.set(propId, propFunc);
    }

    /**
     * 从元素获取 prop 函数
     */
    function getPropFunction(element, propId) {
        return element._propsStore ? element._propsStore.get(propId) : undefined;
    }

    // ========== 响应式系统核心 ==========

    let currentEffect = null;
    const targetMap = new WeakMap();
    const updateQueue = new Set();
    let isFlushPending = false;

    // 缓存响应式代理，避免重复创建
    const reactiveMap = new WeakMap();
    // 存储对象的父级信息
    const parentMap = new WeakMap();
    // 缓存 setup 函数参数解析结果
    const functionParamsCache = new WeakMap();

    function reactive(obj, parentTarget = null, parentKey = null) {
        if (!obj || typeof obj !== 'object') return obj;
        if (obj.__isReactive) return obj;

        // 如果已经创建过代理，更新父级信息并返回
        if (reactiveMap.has(obj)) {
            const proxy = reactiveMap.get(obj);
            // 更新父级信息
            if (parentTarget && parentKey !== null) {
                parentMap.set(obj, { parentTarget, parentKey });
            }
            return proxy;
        }

        // 存储父级信息
        if (parentTarget && parentKey !== null) {
            parentMap.set(obj, { parentTarget, parentKey });
        }

        const proxy = new Proxy(obj, {
            get(target, key) {
                if (key === '__isReactive') return true;
                if (key === '__raw') return target;

                // 追踪访问
                track(target, key);

                // 对于数组，额外追踪一个特殊的依赖标记
                if (Array.isArray(target)) {
                    track(target, '__array__');
                }

                const value = target[key];

                // 递归代理嵌套对象，传递父级信息
                return value && typeof value === 'object' ? reactive(value, target, key) : value;
            },
            set(target, key, value) {
                const oldValue = target[key];
                target[key] = value;

                // 只在值真正改变时触发
                if (oldValue !== value || (typeof value === 'object' && value !== null)) {
                    trigger(target, key);

                    // 数组长度变化时，触发数组依赖
                    if (Array.isArray(target) && key === 'length') {
                        trigger(target, '__array__');
                    }

                    // 如果这个对象是某个对象的属性（如 state.value），也触发父对象
                    const parentInfo = parentMap.get(target);
                    if (parentInfo) {
                        trigger(parentInfo.parentTarget, parentInfo.parentKey);
                    }
                }

                return true;
            }
        });

        // 拦截数组的变异方法
        if (Array.isArray(obj)) {
            const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
            arrayMethods.forEach(method => {
                const original = Array.prototype[method];
                Object.defineProperty(proxy, method, {
                    value: function (...args) {
                        // 在原始对象上调用方法
                        const raw = this.__raw || obj;
                        const result = original.apply(raw, args);

                        // 触发数组自身的依赖
                        trigger(obj, '__array__');
                        trigger(obj, 'length');

                        // 如果数组是某个对象的属性，也触发父对象的依赖
                        const parentInfo = parentMap.get(obj);
                        if (parentInfo) {
                            trigger(parentInfo.parentTarget, parentInfo.parentKey);
                        }

                        return result;
                    },
                    enumerable: false,
                    configurable: true,
                    writable: true
                });
            });
        }

        reactiveMap.set(obj, proxy);
        return proxy;
    }

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
        if (currentEffect.deps) {
            currentEffect.deps.push(deps);
        }
    }

    function trigger(target, key) {
        const depsMap = targetMap.get(target);
        if (!depsMap) return;

        const deps = depsMap.get(key);
        if (deps) {
            deps.forEach(effect => {
                if (effect !== currentEffect) {
                    queueJob(effect);
                }
            });
        }
    }

    function queueJob(job) {
        updateQueue.add(job);
        if (!isFlushPending) {
            isFlushPending = true;
            Promise.resolve().then(() => {
                const jobs = Array.from(updateQueue);
                updateQueue.clear();
                isFlushPending = false;
                jobs.forEach(job => job());
            });
        }
    }

    function cleanupEffect(effect) {
        if (effect.deps) {
            effect.deps.forEach(dep => dep.delete(effect));
            effect.deps.length = 0;
        }
    }

    function effect(fn) {
        const effectFn = () => {
            cleanupEffect(effectFn);
            const prevEffect = currentEffect;
            currentEffect = effectFn;
            try {
                return fn();
            } finally {
                currentEffect = prevEffect;
            }
        };

        effectFn.deps = [];
        effectFn();
        return effectFn;
    }

    // ========== 模板引擎核心 ==========

    const MARKER_PREFIX = '{{lit-';
    const MARKER_SUFFIX = '}}';
    const MARKER_REGEX = new RegExp(MARKER_PREFIX + '(\\d+)' + MARKER_SUFFIX);
    const htmlStringCache = new Map();
    const templateResultSnapshotCache = new WeakMap();
    const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
        'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const functionSignatureCache = new WeakMap();
    const styleStringCache = new WeakMap();
    const _htmlParseDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
    const FAST_LIST_THRESHOLD = 50000;
    const CHUNK_THRESHOLD = 100000;
    const CHUNK_SIZE = 5000;

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => (
            c === '&' ? '&amp;' :
            c === '<' ? '&lt;' :
            c === '>' ? '&gt;' :
            c === '"' ? '&quot;' : '&#39;'
        ));
    }

    function isSimpleWrapperTemplate(result) {
        if (!(result && result.strings && result.strings.length === 2)) return null;
        const open = result.strings[0].trim();
        const close = result.strings[1].trim();
        const m = open.match(/^<([a-zA-Z0-9-]+)>$/);
        if (!m) return null;
        const tag = m[1];
        if (close !== `</${tag}>`) return null;
        return { open: result.strings[0], close: result.strings[1] };
    }

    function scheduleChunkedHTMLAppend(self, open, close, newArray) {
        const node = self.node;
        const token = Symbol('chunk');
        node._chunkToken = token;
        node.innerHTML = '';
        let i = 0;

        function step(deadline) {
            if (node._chunkToken !== token) return; // canceled
            const batch = [];
            let processed = 0;
            const canContinue = () => !deadline || (typeof deadline.timeRemaining === 'function' && deadline.timeRemaining() > 1);
            while (i < newArray.length && processed < CHUNK_SIZE && canContinue()) {
                const v = newArray[i].values[0];
                batch.push(open + escapeHtml(v == null ? '' : v) + close);
                i++; processed++;
            }
            if (batch.length) node.insertAdjacentHTML('beforeend', batch.join(''));
            if (i < newArray.length) {
                if (typeof requestIdleCallback === 'function') {
                    requestIdleCallback(step);
                } else {
                    setTimeout(step, 0);
                }
            } else {
                // 完成后再写入缓存，避免中途跳过更新
                self._cachedArray = newArray.map(item => self._cloneArrayItem(item));
                self._cachedArraySource = newArray;
            }
        }

        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(step);
        } else {
            setTimeout(step, 0);
        }
    }

    function isDestructuredSetup(fn) {
        let cached = functionSignatureCache.get(fn);
        if (cached && typeof cached.isDestructured === 'boolean') return cached.isDestructured;
        const sig = fn.toString().trim();
        const isDestructured = /^(?:\(?function\s*\(?\s*\{|\(\s*\{)/.test(sig);
        functionSignatureCache.set(fn, { isDestructured });
        return isDestructured;
    }

    function getTemplateSnapshot(result) {
        let snapshot = templateResultSnapshotCache.get(result);
        if (!snapshot) {
            snapshot = { strings: result.strings, values: [...result.values] };
            templateResultSnapshotCache.set(result, snapshot);
        }
        return snapshot;
    }

    class TemplatePart {
        constructor(node, name) {
            this.node = node;
            this.name = name;
            this.value = undefined;
        }

        setValue(value) {
            // 基本类型直接比较
            if (this.value === value) return;

            // 特殊处理：如果新旧值都是同类型的复杂对象，进行深度比较
            if (this.value !== undefined && value !== undefined) {
                // 数组比较
                if (Array.isArray(this.value) && Array.isArray(value)) {
                    if (this._arraysEqual(this.value, value)) return;
                }
                // TemplateResult 比较（通过字符串模板判断）
                else if (this.value instanceof TemplateResult && value instanceof TemplateResult) {
                    if (this.value.strings === value.strings && this._arraysEqual(this.value.values, value.values)) {
                        return;
                    }
                }
                // UnsafeHTML 比较
                else if (this.value instanceof UnsafeHTML && value instanceof UnsafeHTML) {
                    if (this.value.html === value.html) return;
                }
            }

            this.value = value;
            this.commit();
        }

        _arraysEqual(a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                // 对于 TemplateResult，需要深度比较
                if (a[i] instanceof TemplateResult && b[i] instanceof TemplateResult) {
                    if (a[i].strings !== b[i].strings) return false;
                    if (!this._arraysEqual(a[i].values, b[i].values)) return false;
                } else if (a[i] !== b[i]) {
                    // 如果是对象或数组，做深度比较
                    if (typeof a[i] === 'object' && typeof b[i] === 'object' && a[i] !== null && b[i] !== null) {
                        if (Array.isArray(a[i]) && Array.isArray(b[i])) {
                            if (!this._arraysEqual(a[i], b[i])) return false;
                        } else if (!this._deepEqual(a[i], b[i])) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
            return true;
        }

        _deepEqual(obj1, obj2) {
            if (obj1 === obj2) return true;
            if (!obj1 || !obj2) return false;
            if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;

            // 特殊类型处理
            if (obj1 instanceof TemplateResult && obj2 instanceof TemplateResult) {
                return obj1.strings === obj2.strings && this._arraysEqual(obj1.values, obj2.values);
            }

            const keys1 = Object.keys(obj1);
            const keys2 = Object.keys(obj2);

            if (keys1.length !== keys2.length) return false;

            for (let key of keys1) {
                if (!keys2.includes(key)) return false;

                const val1 = obj1[key];
                const val2 = obj2[key];

                if (typeof val1 === 'object' && typeof val2 === 'object') {
                    if (Array.isArray(val1) && Array.isArray(val2)) {
                        if (!this._arraysEqual(val1, val2)) return false;
                    } else {
                        if (!this._deepEqual(val1, val2)) return false;
                    }
                } else if (val1 !== val2) {
                    return false;
                }
            }

            return true;
        }

        /**
         * 检测字符串是否包含 HTML 标签
         */
        _isHTMLString(str) {
            if (typeof str !== 'string') return false;

            if (htmlStringCache.has(str)) {
                return htmlStringCache.get(str);
            }

            // 检查是否包含 [object Object]，如果有则给出警告
            if (str.includes('[object Object]')) {
                console.error(
                    '❌ 检测到 [object Object]！\n' +
                    '这通常是因为在字符串模板中使用了 slot()、事件函数或其他对象。\n\n' +
                    '❌ 错误用法：\n' +
                    '  `<div>${slot()}</div>`\n\n' +
                    '✅ 正确用法：\n' +
                    '  html`<div>${slot()}</div>`\n\n' +
                    '提示：在条件渲染中也要使用 html``：\n' +
                    "  ${show ? html`<div>${slot()}</div>` : ''}"
                );
                htmlStringCache.set(str, false);
                return false;
            }

            // 简单检测：包含 < 和 > 且看起来像标签
            const result = /<[^>]+>/.test(str);
            htmlStringCache.set(str, result);
            return result;
        }

        /**
         * 智能更新数组 - 最小化 DOM 操作
         */
        _updateArray(newArray) {
            // 快速路径：同一数组引用则跳过
            if (this._cachedArraySource === newArray) return;
            const childNodes = this.node.childNodes; // live NodeList，按需索引
            const oldArray = this._cachedArray || [];

            // 大列表快速路径：同构 TemplateResult 列表，使用拼接 innerHTML 一次性更新
            const newLength = newArray.length;
            const oldLength = oldArray.length;
            
            if (newLength >= FAST_LIST_THRESHOLD && newArray[0] instanceof TemplateResult) {
                const simple = isSimpleWrapperTemplate(newArray[0]);
                if (simple) {
                    const baseStrings = newArray[0].strings;
                    let homogeneous = true;
                    for (let i = 1; i < newLength; i++) {
                        const item = newArray[i];
                        if (!(item instanceof TemplateResult) || item.strings !== baseStrings || item.values.length !== 1) {
                            homogeneous = false; break;
                        }
                    }
                    if (homogeneous) {
                        const open = baseStrings[0];
                        const close = baseStrings[1];
                        
                        // 首次渲染（oldArray为空）
                        if (oldLength === 0) {
                            if (newLength >= CHUNK_THRESHOLD) {
                                // 超大列表：分片追加
                                scheduleChunkedHTMLAppend(this, open, close, newArray);
                                return;
                            } else {
                                // 直接一次性 innerHTML 更新
                                const builder = new Array(newLength);
                                for (let i = 0; i < newLength; i++) {
                                    const v = newArray[i].values[0];
                                    builder[i] = open + escapeHtml(v == null ? '' : v) + close;
                                }
                                this.node.innerHTML = builder.join('');
                                this._cachedArray = newArray.map(item => this._cloneArrayItem(item));
                                this._cachedArraySource = newArray;
                                return;
                            }
                        }
                        
                        // 对于已经渲染过的列表，检查变化数量
                        // 如果变化的项目较少（< 10%），使用diff算法进行最小粒度更新
                        if (oldLength > 0 && newLength === oldLength) {
                            let changedCount = 0;
                            const maxChangesForDiff = Math.max(10, Math.floor(newLength * 0.1)); // 最多10%或至少10个
                            
                            for (let i = 0; i < newLength && changedCount <= maxChangesForDiff; i++) {
                                if (!this._itemsEqual(newArray[i], oldArray[i])) {
                                    changedCount++;
                                }
                            }
                            
                            // 如果变化量小，使用diff更新而不是全量刷新
                            if (changedCount <= maxChangesForDiff) {
                                // 跳过快速路径，使用下面的diff算法
                            } else {
                                // 变化量大，使用innerHTML全量更新
                                const builder = new Array(newLength);
                                for (let i = 0; i < newLength; i++) {
                                    const v = newArray[i].values[0];
                                    builder[i] = open + escapeHtml(v == null ? '' : v) + close;
                                }
                                this.node.innerHTML = builder.join('');
                                this._cachedArray = newArray.map(item => this._cloneArrayItem(item));
                                this._cachedArraySource = newArray;
                                return;
                            }
                        } else {
                            // 长度不同，全量更新
                            const builder = new Array(newLength);
                            for (let i = 0; i < newLength; i++) {
                                const v = newArray[i].values[0];
                                builder[i] = open + escapeHtml(v == null ? '' : v) + close;
                            }
                            this.node.innerHTML = builder.join('');
                            this._cachedArray = newArray.map(item => this._cloneArrayItem(item));
                            this._cachedArraySource = newArray;
                            return;
                        }
                    }
                }
            }

            // 简单的 diff 算法
            const minLength = Math.min(newLength, oldLength);

            // 1. 更新现有的项
            for (let i = 0; i < minLength; i++) {
                const newItem = newArray[i];
                const oldItem = oldArray[i];
                const childNode = childNodes[i];

                // 检查项是否相同
                if (this._itemsEqual(newItem, oldItem)) {
                    // 相同，跳过
                    continue;
                }

                // 不同，需要更新
                if (newItem instanceof TemplateResult) {
                    if (childNode && childNode._templateInstance) {
                        // 尝试更新现有的模板实例
                        if (childNode._templateInstance.template.strings === newItem.strings) {
                            childNode._templateInstance.update(newItem.values);
                        } else {
                            // 模板结构不同，需要重新创建
                            // 根据模板内容创建合适的容器元素
                            const fragment = document.createDocumentFragment();
                            const tempContainer = document.createElement('div');
                            render(newItem, tempContainer);
                            // 将渲染结果移动到父节点
                            while (tempContainer.firstChild) {
                                fragment.appendChild(tempContainer.firstChild);
                            }
                            this.node.replaceChild(fragment, childNode);
                        }
                    } else {
                        // 没有模板实例，重新创建
                        const fragment = document.createDocumentFragment();
                        const tempContainer = document.createElement('div');
                        render(newItem, tempContainer);
                        // 将渲染结果移动到父节点
                        while (tempContainer.firstChild) {
                            fragment.appendChild(tempContainer.firstChild);
                        }
                        if (childNode) {
                            this.node.replaceChild(fragment, childNode);
                        } else {
                            this.node.appendChild(fragment);
                        }
                    }
                } else if (this._isHTMLString(newItem)) {
                    // HTML 字符串 - 直接插入 HTML（复用全局解析容器，减少分配）
                    if (_htmlParseDiv) {
                        _htmlParseDiv.innerHTML = newItem;
                        const fragment = document.createDocumentFragment();
                        while (_htmlParseDiv.firstChild) {
                            fragment.appendChild(_htmlParseDiv.firstChild);
                        }
                        if (childNode) {
                            this.node.replaceChild(fragment, childNode);
                        } else {
                            this.node.appendChild(fragment);
                        }
                    } else {
                        if (childNode) {
                            childNode.textContent = String(newItem);
                        } else {
                            const textNode = document.createTextNode(String(newItem));
                            this.node.appendChild(textNode);
                        }
                    }
                } else {
                    // 普通文本节点
                    if (childNode && childNode.nodeType === Node.TEXT_NODE) {
                        childNode.textContent = String(newItem);
                    } else {
                        const textNode = document.createTextNode(String(newItem));
                        if (childNode) {
                            this.node.replaceChild(textNode, childNode);
                        } else {
                            this.node.appendChild(textNode);
                        }
                    }
                }
            }

            // 2. 添加新项
            if (newLength > oldLength) {
                const batchFragment = document.createDocumentFragment();
                for (let i = oldLength; i < newLength; i++) {
                    const newItem = newArray[i];
                    if (newItem instanceof TemplateResult) {
                        // 创建临时容器来渲染模板，然后提取实际的DOM节点
                        const tempContainer = document.createElement('div');
                        render(newItem, tempContainer);
                        // 将渲染结果移动到fragment
                        while (tempContainer.firstChild) {
                            batchFragment.appendChild(tempContainer.firstChild);
                        }
                    } else if (this._isHTMLString(newItem)) {
                        if (_htmlParseDiv) {
                            _htmlParseDiv.innerHTML = newItem;
                            while (_htmlParseDiv.firstChild) {
                                batchFragment.appendChild(_htmlParseDiv.firstChild);
                            }
                        } else if (newItem != null) {
                            batchFragment.appendChild(document.createTextNode(String(newItem)));
                        }
                    } else if (newItem != null) {
                        batchFragment.appendChild(document.createTextNode(String(newItem)));
                    }
                }
                this.node.appendChild(batchFragment);
            }

            // 3. 删除多余的项
            if (newLength < oldLength) {
                for (let i = this.node.childNodes.length - 1; i >= newLength; i--) {
                    const childNode = this.node.childNodes[i];
                    if (childNode) {
                        if (childNode._templateInstance) {
                            delete childNode._templateInstance;
                        }
                        this.node.removeChild(childNode);
                    }
                }
            }

            // 缓存当前数组用于下次比较
            this._cachedArray = newArray.map(item => this._cloneArrayItem(item));
            this._cachedArraySource = newArray;
        }

        /**
         * 比较数组项是否相同
         */
        _itemsEqual(item1, item2) {
            if (item1 === item2) return true;

            if (item1 instanceof TemplateResult && item2 instanceof TemplateResult) {
                return item1.strings === item2.strings && this._arraysEqual(item1.values, item2.values);
            }

            if (typeof item1 === 'object' && typeof item2 === 'object') {
                if (item1 && item2 && item1.strings && item2.strings) {
                    // 缓存的 TemplateResult
                    return item1.strings === item2.strings && this._arraysEqual(item1.values, item2.values);
                }
                return this._deepEqual(item1, item2);
            }

            return item1 === item2;
        }

        _cloneArrayItem(item) {
            if (item instanceof TemplateResult) {
                return getTemplateSnapshot(item);
            }
            return item;
        }

        commit() {
            const value = this.value;

            if (this.name === 'node') {
                // 快速类型检查（避免重复调用 instanceof 和 _isHTMLString）
                const isUnsafeHTML = value instanceof UnsafeHTML;
                const isTemplateResult = value instanceof TemplateResult;
                const isArray = Array.isArray(value);
                
                // 如果是文本节点，需要升级为元素节点（用于复杂内容）
                const needsContainer = isUnsafeHTML || isTemplateResult || isArray || this._isHTMLString(value);

                if (needsContainer && this.node.nodeType === Node.TEXT_NODE) {
                    const span = document.createElement('span');
                    this.node.parentNode.replaceChild(span, this.node);
                    this.node = span;
                }

                // 支持 UnsafeHTML
                if (isUnsafeHTML) {
                    this.node.innerHTML = value.html;
                    // 清理旧的模板实例（innerHTML 会清空内容，需要清理实例引用）
                    if (this.node._templateInstance) {
                        delete this.node._templateInstance;
                    }
                } else if (isTemplateResult) {
                    // 支持嵌套的 TemplateResult
                    // 如果已存在实例且模板结构相同，直接更新 values
                    if (this.node._templateInstance && this.node._templateInstance.template.strings === value.strings) {
                        this.node._templateInstance.update(value.values);
                    } else {
                        // 模板结构不同，或不存在实例：清空并重新渲染
                        this.node.innerHTML = '';
                        delete this.node._templateInstance;
                        render(value, this.node);
                    }
                } else if (isArray) {
                    // 支持数组（特别是 TemplateResult 数组）
                    // 使用智能 diff 算法，最小化 DOM 操作
                    this._updateArray(value);
                } else {
                    // HTML 字符串或普通文本
                    // 优化：只有当之前是 TemplateResult 时才需要清理实例
                    const hadTemplateInstance = this.node._templateInstance;
                    
                    // 使用之前的 needsContainer 判断结果，避免重复调用 _isHTMLString
                    if (needsContainer) {
                        // HTML 字符串 - 直接使用 innerHTML
                        this.node.innerHTML = value;
                    } else {
                        // 普通值
                        this.node.textContent = value == null ? '' : value;
                    }
                    
                    // 统一清理：只在必要时执行 delete 操作
                    if (hadTemplateInstance) {
                        delete this.node._templateInstance;
                    }
                }
            } else if (this.name.toLowerCase().startsWith('on')) {
                // 处理 onClick -> click, onChange -> change, onclick -> click
                const eventName = this.name.slice(2).toLowerCase();

                if (this._listener) {
                    this.node.removeEventListener(eventName, this._listener);
                    this._listener = null;
                }
                if (typeof value === 'function') {
                    this._listener = value;
                    this.node.addEventListener(eventName, value);
                }
            } else if (this.name === 'class') {
                if (typeof value === 'object') {
                    const classes = Object.keys(value).filter(k => value[k]);
                    this.node.className = classes.join(' ');
                } else {
                    this.node.className = value || '';
                }
            } else if (this.name === 'style') {
                if (typeof value === 'object') {
                    Object.assign(this.node.style, value);
                } else {
                    this.node.style.cssText = value || '';
                }
            } else if (this.name.startsWith('.')) {
                // 处理点语法 .propName - 保留用于向后兼容
                const propName = this.name.slice(1);

                // 检查是否是自定义组件
                const descriptor = Object.getOwnPropertyDescriptor(this.node, propName);
                const hasSetterOrIsCustomComponent = descriptor?.set || this.node._jsProps;

                if (hasSetterOrIsCustomComponent && this.node._jsProps) {
                    if (descriptor?.set) {
                        this.node[propName] = value;
                    } else {
                        this.node._jsProps[propName] = value;
                    }
                } else {
                    this.node[propName] = value;
                }
            } else {
                // 普通属性传递
                // 检查是否是自定义组件（标签名包含 -）
                const isCustomElement = this.node.tagName && this.node.tagName.includes('-');

                if (isCustomElement && value !== null && value !== undefined) {
                    // 自定义组件：创建 prop 函数并传递 ID
                    const parentComponent = currentRenderingComponent || this.node._parentComponent;

                    // 创建 prop 函数（使用 parentComponent 或 null）
                    const { propId, propFunc } = createPropFunction(parentComponent, this.name, value);
                    // 直接存储在子元素上，而不是父组件上
                    registerProp(this.node, propId, propFunc);
                    // 设置 prop ID 作为属性值
                    this.node.setAttribute(this.name, propId);
                } else {
                    // 原生元素或 null/undefined
                    if (value == null || value === false) {
                        this.node.removeAttribute(this.name);
                    } else if (value === true) {
                        this.node.setAttribute(this.name, '');
                    } else {
                        this.node.setAttribute(this.name, String(value));
                    }
                }
            }
        }
    }

    class TemplateResult {
        constructor(strings, values) {
            this.strings = strings;
            this.values = values;
        }
    }

    class TemplateInstance {
        constructor(template, container) {
            this.template = template;
            this.container = container;
            this.parts = [];
            this._createInstance();
        }

        _createInstance() {
            const fragment = this.template.element.content.cloneNode(true);
            const walker = document.createTreeWalker(
                fragment,
                NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT
            );

            const parts = [];
            let node;

            while ((node = walker.nextNode())) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // 如果是自定义组件，设置父组件信息
                    if (node.tagName.includes('-') && currentRenderingComponent) {
                        node._parentComponent = currentRenderingComponent;
                    }

                    const attributes = node.attributes;
                    for (let i = 0; i < attributes.length; i++) {
                        const attr = attributes[i];
                        const match = attr.value.match(MARKER_REGEX);
                        if (match) {
                            const index = parseInt(match[1]);
                            const part = new TemplatePart(node, attr.name);
                            parts[index] = part;
                            node.removeAttribute(attr.name);
                            i--;
                        }
                    }
                }

                if (node.nodeType === Node.COMMENT_NODE) {
                    const match = node.textContent.match(MARKER_REGEX);
                    if (match) {
                        const index = parseInt(match[1]);
                        const textNode = document.createTextNode('');
                        node.parentNode.insertBefore(textNode, node);
                        const part = new TemplatePart(textNode, 'node');
                        parts[index] = part;
                    }
                }
            }

            this.parts = parts;
            this._fragment = fragment;
        }

        update(values) {
            this.parts.forEach((part, index) => {
                if (part) part.setValue(values[index]);
            });
        }

        mount() {
            this.container.appendChild(this._fragment);
        }
    }

    class Template {
        constructor(strings) {
            this.strings = strings;
            this.element = this._createElement(strings);
        }

        _createElement(strings) {
            const template = document.createElement('template');
            let html = '';

            for (let i = 0; i < strings.length; i++) {
                html += strings[i];
                if (i < strings.length - 1) {
                    if (this._isAttributePosition(html)) {
                        html += MARKER_PREFIX + i + MARKER_SUFFIX;
                    } else {
                        html += `<!--${MARKER_PREFIX}${i}${MARKER_SUFFIX}-->`;
                    }
                }
            }

            template.innerHTML = html;
            return template;
        }

        _isAttributePosition(html) {
            const lastOpenTag = html.lastIndexOf('<');
            const lastCloseTag = html.lastIndexOf('>');
            return lastOpenTag > lastCloseTag;
        }
    }

    const templateCache = new Map();

    function getTemplate(strings) {
        let template = templateCache.get(strings);
        if (!template) {
            template = new Template(strings);
            templateCache.set(strings, template);
        }
        return template;
    }

    function html(strings, ...values) {
        return new TemplateResult(strings, values);
    }

    /**
     * 不安全的 HTML - 用于插入原始 HTML（如插槽内容）
     */
    class UnsafeHTML {
        constructor(html) {
            this.html = html;
        }
    }

    function unsafeHTML(htmlString) {
        return new UnsafeHTML(htmlString);
    }

    function render(result, container) {
        if (!(result instanceof TemplateResult)) {
            throw new Error('render() 需要 TemplateResult 参数');
        }

        if (!container._templateInstance ||
            container._templateInstance.template.strings !== result.strings) {
            container.innerHTML = '';
            const template = getTemplate(result.strings);
            const instance = new TemplateInstance(template, container);
            container._templateInstance = instance;
            instance.update(result.values);
            instance.mount();
        } else {
            container._templateInstance.update(result.values);
        }
    }

    // ========== 组件系统 ==========

    let currentComponentStates = null;
    let currentStateIndex = 0;
    let currentInstance = null; // 当前组件实例
    let currentRenderingComponent = null; // 当前正在渲染的组件（用于传递给子组件）

    // 生命周期钩子
    const onMountedCallbacks = [];
    const onUnmountedCallbacks = [];

    /**
     * 注册 mounted 生命周期钩子
     */
    function onMounted(callback) {
        if (!currentInstance) {
            throw new Error('onMounted 必须在组件 setup 函数中调用');
        }
        currentInstance._onMountedCallbacks.push(callback);
    }

    /**
     * 注册 unmounted 生命周期钩子
     */
    function onUnmounted(callback) {
        if (!currentInstance) {
            throw new Error('onUnmounted 必须在组件 setup 函数中调用');
        }
        currentInstance._onUnmountedCallbacks.push(callback);
    }

    /**
     * 极简 useState - 一个函数搞定 get/set
     * @param {any} initialValue - 初始值
     * @returns {Function} 状态函数：无参数时返回值，有参数时设置值
     */
    function useState(initialValue) {
        if (!currentComponentStates) {
            throw new Error('useState 必须在组件渲染函数中调用');
        }

        const index = currentStateIndex++;
        const states = currentComponentStates;

        if (!states[index]) {
            const state = reactive({ value: initialValue });

            // 创建一个稳定的函数引用（只创建一次）
            const stateFunc = function (newValue) {
                if (arguments.length === 0) {
                    return state.value;
                } else {
                    state.value = newValue;
                }
            };

            states[index] = { state, func: stateFunc };
        }

        // 返回已缓存的函数引用
        return states[index].func;
    }

    /**
     * 解析函数参数名（用于 props）
     */
    function getFunctionParams(func) {
        const str = func.toString();
        const match = str.match(/\(([^)]*)\)/);
        if (!match) return [];

        const params = match[1];
        let parsed = [];

        // 处理解构参数 {a, b = 'default'}
        if (params.trim().startsWith('{')) {
            const destructMatch = params.match(/\{([^}]+)\}/);
            if (destructMatch) {
                parsed = destructMatch[1]
                    .split(',')
                    .map(p => {
                        const [name] = p.trim().split('=');
                        return name.trim();
                    })
                    .filter(Boolean);
            }
        } else {
            parsed = params.split(',').map(p => p.trim()).filter(Boolean);
        }

        functionParamsCache.set(func, parsed);
        return parsed;
    }

    /**
     * 创建函数式 Web Component
     * @param {string} tagName - 组件标签名（如 'my-button'）
     * @param {Function} setupFn - Setup 函数（只执行一次），返回渲染函数
     * @returns {string} 注册的标签名
     * 
     * 使用示例：
     * createComponent('my-counter', () => {
     *   const count = useState(0);
     *   
     *   onMounted(() => {
     *     console.log('组件挂载了');
     *   });
     *   
     *   onUnmounted(() => {
     *     console.log('组件卸载了');
     *   });
     *   
     *   return () => html`<div>${count()}</div>`;
     * });
     */
    function createComponent(tagName, setupFn) {
        // 解析 setup 函数的参数（支持解构）
        const isDestructured = isDestructuredSetup(setupFn);
        let paramNames = [];
        if (isDestructured) {
            paramNames = functionParamsCache.get(setupFn) || getFunctionParams(setupFn);
        }

        class ReactiveComponent extends HTMLElement {
            constructor() {
                super();
                //   this.attachShadow({ mode: 'open' });
                this._states = [];
                this._mounted = false;
                this._props = {}; // 缓存的 props
                this._jsProps = {}; // 通过 JavaScript 设置的属性
                this._renderFn = null; // 渲染函数
                this._setupCompleted = false; // setup 是否已完成
                this._onMountedCallbacks = [];
                this._onUnmountedCallbacks = [];
                this._slotContent = null; // 用于缓存 Light DOM slot 内容

                // 使用 Object.defineProperty 为每个可能的 prop 创建 setter
                // 这样可以拦截属性设置，实现响应式
                this._setupPropertyInterceptors();
            }

            _setupPropertyInterceptors() {
                // 为参数名称创建响应式属性
                const propsToIntercept = paramNames.length > 0 ? [...paramNames] : [];

                // 始终包含 slot
                if (!propsToIntercept.includes('slot')) {
                    propsToIntercept.push('slot');
                }

                propsToIntercept.forEach(name => {
                    if (name in HTMLElement.prototype) return; // 跳过内置属性

                    Object.defineProperty(this, name, {
                        get() {
                            return this._jsProps[name];
                        },
                        set(value) {
                            const oldValue = this._jsProps[name];
                            this._jsProps[name] = value;

                            // 如果值改变且组件已挂载，触发重新渲染
                            if (oldValue !== value && this._mounted && this._effect) {
                                queueJob(this._effect);
                            }
                        },
                        configurable: true,
                        enumerable: true
                    });
                });
            }

            // 通用的属性设置方法（用于动态属性）
            _setProp(name, value) {
                const oldValue = this._jsProps[name];
                this._jsProps[name] = value;

                // 如果值改变且组件已挂载，触发重新渲染
                if (oldValue !== value && this._mounted && this._effect) {
                    queueJob(this._effect);
                }
            }

            // 监听所有属性
            // static get observedAttributes() {
            //   return paramNames.length > 0 ? paramNames : ['name', 'value', 'data'];
            // }

            // attributeChangedCallback(name, oldValue, newValue) {
            //   if (oldValue !== newValue) {
            //     this._props[name] = newValue;
            //     // 属性变化时重新渲染
            //     if (this._mounted && this._effect) {
            //       this._effect();
            //     }
            //   }
            // }

            connectedCallback() {
                this._mounted = true;

                // 保存 Light DOM 内容（在 connectedCallback 时才有内容）
                if (this._slotContent === null) {
                    this._slotContent = this.innerHTML;
                }

                // 第一次挂载时执行 setup
                if (!this._setupCompleted) {
                    this._runSetup();
                }

                // 设置响应式渲染
                this._setupEffect();

                // 执行 onMounted 回调
                this._onMountedCallbacks.forEach(cb => cb());
            }

            disconnectedCallback() {
                this._mounted = false;

                // 执行 onUnmounted 回调
                this._onUnmountedCallbacks.forEach(cb => cb());
            }

            _runSetup() {
                const prevStates = currentComponentStates;
                const prevIndex = currentStateIndex;
                const prevInstance = currentInstance;

                currentComponentStates = this._states;
                currentStateIndex = 0;
                currentInstance = this;

                try {
                    // 构建 props 对象
                    const props = this._buildProps();

                    // 执行 setup 函数（只执行一次）
                    const result = isDestructured ? setupFn.call(this, props) : setupFn.call(this, props);

                    // setup 应该返回渲染函数
                    if (typeof result === 'function') {
                        this._renderFn = result;
                    } else if (result instanceof TemplateResult) {
                        // 如果直接返回模板，包装成函数（兼容旧写法）
                        this._renderFn = () => result;
                    } else {
                        throw new Error('createComponent 的 setup 函数必须返回渲染函数或 TemplateResult');
                    }

                    this._setupCompleted = true;
                } finally {
                    currentComponentStates = prevStates;
                    currentStateIndex = prevIndex;
                    currentInstance = prevInstance;
                }
            }

            _buildProps() {
                const props = {};

                // 先收集所有通过 JavaScript 设置的属性（来自 _jsProps）
                Object.assign(props, this._jsProps);

                if (paramNames.length > 0) {
                    // 使用解构参数
                    paramNames.forEach(name => {
                        // 特殊处理 slot：跳过从属性读取，直接从 innerHTML 处理
                        if (name === 'slot') {
                            return; // 跳过，后面统一处理
                        }

                        // 如果 _jsProps 中没有，才从 HTML 属性读取
                        if (!(name in props)) {
                            const attrValue = this.getAttribute(name);
                            if (attrValue !== null) {
                                // 检查是否是 prop ID（以 __prop_ 开头）
                                if (attrValue.startsWith('__prop_')) {
                                    // 从元素自身获取 prop 函数
                                    const propFunc = getPropFunction(this, attrValue);
                                    props[name] = propFunc;
                                } else {
                                    // 普通字符串属性 - 包装成函数
                                    const value = attrValue;
                                    props[name] = function () {
                                        if (arguments.length === 0) {
                                            return value;
                                        }
                                    };
                                }
                            }
                        }
                    });
                } else {
                    // 收集所有 HTML 属性
                    Array.from(this.attributes).forEach(attr => {
                        // HTML 属性优先级低于 JavaScript 属性
                        if (!(attr.name in props)) {
                            const attrValue = attr.value;
                            // 检查是否是 prop ID
                            if (attrValue.startsWith('__prop_')) {
                                const propFunc = getPropFunction(this, attrValue);
                                props[attr.name] = propFunc;
                            } else {
                                // 普通字符串属性 - 包装成函数
                                const value = attrValue;
                                props[attr.name] = function () {
                                    if (arguments.length === 0) {
                                        return value;
                                    }
                                };
                            }
                        }
                    });
                }

                // 添加插槽内容（如果还没有从 _jsProps 获取）
                // 使用在 connectedCallback 时保存的 Light DOM 内容
                if (!('slot' in props) || props.slot === null || props.slot === undefined) {
                    const slotContent = this._slotContent || '';
                    
                    // slot 返回 HTML 字符串，不是 UnsafeHTML 对象
                    props.slot = function () {
                        if (arguments.length === 0) {
                            return (slotContent);
                        }
                    };
                }

                return props;
            }

            _setupEffect() {
                // 创建容器
                if (!this._container) {
                    // this._container = document.createElement('div');
                    // this.shadowRoot.appendChild(this._container);
                    this._container = this
                }

                // 包装在 effect 中，这样状态变化时会重新渲染
                this._effect = effect(() => {
                    if (!this._mounted || !this._renderFn) return;

                    const prevStates = currentComponentStates;
                    const prevIndex = currentStateIndex;

                    // 每次重新渲染时，重置索引（关键！）
                    currentComponentStates = this._states;
                    currentStateIndex = 0;

                    try {
                        // 设置当前渲染组件（用于子组件获取父组件信息）
                        const prevRenderingComponent = currentRenderingComponent;
                        currentRenderingComponent = this;

                        // 调用渲染函数获取新模板（不传入 props，因为已经在 setup 时通过闭包捕获）
                        const result = this._renderFn();

                        if (result instanceof TemplateResult) {
                            render(result, this._container);
                        }

                        currentRenderingComponent = prevRenderingComponent;
                    } finally {
                        currentComponentStates = prevStates;
                        currentStateIndex = prevIndex;
                    }
                });
            }
        }

        // 注册组件
        if (!customElements.get(tagName)) {
            customElements.define(tagName, ReactiveComponent);
        }

        return tagName;
    }

    // ========== JSX 支持 ==========

    /**
     * JSX 转换函数（类似 React.createElement）
     * @param {string|Function} type - 标签名或组件函数
     * @param {object} props - 属性对象
     * @param {...any} children - 子元素
     * @returns {TemplateResult} 模板结果
     */
    function h(type, props, ...children) {
        props = props || {};

        // 处理子元素
        const flatChildren = flattenChildren(children);

        // 如果 type 是字符串（原生元素）
        if (typeof type === 'string') {
            return createElementTemplate(type, props, flatChildren);
        }

        // 如果 type 是函数（组件）
        if (typeof type === 'function') {
            // 将 children 添加到 props
            if (flatChildren.length > 0) {
                props.children = flatChildren;
            }
            return type(props);
        }

        throw new Error(`Invalid JSX element type: ${type}`);
    }

    /**
     * 展平子元素数组
     */
    function flattenChildren(children) {
        const result = [];

        function flatten(items) {
            for (let item of items) {
                if (Array.isArray(item)) {
                    flatten(item);
                } else if (item != null && item !== false && item !== true) {
                    result.push(item);
                }
            }
        }

        flatten(children);
        return result;
    }

    /**
     * 创建元素的模板
     */
    function createElementTemplate(tag, props, children) {
        const strings = [];
        const values = [];

        // 开始标签
        let opening = `<${tag}`;

        // 处理属性
        for (let key in props) {
            if (key === 'children') continue;

            const value = props[key];

            if (key === 'className') {
                key = 'class';
            }

            // 事件处理器
            if (key.startsWith('on') && typeof value === 'function') {
                opening += ` ${key}="`;
                strings.push(opening);
                values.push(value);
                opening = `"`;
            }
            // 布尔属性
            else if (typeof value === 'boolean') {
                if (value) {
                    opening += ` ${key}`;
                }
            }
            // 样式对象
            else if (key === 'style' && typeof value === 'object') {
                let styleStr = styleStringCache.get(value);
                if (!styleStr) {
                    styleStr = Object.keys(value)
                        .map(k => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${value[k]}`)
                        .join('; ');
                    styleStringCache.set(value, styleStr);
                }
                opening += ` style="${styleStr}"`;
            }
            // value 属性总是动态的（即使是字符串/数字），以支持响应式更新
            else if (key === 'value' || key === 'checked') {
                opening += ` ${key}="`;
                strings.push(opening);
                values.push(value);
                opening = `"`;
            }
            // 动态值（函数或对象）
            else if (typeof value === 'function' || typeof value === 'object') {
                opening += ` ${key}="`;
                strings.push(opening);
                values.push(value);
                opening = `"`;
            }
            // 普通字符串/数字
            else if (value != null) {
                opening += ` ${key}="${value}"`;
            }
        }

        opening += `>`;

        // 自闭合标签
        if (VOID_ELEMENTS.has(tag)) {
            strings.push(opening.slice(0, -1) + ' />');
            return new TemplateResult(strings, values);
        }

        // 处理子元素
        if (children.length > 0) {
            for (let child of children) {
                if (child instanceof TemplateResult) {
                    // 嵌套模板
                    strings.push(opening);
                    values.push(child);
                    opening = '';
                } else if (typeof child === 'function') {
                    // 动态内容
                    strings.push(opening);
                    values.push(child);
                    opening = '';
                } else {
                    // 静态文本
                    opening += String(child);
                }
            }
        }

        // 结束标签
        opening += `</${tag}>`;
        strings.push(opening);

        return new TemplateResult(strings, values);
    }

    /**
     * JSX Fragment 支持
     */
    function Fragment(props) {
        return html`${props.children}`;
    }

    // ========== 对外暴露的 API ==========

    const API = {
        html,
        render,
        reactive,
        effect,
        useState,
        createComponent,
        unsafeHTML,
        onMounted,
        onUnmounted,
        h,              // JSX 转换函数（仅用于运行时 JSX，编译后的代码不需要）
        Fragment        // Fragment 组件
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = API;
    }
    if (typeof window !== 'undefined') {
        window.htmp = API;
        // 暴露到全局便于直接使用
        //   Object.assign(window, API);

        // 调试用：暴露内部函数
        window.__reactive_debug__ = {
            track, trigger, reactive, effect,
            targetMap, parentMap, reactiveMap
        };
    }
})();
