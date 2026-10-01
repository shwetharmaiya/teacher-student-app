import { pgTable, unique, uuid, varchar, timestamp, uniqueIndex, foreignKey, integer, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const attendanceStatus = pgEnum("attendance_status", ['PRESENT', 'ABSENT', 'LATE'])
export const userRole = pgEnum("user_role", ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'])


export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	role: userRole().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const classes = pgTable("classes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	grade: varchar({ length: 64 }).notNull(),
	section: varchar({ length: 3 }).notNull(),
	teacherName: varchar("teacher_name", { length: 120 }),
	room: varchar({ length: 32 }).notNull(),
	capacity: integer().notNull(),
	studentCount: integer("student_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	teacherId: uuid("teacher_id"),
}, (table) => [
	uniqueIndex("classes_grade_section_unique").using("btree", table.grade.asc().nullsLast().op("text_ops"), table.section.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [users.id],
			name: "classes_teacher_id_users_id_fk"
		}).onDelete("set null"),
]);

export const classEnrollments = pgTable("class_enrollments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	classId: uuid("class_id").notNull(),
	studentId: uuid("student_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("class_enrollments_class_student_unique").using("btree", table.classId.asc().nullsLast().op("uuid_ops"), table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "class_enrollments_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [users.id],
			name: "class_enrollments_student_id_fkey"
		}).onDelete("cascade"),
]);

export const assignments = pgTable("assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	classId: uuid("class_id").notNull(),
	teacherId: uuid("teacher_id").notNull(),
	title: varchar({ length: 160 }).notNull(),
	description: varchar({ length: 1000 }),
	dueAt: timestamp("due_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "assignments_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [users.id],
			name: "assignments_teacher_id_fkey"
		}).onDelete("cascade"),
]);

export const attendanceRecords = pgTable("attendance_records", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	classId: uuid("class_id").notNull(),
	studentId: uuid("student_id").notNull(),
	attendanceDate: varchar("attendance_date", { length: 10 }).notNull(),
	status: attendanceStatus().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("attendance_records_class_student_date_unique").using("btree", table.classId.asc().nullsLast().op("uuid_ops"), table.studentId.asc().nullsLast().op("text_ops"), table.attendanceDate.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "attendance_records_class_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [users.id],
			name: "attendance_records_student_id_fkey"
		}).onDelete("cascade"),
]);

export const teacherSubjectAssignments = pgTable("teacher_subject_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teacherId: uuid("teacher_id").notNull(),
	classId: uuid("class_id").notNull(),
	subjectId: uuid("subject_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("teacher_class_subject_unique").using("btree", table.teacherId.asc().nullsLast().op("uuid_ops"), table.classId.asc().nullsLast().op("uuid_ops"), table.subjectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [users.id],
			name: "teacher_subject_assignments_teacher_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.classId],
			foreignColumns: [classes.id],
			name: "teacher_subject_assignments_class_id_classes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subjectId],
			foreignColumns: [subjects.id],
			name: "teacher_subject_assignments_subject_id_subjects_id_fk"
		}).onDelete("cascade"),
]);

export const subjects = pgTable("subjects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 120 }).notNull(),
	code: varchar({ length: 32 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("subjects_code_unique").using("btree", table.code.asc().nullsLast().op("text_ops")),
]);
