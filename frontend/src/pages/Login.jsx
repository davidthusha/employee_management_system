
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    UserRound,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    ShieldCheck
} from "lucide-react";

import api from "../services/api";
import "../CSS/Login.css";

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await api.post("/auth/login", {
                username: username,
                password
            });

            const { token, user } = response.data;

            if (!token || !user || !user.role) {
                throw new Error("Invalid login response from server.");
            }

            if (!["Admin", "Employee"].includes(user.role)) {
                throw new Error("Your account has an unsupported role.");
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));

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
        <main className="login-container">
            <div className="login-shell">

                {/* Left branding panel */}
                <section className="login-brand-panel">
                    <div className="login-brand-content">
                        <div className="login-brand">
                            <img
                                src="/WorkMateLogo.png"
                                alt="WorkMate logo"
                                className="login-logo"
                            />

                            <div className="login-brand-name">
                                <span>WorkMate</span>
                                <small>EMPLOYEE MANAGEMENT</small>
                            </div>
                        </div>

                        <div className="login-brand-message">
                            <span className="login-eyebrow">
                                YOUR WORKPLACE, SIMPLIFIED
                            </span>

                            <h1>
                                Better work.
                                <br />
                                Better <span>together.</span>
                            </h1>

                            <p>
                                One place to manage your workforce,
                                track attendance, and stay connected
                                with your organisation.
                            </p>

                            <div className="login-feature">
                                <div className="login-feature-icon">
                                    <ShieldCheck size={21} />
                                </div>

                                <div>
                                    <strong>Your workspace, secured</strong>
                                    <span>
                                        Sign in to access your personalised
                                        workspace.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="login-brand-footer">
                            <span className="login-footer-dot" />
                            <span>WorkMate HR Management System</span>
                        </div>
                    </div>
                </section>

                {/* Right login panel */}
                <section className="login-form-panel">
                    <div className="login-form-content">
                        <div className="login-mobile-brand">
                            <img
                                src="/WorkMateLogo.png"
                                alt="WorkMate logo"
                            />
                            <span>WorkMate</span>
                        </div>

                        <div className="login-heading">
                            <span className="login-form-eyebrow">
                                WELCOME BACK
                            </span>

                            <h2>Sign in to WorkMate</h2>

                            <p>
                                Enter your credentials to access your account.
                            </p>
                        </div>

                        {error && (
                            <div
                                className="login-error"
                                role="alert"
                            >
                                <span className="login-error-mark">!</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form
                            className="login-form"
                            onSubmit={handleLogin}
                        >
                            <div className="login-field">
                                <label htmlFor="username">
                                    Username
                                </label>

                                <div className="login-input-wrap">
                                    <UserRound
                                        className="login-input-icon"
                                        size={19}
                                        aria-hidden="true"
                                    />

                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="Enter your username"
                                        value={username}
                                        onChange={(event) =>
                                            setUsername(event.target.value)
                                        }
                                        autoComplete="username"
                                        autoFocus
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="login-field">
                                <label htmlFor="password">
                                    Password
                                </label>

                                <div className="login-input-wrap">
                                    <LockKeyhole
                                        className="login-input-icon"
                                        size={19}
                                        aria-hidden="true"
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        autoComplete="current-password"
                                        required
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        className="login-password-toggle"
                                        onClick={() =>
                                            setShowPassword((previous) => !previous)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        aria-pressed={showPassword}
                                        disabled={loading}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="login-submit"
                                disabled={loading}
                            >
                                <span>
                                    {loading ? "Signing in..." : "Sign in"}
                                </span>

                                {!loading && (
                                    <ArrowRight size={19} />
                                )}
                            </button>
                        </form>

                        <div className="login-security-note">
                            <ShieldCheck size={17} />
                            <span>
                                Your account is protected by secure
                                authentication.
                            </span>
                        </div>

                        <p className="login-copyright">
                            © {new Date().getFullYear()} WorkMate.
                            All rights reserved.
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}

export default Login;
