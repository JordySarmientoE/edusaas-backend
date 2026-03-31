import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { SchoolClass } from '../../classes/entities/class.entity';
import { User } from './user.entity';

@Entity({ name: 'student_class_assignments' })
@Unique(['studentId', 'classId'])
export class StudentClassAssignment extends BaseEntity {
  @Column({ type: 'uuid' })
  schoolId!: string;

  @Column({ type: 'uuid' })
  studentId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student!: User;

  @Column({ type: 'uuid' })
  classId!: string;

  @ManyToOne(() => SchoolClass, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class!: SchoolClass;
}
