import { Inject, Injectable } from '@nestjs/common'
import { LLM_ADAPTER_TOKEN, LLMAdapter } from './llm.interface.js'
import { ConfigService } from '../config/config.service.js'

@Injectable()
export class QueryRewriter {
  private static readonly SYNONYM_RULES: Array<{ pattern: RegExp; expansions: string[] }> = [
    { pattern: /创建|订购|购买|开通|新建|申请/g, expansions: ['创建', '订购', '购买', '开通', '申请'] },
    { pattern: /删除|退订|释放|销毁/g, expansions: ['删除', '退订', '释放', '销毁'] },
    { pattern: /查看|查询|获取/g, expansions: ['查看', '查询', '获取'] },
    { pattern: /扩容|升级|变配|升配/g, expansions: ['扩容', '升级', '变配'] },
    { pattern: /重启|重开|恢复/g, expansions: ['重启', '恢复'] },
    { pattern: /修改|更新|变更|调整/g, expansions: ['修改', '更新', '变更', '调整'] },
    { pattern: /续费|延期|续期|续订/g, expansions: ['续费', '延期', '续期', '续订'] },
    { pattern: /故障|异常|报错|错误|失败/g, expansions: ['故障', '异常', '报错', '错误', '失败'] },
    { pattern: /配置|设置|设定/g, expansions: ['配置', '设置', '设定'] },
    { pattern: /白名单|访问控制|IP名单/g, expansions: ['白名单', '访问控制', 'IP名单'] },
    { pattern: /连接|访问|接入|登录/g, expansions: ['连接', '访问', '接入', '登录'] },
  ]

  private static readonly PRODUCT_ALIASES: Array<{ pattern: RegExp; replacement: string }> = [
    // 海山/海神 PG 系列
    { pattern: /海山\s*PG/gi, replacement: '云原生数据库 PostgreSQL 版' },
    { pattern: /海山PG/gi, replacement: '云原生数据库 PostgreSQL 版' },
    { pattern: /海神\s*PG/gi, replacement: '云原生数据库 PostgreSQL 版' },
    { pattern: /海神PG/gi, replacement: '云原生数据库 PostgreSQL 版' },
    { pattern: /海山\s*分布式/g, replacement: '云原生数据库 海山 分布式版' },
    { pattern: /分布式版/g, replacement: '云原生数据库 海山 分布式版' },
    // 修复 PG 误匹配：使用更精确的正则，只匹配独立单词
    { pattern: /\b(pg|PG)\b/g, replacement: 'PostgreSQL' },
    // 云服务器/ECS
    { pattern: /云主机|ECS/gi, replacement: '云服务器' },
    // 对象存储
    { pattern: /云存储|OSS/gi, replacement: '对象存储' },
    // 负载均衡
    { pattern: /负载均衡|SLB/gi, replacement: '应用负载均衡' },
    // 云数据库 MySQL
    { pattern: /云数据库\s*MySQL|云数据库MySQL/gi, replacement: '云原生数据库 MySQL 版' },
    // Redis/缓存
    { pattern: /Redis|缓存/gi, replacement: '云缓存 Redis' },
    // MongoDB
    { pattern: /MongoDB/gi, replacement: '云原生数据库 MongoDB 版' },
    // 域名/DNS
    { pattern: /域名|DNS/gi, replacement: '云解析' },
    // CDN/加速
    { pattern: /CDN|加速/gi, replacement: '内容分发网络' },
    // 安全组/防火墙
    { pattern: /安全组|防火墙/gi, replacement: '访问控制' },
    // VPC/专有网络
    { pattern: /VPC|专有网络/gi, replacement: '虚拟私有云' },
  ]

  constructor(
    @Inject(LLM_ADAPTER_TOKEN) private llm: LLMAdapter,
    private config: ConfigService
  ) {}

