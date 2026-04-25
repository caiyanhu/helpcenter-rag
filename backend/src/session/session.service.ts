import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Session, Message, Source } from './session.entity.js'

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>
  ) {}

  async createSession(): Promise<Session> {
    const session = this.sessionRepo.create({})
    return this.sessionRepo.save(session)
  }

  async getSessions(): Promise<Session[]> {
    return this.sessionRepo.find({
      order: { createdAt: 'DESC' },
    })
  }

  async getSession(id: string): Promise<Session | null> {
    return this.sessionRepo.findOne({
      where: { id },
      relations: ['messages'],
    })
  }

  async deleteSession(id: string): Promise<void> {
    await this.messageRepo.delete({ sessionId: id })
    await this.sessionRepo.delete(id)
  }

  async addMessage(
    sessionId: string,
    role: string,
    content: string,
    sources?: Source[] | null
  ): Promise<Message> {
    const message = this.messageRepo.create({
      sessionId,
      role,
      content,
      sources: sources || null,
    })
    return this.messageRepo.save(message)
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    })
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.sessionRepo.update(sessionId, { title })
  }
}
