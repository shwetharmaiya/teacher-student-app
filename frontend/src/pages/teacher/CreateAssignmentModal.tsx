import { useState } from "react";
import { apiFetch } from "../../services/api/client";

type CreateAssignmentModalProps = {
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

export default function CreateAssignmentModal({
    classId,
    onClose,
    onCreated,
}: CreateAssignmentModalProps) {
    const [title, setTitle] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        if (!title.trim()) {
            setError("Assignment title is required.");
            return;
        }

        if (!dueAt) {
            setError("Due date is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");

            const response =
                await apiFetch<{ assignment: Assignment }>(
                    "/teacher/assignments",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            classId,
                            title: title.trim(),
                            dueAt,
                        }),
                    },
                );

            onCreated(response.assignment);
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Could not publish assignment",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div
            className="assignment-modal-overlay"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div className="assignment-modal">
                <div className="assignment-modal-header">
                    <div>
                        <h2>Create Assignment</h2>
                        <p>
                            Publish an assignment for this
                            class.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="assignment-modal-close"
                        onClick={onClose}
                        disabled={saving}
                    >
                        ×
                    </button>
                </div>

                <form
                    className="assignment-form"
                    onSubmit={handleSubmit}
                >
                    {error && (
                        <div className="assignment-form-error">
                            {error}
                        </div>
                    )}

                    <label>
                        <span>Title</span>

                        <input
                            type="text"
                            value={title}
                            onChange={(event) =>
                                setTitle(event.target.value)
                            }
                            placeholder="e.g. Chapter 1 Homework"
                            maxLength={160}
                            autoFocus
                        />
                    </label>

                    <label>
                        <span>Due date</span>

                        <input
                            type="datetime-local"
                            value={dueAt}
                            onChange={(event) =>
                                setDueAt(event.target.value)
                            }
                        />
                    </label>

                    <div className="assignment-form-actions">
                        <button
                            type="button"
                            className="workspace-secondary-button"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="workspace-primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Publishing..."
                                : "Publish Assignment"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}