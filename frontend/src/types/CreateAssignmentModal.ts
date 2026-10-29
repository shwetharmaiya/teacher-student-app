export type CreateAssignmentModalProps = {
    classId: string;
    onClose: () => void;
    onCreated: (assignment: Assignment) => void;
};
export type Assignment = {
    id: string;
    classId: string;
    teacherId: string;
    title: string;
    dueAt: string;
    createdAt: string;
};
