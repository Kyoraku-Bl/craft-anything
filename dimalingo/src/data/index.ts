import { Course, CourseId } from '../types';
import { enCourse } from './enCourse';
import { frCourse } from './frCourse';
import { esCourse } from './esCourse';
import { darijaCourse } from './darijaCourse';

export const COURSES: Course[] = [enCourse, frCourse, esCourse, darijaCourse];

export const COURSE_MAP: Record<CourseId, Course> = {
  en: enCourse,
  fr: frCourse,
  es: esCourse,
  darija: darijaCourse,
};
