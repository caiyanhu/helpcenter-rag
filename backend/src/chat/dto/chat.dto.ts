import { IsString, IsOptional, IsArray } from 'class-validator'

export class ChatRequestDto {
  @IsString()
  sessionId: string

  @IsString()
  message: string
}

export class ChatResponseChunk {
  type: 'token' | 'done' | 'error'
  content?: string
  sources?: Array<{
    articleId: number
    title: string
    categoryPath: string
    excerpt: string
  }>
  error?: string
}
