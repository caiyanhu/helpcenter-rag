import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  title: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Message, message => message.session, { cascade: true })
  messages: Message[];
}

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  role: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'simple-json', nullable: true })
  sources: Source[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column(() => Session)
  sessionId: string;

  @ManyToOne(() => Session, session => session.messages)
  session: Session;
}

export interface Source {
  articleId: number;
  title: string;
  categoryPath: string;
  excerpt: string;
}
