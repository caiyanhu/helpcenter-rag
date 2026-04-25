import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({
    origin: true,
    credentials: true,
  })

  const config = new DocumentBuilder()
    .setTitle('HelpCenter RAG API')
    .setDescription('基于 RAG 的帮助中心问答系统 API 文档')
    .setVersion('1.0')
    .addTag('chat', '对话接口')
    .addTag('session', '会话管理')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(3000)
  console.log('Backend running on http://localhost:3000')
  console.log('API Docs: http://localhost:3000/api/docs')
}

bootstrap()
