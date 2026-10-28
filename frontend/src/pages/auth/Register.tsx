import { useNavigate } from "react-router-dom";

export default function Register() {
    const navigate = useNavigate();
    return (
        <main className="login-page">
            <section className="login-card">
                <h1>Account access</h1>
                <p>Accounts are created by your school administrator. Contact them to receive your login email and temporary password.</p>
                <button type="button" onClick={() => navigate("/login")}>Back to login</button>
            </section>
        </main>
    );
}
