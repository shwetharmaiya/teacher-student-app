import { relations } from "drizzle-orm/relations";
import { users, classes, classEnrollments, assignments, attendanceRecords, teacherSubjectAssignments, subjects } from "./schema";

export const classesRelations = relations(classes, ({one, many}) => ({
	user: one(users, {
		fields: [classes.teacherId],
		references: [users.id]
	}),
	classEnrollments: many(classEnrollments),
	assignments: many(assignments),
	attendanceRecords: many(attendanceRecords),
	teacherSubjectAssignments: many(teacherSubjectAssignments),
}));

export const usersRelations = relations(users, ({many}) => ({
	classes: many(classes),
	classEnrollments: many(classEnrollments),
	assignments: many(assignments),
	attendanceRecords: many(attendanceRecords),
	teacherSubjectAssignments: many(teacherSubjectAssignments),
}));

export const classEnrollmentsRelations = relations(classEnrollments, ({one}) => ({
	class: one(classes, {
		fields: [classEnrollments.classId],
		references: [classes.id]
	}),
	user: one(users, {
		fields: [classEnrollments.studentId],
		references: [users.id]
	}),
}));

export const assignmentsRelations = relations(assignments, ({one}) => ({
	class: one(classes, {
		fields: [assignments.classId],
		references: [classes.id]
	}),
	user: one(users, {
		fields: [assignments.teacherId],
		references: [users.id]
	}),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({one}) => ({
	class: one(classes, {
		fields: [attendanceRecords.classId],
		references: [classes.id]
	}),
	user: one(users, {
		fields: [attendanceRecords.studentId],
		references: [users.id]
	}),
}));

export const teacherSubjectAssignmentsRelations = relations(teacherSubjectAssignments, ({one}) => ({
	user: one(users, {
		fields: [teacherSubjectAssignments.teacherId],
		references: [users.id]
	}),
	class: one(classes, {
		fields: [teacherSubjectAssignments.classId],
		references: [classes.id]
	}),
	subject: one(subjects, {
		fields: [teacherSubjectAssignments.subjectId],
		references: [subjects.id]
	}),
}));

export const subjectsRelations = relations(subjects, ({many}) => ({
	teacherSubjectAssignments: many(teacherSubjectAssignments),
}));