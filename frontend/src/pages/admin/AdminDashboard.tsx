import { Link } from "react-router-dom";

export default function AdminDashboard() {
    return (
        <section>
            <p className="eyebrow">Administration</p>
            <h2>Admin dashboard</h2>
            <p className="page-intro">
                Monitor the people and academic structure that make up your
                school.
            </p>
            <div className="stat-grid">
                <article>
                    <span>Students</span>
                    <strong>842</strong>
                </article>
                <article>
                    <span>Teachers</span>
                    <strong>64</strong>
                </article>
                <article>
                    <span>Classes</span>
                    <strong>28</strong>
                </article>
                <article>
                    <span>Parents</span>
                    <strong>731</strong>
                </article>
            </div>
            <article className="panel">
                <h3>Today's attendance</h3>
                <strong className="metric">94.2%</strong>
                <p>
                    Connect this card to the attendance API when it is
                    available.
                </p>
            </article>
            <Link
                to="/admin/teaching-assignments"
                className="admin-dashboard-card"
            >
                <h3>Teaching Assignments</h3>
                <p>Assign teachers to classes and subjects.</p>
            </Link>
        </section>
    );
}
