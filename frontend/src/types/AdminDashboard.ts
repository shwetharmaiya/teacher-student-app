export type DashboardSummary = {
    totals: { students: number; teachers: number; classes: number; parents: number };
    attendance: {
        date: string;
        recorded: number;
        present: number;
        late: number;
        absent: number;
        percentage: number | null;
    };
};
