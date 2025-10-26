#!/usr/bin/env node

/**
 * Babel + esbuild 构建脚本
 * 使用: node build.mjs
 * 
 * 流程：
 * 1. 使用 Babel 将 JSX 转换为 html`` 模板
 * 2. 使用 esbuild 进行最终打包
 */

import { transformAsync } from '@babel/core';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

console.log('🚀 开始构建 JSX...\n');

try {
  // 读取源文件
  const sourceCode = readFileSync('example.jsx', 'utf8');
  
  // 使用 Babel 转换
  console.log('📝 使用 Babel 转换 JSX...');
  const result = await transformAsync(sourceCode, {
    filename: 'example.jsx',
    configFile: './babel.config.json'
  });
  
  if (!result || !result.code) {
    throw new Error('Babel 转换失败');
  }
  
  // 确保输出目录存在
  mkdirSync('dist', { recursive: true });
  
  // 写入转换后的代码
  const outputPath = 'dist/example.compiled.js';
  writeFileSync(outputPath, result.code, 'utf8');
  
  console.log('\n✅ 构建完成！');
  console.log('📁 输出文件:', outputPath);
  console.log('\n💡 转换说明:');
  console.log('   - JSX 元素 → () => html`<tag>${expr}</tag>`');
  console.log('   - 组件调用 → Component(props)() (立即执行，返回 html``)');
  console.log('   - 结果：模板中全是纯 HTML 内容');
  
} catch (error) {
  console.error('❌ 构建失败:', error);
  process.exit(1);
}

