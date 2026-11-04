import { Course, CourseId } from '../types';
import { enCourse } from './enCourse';
import { frCourse } from './frCourse';
import { esCourse } from './esCourse';
import { fushaCourse } from './fushaCourse';
import { darijaCourse } from './darijaCourse';

export const COURSES: Course[] = [fushaCourse, enCourse, frCourse, esCourse, darijaCourse];

export const COURSE_MAP: Record<CourseId, Course> = {
  fusha: fushaCourse,
  en: enCourse,
  fr: frCourse,
  es: esCourse,
  darija: darijaCourse,
};
