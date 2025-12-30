/**
 * 示例：加载和使用图标集
 * 
 * 此脚本演示如何使用 IconSetManager 加载 GD 图标集
 */

import { IconSetManager } from '../packages/api/src/managers/IconSetManager.js';
import { StorageLayer } from '../packages/api/src/storage/StorageLayer.js';
import { SVGParser } from '../packages/api/src/parsers/SVGParser.js';

async function main() {
  // 初始化组件
  const storage = new StorageLayer('./icons');
  const parser = new SVGParser();
  const manager = new IconSetManager(storage, parser);

  console.log('=== GD 图标集示例 ===\n');

  // 加载完整图标集
  console.log('1. 加载完整图标集...');
  const iconSet = await manager.loadIconSet('gd');
  console.log(`   命名空间: ${iconSet.prefix}`);
  console.log(`   图标数量: ${Object.keys(iconSet.icons).length}`);
  console.log(`   图标列表: ${Object.keys(iconSet.icons).join(', ')}\n`);

  // 获取单个图标
  console.log('2. 获取单个图标...');
  const logoIcon = await manager.getIcon('gd', 'logo');
  if (logoIcon) {
    console.log('   logo 图标:');
    console.log(`   - 宽度: ${logoIcon.width}`);
    console.log(`   - 高度: ${logoIcon.height}`);
    console.log(`   - 路径: ${logoIcon.body.substring(0, 50)}...\n`);
  }

  // 获取所有图标
  console.log('3. 获取所有图标详情...');
  const allIcons = await manager.getAllIcons('gd');
  for (const [name, icon] of Object.entries(allIcons.icons)) {
    console.log(`   ${name}: ${icon.width}x${icon.height}`);
  }

  console.log('\n=== 完成 ===');
}

main().catch(console.error);
