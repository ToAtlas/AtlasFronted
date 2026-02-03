import type { MockMethod } from 'vite-plugin-mock';

/**
 * 配置 Mock API
 */
const configMock: MockMethod[] = [
  // 全局配置接口 - 返回品牌等通用信息
  {
    url: '/v1/config',
    method: 'get',
    response: () => ({
      code: 200,
      message: '获取配置成功',
      data: {
        // 品牌配置 - 全局使用
        brand: {
          name: 'Atlas',
          logo: '/src/assets/logo.svg'
        },
        // 缓存配置 - 可选，不设置则使用默认12小时
        cache: {
          duration: 12 * 60 * 60 * 1000  // 12小时（毫秒）
          // duration: 1 * 60 * 60 * 1000  // 示例：1小时
          // duration: 24 * 60 * 60 * 1000  // 示例：24小时
        }
      }
    })
  },
];

export default configMock;
