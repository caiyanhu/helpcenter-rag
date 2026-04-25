import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class ChatRequestDto {
  @ApiProperty({ description: '会话 ID' })
  @IsString()
  sessionId: string

  @ApiProperty({ description: '用户消息内容' })
  @IsString()
  message: string
}

export class ChatResponseChunk {
  @ApiProperty({ enum: ['token', 'done', 'error'] })
  type: 'token' | 'done' | 'error'

  @ApiProperty({ description: '内容片段', required: false })
  content?: string

  @ApiProperty({ description: '引用来源', required: false, isArray: true })
  sources?: Array<{
    articleId: number
    title: string
    categoryPath: string
    excerpt: string
  }>

  @ApiProperty({ description: '错误信息', required: false })
  error?: string
}
