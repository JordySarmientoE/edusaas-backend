import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from './user.entity';

@Entity({ name: 'parent_student_links' })
@Unique(['parentId', 'studentId'])
export class ParentStudentLink extends BaseEntity {
  @Column({ type: 'uuid' })
  schoolId!: string;

  @Column({ type: 'uuid' })
  parentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent!: User;

  @Column({ type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: User;
}
