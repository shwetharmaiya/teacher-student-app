import {
    pgEnum,
    pgTable,
    uuid,
    varchar,
    timestamp,
    integer,
    uniqueIndex,
    text,
    index,
    unique
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
    "ADMIN",
    "TEACHER",
    "STUDENT",
    "PARENT",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
    "PRESENT",
    "ABSENT",
    "LATE",
]);

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),

    email: varchar("email", {
        length: 255,
    })
        .notNull()
        .unique(),

    passwordHash: varchar("password_hash", {
        length: 255,
    }).notNull(),

    role: userRoleEnum("role").notNull(),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

// A class is one teachable section, for example "Grade 10 / A". Student
// enrolments will be represented by their own table when that feature is added.
export const classes = pgTable(
    "classes",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        grade: varchar("grade", { length: 64 }).notNull(),
        section: varchar("section", { length: 3 }).notNull(),
        teacherName: varchar("teacher_name", { length: 120 }),
        teacherId: uuid("teacher_id").references(() => users.id, {
            onDelete: "set null",
        }),
        room: varchar("room", { length: 32 }).notNull(),
        capacity: integer("capacity").notNull(),
        studentCount: integer("student_count").default(0).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("classes_grade_section_unique").on(table.grade, table.section),
    ],
);

export const classEnrollments = pgTable(
    "class_enrollments",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        classId: uuid("class_id").notNull().references(() => classes.id, {
            onDelete: "cascade",
        }),
        studentId: uuid("student_id").notNull().references(() => users.id, {
            onDelete: "cascade",
        }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("class_enrollments_class_student_unique").on(table.classId, table.studentId),
    ],
);

export const assignments = pgTable("assignments", {
    id: uuid("id").defaultRandom().primaryKey(),
    classId: uuid("class_id").notNull().references(() => classes.id, {
        onDelete: "cascade",
    }),
    teacherId: uuid("teacher_id").notNull().references(() => users.id, {
        onDelete: "cascade",
    }),
    title: varchar("title", { length: 160 }).notNull(),
    description: varchar("description", { length: 1000 }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceRecords = pgTable(
    "attendance_records",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        classId: uuid("class_id").notNull().references(() => classes.id, {
            onDelete: "cascade",
        }),
        studentId: uuid("student_id").notNull().references(() => users.id, {
            onDelete: "cascade",
        }),
        attendanceDate: varchar("attendance_date", { length: 10 }).notNull(),
        status: attendanceStatusEnum("status").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        uniqueIndex("attendance_records_class_student_date_unique").on(
            table.classId,
            table.studentId,
            table.attendanceDate,
        ),
    ],
);

export const subjects = pgTable(
    "subjects",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        name: varchar("name", {
            length: 120,
        }).notNull(),

        code: varchar("code", {
            length: 32,
        }).notNull(),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),

        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("subjects_code_unique").on(table.code),
    ],
);

export const teacherSubjectAssignments = pgTable(
    "teacher_subject_assignments",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        teacherId: uuid("teacher_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        classId: uuid("class_id")
            .notNull()
            .references(() => classes.id, {
                onDelete: "cascade",
            }),

        subjectId: uuid("subject_id")
            .notNull()
            .references(() => subjects.id, {
                onDelete: "cascade",
            }),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex(
            "teacher_class_subject_unique",
        ).on(
            table.teacherId,
            table.classId,
            table.subjectId,
        ),
    ],
);

export const submissionStatusEnum = pgEnum("submission_status", [
  "SUBMITTED",
  "GRADED",
  "RETURNED",
]);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, {
        onDelete: "cascade",
      }),

    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    content: text("content"),

    fileUrl: text("file_url"),

    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    status: submissionStatusEnum("status")
      .default("SUBMITTED")
      .notNull(),

    marks: integer("marks"),

    feedback: text("feedback"),

    gradedAt: timestamp("graded_at", {
      withTimezone: true,
    }),

    gradedBy: uuid("graded_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    assignmentStudentUnique: unique().on(
      table.assignmentId,
      table.studentId
    ),

    assignmentIdx: index("submissions_assignment_idx").on(
      table.assignmentId
    ),

    studentIdx: index("submissions_student_idx").on(
      table.studentId
    ),
  })
);