/**
 * Babel 插件：将 JSX 直接转换为 html`` 模板字符串
 * 
 * 转换前：
 * <div class="test">{value}</div>
 * 
 * 转换后：
 * () => html`<div class="test">${value}</div>`
 */

function jsxToHtmlPlugin({ types: t }) {
  return {
    name: 'jsx-to-html',
    visitor: {
      JSXElement(path) {
        const templateResult = jsxToTemplate(path.node, t);
        path.replaceWith(templateResult);
      },
      
      JSXFragment(path) {
        // Fragment 直接转换为其子元素
        const children = path.node.children.map(child => 
          jsxChildToTemplate(child, t)
        ).filter(Boolean);
        
        if (children.length === 0) {
          path.replaceWith(t.stringLiteral(''));
        } else if (children.length === 1) {
          path.replaceWith(children[0]);
        } else {
          // 多个子元素，包装在数组中
          path.replaceWith(t.arrayExpression(children));
        }
      }
    }
  };
}

/**
 * 将 JSX 元素转换为 html`` 模板
 * 所有标签（包括首字母大写的）都转换为HTML，作为webcomponent处理
 */
function jsxToTemplate(node, t) {
  // 使用内联模板函数获取 parts 和 expressions
  const { parts, expressions } = jsxToInlineTemplate(node, t);
  
  // 直接返回 html`` 模板字面量，不包装箭头函数
  return createTemplateExpression(parts, expressions, t);
}

/**
 * 创建模板字面量表达式
 */
function createTemplateExpression(parts, expressions, t) {
  const quasis = parts.map((str, i) => 
    t.templateElement({ raw: str, cooked: str }, i === parts.length - 1)
  );
  
  return t.taggedTemplateExpression(
    t.identifier('html'),
    t.templateLiteral(quasis, expressions)
  );
}

/**
 * 将 JSX 元素转换为内联模板（返回 parts 和 expressions）
 */
function jsxToInlineTemplate(node, t) {
  const { openingElement, children } = node;
  const tagName = getTagName(openingElement.name);
  
  const parts = [];
  const expressions = [];
  let currentString = `<${tagName}`;
  
  // 处理属性
  for (let attr of openingElement.attributes) {
    if (t.isJSXAttribute(attr)) {
      const attrName = attr.name.name;
      const attrValue = attr.value;
      const htmlAttrName = attrName === 'className' ? 'class' : attrName;
      
      if (!attrValue) {
        currentString += ` ${htmlAttrName}`;
      } else if (t.isStringLiteral(attrValue)) {
        currentString += ` ${htmlAttrName}="${attrValue.value}"`;
      } else if (t.isJSXExpressionContainer(attrValue)) {
        const expr = attrValue.expression;
        
        // 处理样式对象
        if (htmlAttrName === 'style' && t.isObjectExpression(expr)) {
          const styleStr = objectToStyleString(expr, t);
          if (styleStr) {
            // 静态样式对象，直接转换为字符串
            currentString += ` style="${styleStr}"`;
            continue;
          }
          // 动态样式对象，生成转换代码
          currentString += ` style="`;
          parts.push(currentString);
          expressions.push(createStyleObjectToStringCall(expr, t));
          currentString = '"';
          continue;
        }
        
        currentString += ` ${htmlAttrName}="`;
        parts.push(currentString);
        expressions.push(expr);
        currentString = '"';
      }
    }
  }
  
  currentString += '>';
  
  // 检查自闭合标签
  const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                        'link', 'meta', 'param', 'source', 'track', 'wbr'];
  
  if (voidElements.includes(tagName)) {
    currentString = currentString.slice(0, -1) + ' />';
    parts.push(currentString);
    return { parts, expressions };
  }
  
  // 处理子元素
  for (let child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ');
      if (text.trim()) {
        currentString += text;
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        parts.push(currentString);
        expressions.push(child.expression);
        currentString = '';
      }
    } else if (t.isJSXElement(child)) {
      // 所有子元素都递归处理为HTML（包括首字母大写的webcomponent）
      const childTemplate = jsxToInlineTemplate(child, t);
      currentString += childTemplate.parts[0];
      for (let i = 0; i < childTemplate.expressions.length; i++) {
        parts.push(currentString);
        expressions.push(childTemplate.expressions[i]);
        currentString = childTemplate.parts[i + 1];
      }
      if (childTemplate.expressions.length === 0 && childTemplate.parts.length > 1) {
        currentString += childTemplate.parts.slice(1).join('');
      }
    }
  }
  
  currentString += `</${tagName}>`;
  parts.push(currentString);
  
  return { parts, expressions };
}

