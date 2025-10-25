class UserCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // 定义要观察的属性
  static get observedAttributes() {
    return ['name', 'avatar', 'title', 'active'];
  }

  // 组件挂载时调用
  connectedCallback() {
    this.render();
    console.log('组件已挂载到 DOM');
  }

  // 属性变化时调用
  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`属性 ${name} 变化: ${oldValue} -> ${newValue}`);
    
    // 根据不同的属性执行不同的操作
    switch(name) {
      case 'name':
        this.updateName(newValue);
        break;
      case 'avatar':
        this.updateAvatar(newValue);
        break;
      case 'title':
        this.updateTitle(newValue);
        break;
      case 'active':
        this.toggleActive(newValue === 'true');
        break;
    }
    
    this.render();
  }

  // 更新名称
  updateName(name) {
    console.log('更新名称:', name);
  }

  // 更新头像
  updateAvatar(avatar) {
    console.log('更新头像:', avatar);
  }

  // 更新标题
  updateTitle(title) {
    console.log('更新标题:', title);
  }

  // 切换激活状态
  toggleActive(isActive) {
    console.log('激活状态:', isActive);
  }

  render() {
    const name = this.getAttribute('name') || 'Unknown';
    const avatar = this.getAttribute('avatar') || '';
    const title = this.getAttribute('title') || 'User';
    const isActive = this.getAttribute('active') === 'true';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          max-width: 300px;
          transition: all 0.3s ease;
        }
        
        :host([active="true"]) {
          border-color: #007bff;
          box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
        }
        
        .card {
          text-align: center;
        }
        
        img {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          margin-bottom: 10px;
          object-fit: cover;
        }
        
        h2 {
          margin: 10px 0 5px;
          color: ${isActive ? '#007bff' : '#333'};
        }
        
        p {
          color: #666;
          margin: 0;
        }
        
        .status {
          margin-top: 10px;
          padding: 4px 8px;
          background: ${isActive ? '#28a745' : '#dc3545'};
          color: white;
          border-radius: 4px;
          font-size: 12px;
        }
      </style>
      
      <div class="card">
        ${avatar ? `<img src="${avatar}" alt="${name}">` : 
          '<div style="width:80px;height:80px;background:#ddd;border-radius:50%;margin:0 auto 10px;"></div>'}
        <h2>${name}</h2>
        <p>${title}</p>
        <div class="status">
          ${isActive ? '在线' : '离线'}
        </div>
      </div>
    `;
  }
}

// 注册自定义元素
customElements.define('user-card', UserCard);

// 创建测试函数来演示属性变化
function testAttributes() {
  const card = document.createElement('user-card');
  
  // 初始设置
  card.setAttribute('name', '张三');
  card.setAttribute('title', '前端工程师');
  
  // 添加到页面进行测试
  document.body.appendChild(card);
  
  // 模拟属性变化
  setTimeout(() => {
    card.setAttribute('avatar', 'https://via.placeholder.com/80');
  }, 1000);
  
  setTimeout(() => {
    card.setAttribute('active', 'true');
  }, 2000);
  
  setTimeout(() => {
    card.setAttribute('name', '李四');
  }, 3000);
  
  setTimeout(() => {
    card.setAttribute('active', 'false');
  }, 4000);
}

// 页面加载后执行测试
document.addEventListener('DOMContentLoaded', testAttributes);
