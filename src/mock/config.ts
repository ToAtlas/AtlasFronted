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
        }
      }
    })
  },
];

export default configMock;