/**
 * 将 JSX 元素转换为模板表达式（不包装箭头函数）
 */
function jsxToTemplateExpression(node, t) {
  const { openingElement, children } = node;
  const tagName = getTagName(openingElement.name);
  
  const parts = [];
  const expressions = [];
  let currentString = `<${tagName}`;
  
  // 处理属性（简化版本）
  for (let attr of openingElement.attributes) {
    if (t.isJSXAttribute(attr)) {
      const attrName = attr.name.name;
      const attrValue = attr.value;
      const htmlAttrName = attrName === 'className' ? 'class' : attrName;
      
      if (!attrValue) {
        currentString += ` ${htmlAttrName}`;
      } else if (t.isStringLiteral(attrValue)) {
        currentString += ` ${htmlAttrName}="${attrValue.value}"`;
      } else if (t.isJSXExpressionContainer(attrValue)) {
        currentString += ` ${htmlAttrName}="`;
        parts.push(currentString);
        expressions.push(attrValue.expression);
        currentString = '"';
      }
    }
  }
  
  currentString += '>';
  
  // 处理子元素
  for (let child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.replace(/\s+/g, ' ');
      if (text.trim()) {
        currentString += text;
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (!t.isJSXEmptyExpression(child.expression)) {
        parts.push(currentString);
        expressions.push(child.expression);
        currentString = '';
      }
    } else if (t.isJSXElement(child)) {
      parts.push(currentString);
      expressions.push(
        t.callExpression(
          t.arrowFunctionExpression([], jsxToTemplateExpression(child, t)),
          []
        )
      );
      currentString = '';
    }
  }
  
  currentString += `</${tagName}>`;
  parts.push(currentString);
  
  return createTemplateExpression(parts, expressions, t);
}

/**
 * 将 JSX Fragment 转换为表达式
 */
function jsxFragmentToExpression(node, t) {
  const children = node.children
    .map(child => jsxChildToTemplate(child, t))
    .filter(Boolean);
  
  if (children.length === 0) {
    return t.stringLiteral('');
  }
  if (children.length === 1) {
    return children[0];
  }
  return t.arrayExpression(children);
}

/**
 * 将 JSX 子节点转换为模板
 */
function jsxChildToTemplate(child, t) {
  if (t.isJSXText(child)) {
    const text = child.value.replace(/\s+/g, ' ').trim();
    return text ? t.stringLiteral(text) : null;
  }
  if (t.isJSXExpressionContainer(child)) {
    return t.isJSXEmptyExpression(child.expression) ? null : child.expression;
  }
  if (t.isJSXElement(child)) {
    return jsxToTemplate(child, t);
  }
  if (t.isJSXFragment(child)) {
    return jsxFragmentToExpression(child, t);
  }
  return null;
}

/**
 * 创建组件直接调用（不使用 h()）
 */
function createComponentCall(node, t) {
  const { openingElement, children } = node;
  const tagName = openingElement.name;
  
  // 组件名
  let componentId;
  if (t.isJSXIdentifier(tagName)) {
    componentId = t.identifier(tagName.name);
  } else if (t.isJSXMemberExpression(tagName)) {
    componentId = jsxMemberExpressionToMemberExpression(tagName, t);
  }
  
  // 构建 props 对象
  const props = [];
  for (let attr of openingElement.attributes) {
    if (t.isJSXAttribute(attr)) {
      const key = t.identifier(attr.name.name);
      let value;
      if (!attr.value) {
        value = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attr.value)) {
        value = attr.value;
      } else if (t.isJSXExpressionContainer(attr.value)) {
        value = attr.value.expression;
      }
      props.push(t.objectProperty(key, value));
    } else if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
    }
  }
  
  // 处理子元素
  const childElements = children
    .map(child => jsxChildToTemplate(child, t))
    .filter(Boolean);
  
  // 如果有子元素，添加到 props.children
  if (childElements.length > 0) {
    if (childElements.length === 1) {
      props.push(t.objectProperty(t.identifier('children'), childElements[0]));
    } else {
      props.push(t.objectProperty(t.identifier('children'), t.arrayExpression(childElements)));
    }
  }
  
  const propsObj = props.length > 0 ? t.objectExpression(props) : t.objectExpression([]);
  
  // 调用组件函数并立即执行返回的模板函数：MyComponent(props)()
  const componentCall = t.callExpression(componentId, [propsObj]);
  return t.callExpression(componentCall, []); // 立即执行
}