  async rewrite(query: string): Promise<string[]> {
    if (!this.config.queryRewrite.enabled) {
      return [query]
    }

    const preprocessed = this.applyRules(query)
    
    if (preprocessed !== query) {
      console.log(`Query rule-expanded: "${query}" -> "${preprocessed}"`)
    }

    const prompt = `你是一位专业的技术文档搜索优化专家。请将用户查询改写为多个适合检索的查询变体。

关键任务：
1. 动词同义词扩展：将"创建/订购/购买/开通"等视为同义词，生成不同变体
2. 产品名称标准化：确保使用官方产品名称
3. 生成 2-3 个查询变体，每个使用不同的关键词组合

同义词对照表：
- 创建 = 订购 = 购买 = 开通 = 申请 = 新建
- 删除 = 退订 = 释放 = 销毁
- 查看 = 查询 = 获取
- 扩容 = 升级 = 变配 = 升配
- 重启 = 重开 = 恢复
- 修改 = 更新 = 变更 = 调整
- 续费 = 延期 = 续期 = 续订
- 故障 = 异常 = 报错 = 错误 = 失败
- 配置 = 设置 = 设定
- 白名单 = 访问控制 = IP名单
- 连接 = 访问 = 接入 = 登录

产品名称标准化：
- 云主机/ECS → 云服务器
- 云存储/OSS → 对象存储
- 负载均衡/SLB → 应用负载均衡
- 云数据库 MySQL → 云原生数据库 MySQL 版
- Redis/缓存 → 云缓存 Redis
- MongoDB → 云原生数据库 MongoDB 版
- 域名/DNS → 云解析
- CDN/加速 → 内容分发网络
- 安全组/防火墙 → 访问控制
- VPC/专有网络 → 虚拟私有云

改写示例：
输入：如何创建海山 PG
输出：
如何订购 云原生数据库 PostgreSQL 版
如何开通 云原生数据库 PostgreSQL 版
PostgreSQL 实例购买流程

输入：海神 PG 怎么删
输出：
如何删除 云原生数据库 PostgreSQL 版
如何退订 云原生数据库 PostgreSQL 版
PostgreSQL 实例释放方法

输入：怎么看 PG 日志
输出：
如何查看 云原生数据库 PostgreSQL 版 日志
PostgreSQL 日志查询方法
PostgreSQL 日志获取

输入：海山分布式怎么重启
输出：
如何重启 云原生数据库 海山 分布式版
分布式版实例重启方法
海山分布式版 重启操作

输入：ECS怎么续费
输出：
云服务器续费方法
云服务器延期流程
如何续订 云服务器

输入：OSS连接失败怎么办
输出：
对象存储 连接 故障排查
对象存储 访问 异常处理
云存储 登录 报错解决方法

重要：
- 每行输出一个查询变体
- 不要输出编号、解释或前缀
- 只输出查询本身
- 最多输出 3 个变体
- 保持原始查询的动词意图：操作指南类查询（如"创建账号"）保留"创建"，不要强制替换为"订购/购买"

用户查询：${preprocessed}
输出：`

    try {
      const result = await this.llm.complete(prompt)
      const lines = result
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.match(/^\d+[:\.\)]/))
        .slice(0, 3)

      if (lines.length > 0 && !lines.every(line => line === preprocessed)) {
        console.log(`Query LLM-rewritten: "${query}" -> ["${lines.join('", "')}"]`)
        return lines.length > 0 ? lines : [query]
      }

      return [query]
    } catch (error) {
      console.warn('Query rewrite failed, using rule-based:', error)
      return this.generateFallbackQueries(preprocessed)
    }
  }

  private applyRules(query: string): string {
    let result = query
    
    for (const { pattern, replacement } of QueryRewriter.PRODUCT_ALIASES) {
      result = result.replace(pattern, replacement)
    }
    
    return result
  }

  private generateFallbackQueries(query: string): string[] {
    const queries: string[] = []
    
    for (const { pattern, expansions } of QueryRewriter.SYNONYM_RULES) {
      if (pattern.test(query)) {
        expansions.forEach(exp => {
          queries.push(query.replace(pattern, exp))
        })
        break
      }
    }
    
    return queries.length > 0 ? queries.slice(0, 3) : [query]
  }
}
