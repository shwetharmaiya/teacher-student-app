import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { subjects } from "../../db/schema.js";

export type SubjectInput = {
    name: string;
    code: string;
};

export async function listSubjects() {
    return db
        .select()
        .from(subjects)
        .orderBy(asc(subjects.name));
}

export async function createSubject(input: SubjectInput) {
    try {
        const [subject] = await db
            .insert(subjects)
            .values({
                name: input.name,
                code: input.code.toUpperCase(),
            })
            .returning();

        return subject;
    } catch (error) {
        console.error("CREATE SUBJECT DATABASE ERROR:");
        console.error(error);

        throw error;
    }
}

export async function updateSubject(
    id: string,
    input: SubjectInput,
) {
    const [subject] = await db
        .update(subjects)
        .set({
            name: input.name,
            code: input.code.toUpperCase(),
            updatedAt: new Date(),
        })
        .where(eq(subjects.id, id))
        .returning();

    return subject ?? null;
}

export async function deleteSubject(id: string) {
    const [subject] = await db
        .delete(subjects)
        .where(eq(subjects.id, id))
        .returning({
            id: subjects.id,
        });

    return subject ?? null;
}