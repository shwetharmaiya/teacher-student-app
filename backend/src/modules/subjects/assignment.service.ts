import { and, asc, eq } from "drizzle-orm";

import { db } from "../../db/index.js";

import {
    teacherSubjectAssignments,
    users,
    classes,
    subjects,
} from "../../db/schema.js";

export async function createTeacherSubjectAssignment(input: {
    teacherId: string;
    classId: string;
    subjectId: string;
}) {
    const [assignment] = await db
        .insert(teacherSubjectAssignments)
        .values(input)
        .onConflictDoNothing()
        .returning();

    return assignment ?? null;
}

export async function listTeacherSubjectAssignments() {
    return db
        .select({
            id: teacherSubjectAssignments.id,

            teacherId: users.id,
            teacherEmail: users.email,

            classId: classes.id,
            grade: classes.grade,
            section: classes.section,

            subjectId: subjects.id,
            subjectName: subjects.name,
            subjectCode: subjects.code,

            createdAt: teacherSubjectAssignments.createdAt,
        })
        .from(teacherSubjectAssignments)

        .innerJoin(
            users,
            eq(
                teacherSubjectAssignments.teacherId,
                users.id,
            ),
        )

        .innerJoin(
            classes,
            eq(
                teacherSubjectAssignments.classId,
                classes.id,
            ),
        )

        .innerJoin(
            subjects,
            eq(
                teacherSubjectAssignments.subjectId,
                subjects.id,
            ),
        )

        .orderBy(
            asc(classes.grade),
            asc(classes.section),
            asc(subjects.name),
            asc(users.email),
        );
}

export async function listAssignmentsForTeacher(
    teacherId: string,
) {
    return db
        .select({
            id: teacherSubjectAssignments.id,

            classId: classes.id,
            grade: classes.grade,
            section: classes.section,

            subjectId: subjects.id,
            subjectName: subjects.name,
            subjectCode: subjects.code,
        })
        .from(teacherSubjectAssignments)

        .innerJoin(
            classes,
            eq(
                teacherSubjectAssignments.classId,
                classes.id,
            ),
        )

        .innerJoin(
            subjects,
            eq(
                teacherSubjectAssignments.subjectId,
                subjects.id,
            ),
        )

        .where(
            eq(
                teacherSubjectAssignments.teacherId,
                teacherId,
            ),
        )

        .orderBy(
            asc(classes.grade),
            asc(classes.section),
            asc(subjects.name),
        );
}

export async function isTeacherAssignedToClassSubject(
    teacherId: string,
    classId: string,
    subjectId: string,
) {
    const [assignment] = await db
        .select({
            id: teacherSubjectAssignments.id,
        })
        .from(teacherSubjectAssignments)
        .where(
            and(
                eq(
                    teacherSubjectAssignments.teacherId,
                    teacherId,
                ),
                eq(
                    teacherSubjectAssignments.classId,
                    classId,
                ),
                eq(
                    teacherSubjectAssignments.subjectId,
                    subjectId,
                ),
            ),
        )
        .limit(1);

    return Boolean(assignment);
}

export async function deleteTeacherSubjectAssignment(
    id: string,
) {
    const [assignment] = await db
        .delete(teacherSubjectAssignments)
        .where(
            eq(
                teacherSubjectAssignments.id,
                id,
            ),
        )
        .returning({
            id: teacherSubjectAssignments.id,
        });

    return assignment ?? null;
}