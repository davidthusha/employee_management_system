
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                username: username.trim(),
                password
            });

            const { token, user } = response.data;

            if (!token || !user || !user.role) {
                throw new Error("Invalid login response from server.");
            }

            if (!["Admin", "Employee"].includes(user.role)) {
                throw new Error("Your account has an unsupported role.");
            }

            // Save the authenticated session.
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

            // Redirect according to the authenticated role.
            if (user.role === "Admin") {
                navigate("/dashboard", { replace: true });
            } else {
                navigate("/employee-portal", { replace: true });
            }
        } catch (err) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            setError(
                err.response?.data?.message ||
                err.message ||
                "Login failed. Please check your username and password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Employee Management System</h1>
                <h2>Login</h2>

                {error && (
                    <p className="error" role="alert">
                        {error}
                    </p>
                )}

                <form onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(event) =>
                                setUsername(event.target.value)
                            }
                            autoComplete="username"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            autoComplete="current-password"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