/**
 * 创建 h() 函数调用（用于组件）- 保留作为备用
 */
function createHCall(node, t) {
  const { openingElement, children } = node;
  const tagName = openingElement.name;
  
  // 标签名
  let tag;
  if (t.isJSXIdentifier(tagName)) {
    tag = t.identifier(tagName.name);
  } else if (t.isJSXMemberExpression(tagName)) {
    tag = jsxMemberExpressionToMemberExpression(tagName, t);
  }
  
  // 属性对象
  const props = [];
  for (let attr of openingElement.attributes) {
    if (t.isJSXAttribute(attr)) {
      const key = t.identifier(attr.name.name);
      let value;
      if (!attr.value) {
        value = t.booleanLiteral(true);
      } else if (t.isStringLiteral(attr.value)) {
        value = attr.value;
      } else if (t.isJSXExpressionContainer(attr.value)) {
        value = attr.value.expression;
      }
      props.push(t.objectProperty(key, value));
    } else if (t.isJSXSpreadAttribute(attr)) {
      props.push(t.spreadElement(attr.argument));
    }
  }
  
  const propsObj = props.length > 0 ? t.objectExpression(props) : t.nullLiteral();
  
  // 子元素
  const childrenArgs = children
    .map(child => jsxChildToTemplate(child, t))
    .filter(Boolean);
  
  return t.callExpression(
    t.identifier('h'),
    [tag, propsObj, ...childrenArgs]
  );
}

/**
 * 获取标签名（首字母大写保持原样作为webcomponent）
 */
function getTagName(name) {
  if (name.type === 'JSXIdentifier') {
    return name.name;
  }
  if (name.type === 'JSXMemberExpression') {
    return getTagName(name.object) + '.' + getTagName(name.property);
  }
  return '';
}

/**
 * JSXMemberExpression 转 MemberExpression
 */
function jsxMemberExpressionToMemberExpression(node, t) {
  if (t.isJSXIdentifier(node.object)) {
    return t.memberExpression(
      t.identifier(node.object.name),
      t.identifier(node.property.name)
    );
  }
  return t.memberExpression(
    jsxMemberExpressionToMemberExpression(node.object, t),
    t.identifier(node.property.name)
  );
}

/**
 * 将对象表达式转换为样式字符串
 * 只处理静态对象，动态对象返回 null
 */
function objectToStyleString(node, t) {
  if (!t.isObjectExpression(node)) return null;
  
  const parts = [];
  for (let prop of node.properties) {
    if (t.isObjectProperty(prop) && t.isIdentifier(prop.key) && 
        (t.isStringLiteral(prop.value) || t.isNumericLiteral(prop.value))) {
      const key = prop.key.name.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
      const value = t.isStringLiteral(prop.value) ? prop.value.value : prop.value.value;
      parts.push(`${key}: ${value}`);
    } else {
      // 有动态属性，无法静态化
      return null;
    }
  }
  
  return parts.join('; ');
}

/**
 * 创建将style对象转换为CSS字符串的代码
 * 生成：Object.entries(obj).map(([k,v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join('; ')
 */
function createStyleObjectToStringCall(styleObj, t) {
  // Object.entries(styleObj)
  const entries = t.callExpression(
    t.memberExpression(t.identifier('Object'), t.identifier('entries')),
    [styleObj]
  );
  
  // ([k, v]) => ...
  const mapCallback = t.arrowFunctionExpression(
    [t.arrayPattern([t.identifier('k'), t.identifier('v')])],
    t.templateLiteral(
      [
        t.templateElement({ raw: '', cooked: '' }, false),
        t.templateElement({ raw: ': ', cooked: ': ' }, false),
        t.templateElement({ raw: '', cooked: '' }, true)
      ],
      [
        // k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
        t.callExpression(
          t.memberExpression(t.identifier('k'), t.identifier('replace')),
          [
            t.regExpLiteral('[A-Z]', 'g'),
            t.arrowFunctionExpression(
              [t.identifier('m')],
              t.binaryExpression(
                '+',
                t.stringLiteral('-'),
                t.callExpression(
                  t.memberExpression(t.identifier('m'), t.identifier('toLowerCase')),
                  []
                )
              )
            )
          ]
        ),
        t.identifier('v')
      ]
    )
  );
  
  // .map(callback).join('; ')
  return t.callExpression(
    t.memberExpression(
      t.callExpression(
        t.memberExpression(entries, t.identifier('map')),
        [mapCallback]
      ),
      t.identifier('join')
    ),
    [t.stringLiteral('; ')]
  );
}
