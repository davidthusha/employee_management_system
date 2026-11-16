import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import "../CSS/EmployeeProfile.css";

const INITIAL_PROFILE = {
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    hire_date: "",
    department_name: "",
    job_title: "",
    status: "",
    username: ""
};

const INITIAL_PASSWORD = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
};

function formatDate(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
}

function getDisplayName(profile, user) {
    const profileName = [
        profile?.first_name,
        profile?.last_name
    ]
        .filter(name => typeof name === "string" && name.trim())
        .map(name => name.trim())
        .join(" ");

    const userName = [
        user?.first_name,
        user?.last_name
    ]
        .filter(name => typeof name === "string" && name.trim())
        .map(name => name.trim())
        .join(" ");

    return (
        profileName ||
        user?.display_name ||
        userName ||
        profile?.username ||
        user?.username ||
        "Employee"
    );
}

function EmployeeProfile() {
    const navigate = useNavigate();
    const location = useLocation();

    const [profile, setProfile] = useState(INITIAL_PROFILE);

    const [form, setForm] = useState({
        email: "",
        phone: "",
        address: "",
        date_of_birth: ""
    });

    const [passwordForm, setPasswordForm] = useState(INITIAL_PASSWORD);

    const [loading, setLoading] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const [profileError, setProfileError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [success, setSuccess] = useState("");

    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    });

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            setLoading(true);
            setProfileError("");

            try {
                const response = await api.get("/profile");
                const data = response.data?.profile;

                if (!data) {
                    throw new Error("The server returned no profile data.");
                }

                if (cancelled) return;

                setProfile({
                    ...INITIAL_PROFILE,
                    ...data
                });

                setForm({
                    email: data.email || "",
                    phone: data.phone || "",
                    address: data.address || "",
                    date_of_birth: formatDate(data.date_of_birth)
                });
            } catch (error) {
                if (cancelled) return;

                console.error(
                    "Load profile error:",
                    error.response?.data || error.message
                );

                setProfileError(
                    error.response?.data?.message ||
                    error.message ||
                    "Unable to load your profile."
                );

                if (
                    error.response?.status === 401 ||
                    error.response?.status === 403
                ) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/", { replace: true });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/", { replace: true });
    };

    const handleProfileChange = event => {
        const { name, value } = event.target;

        setForm(previous => ({
            ...previous,
            [name]: value
        }));
    };

    const handlePasswordChange = event => {
        const { name, value } = event.target;

        setPasswordForm(previous => ({
            ...previous,
            [name]: value
        }));
    };

    const handleProfileSubmit = async event => {
        event.preventDefault();

        setSavingProfile(true);
        setProfileError("");
        setPasswordError("");
        setSuccess("");

        try {
            const response = await api.put("/profile", {
                email: form.email.trim(),
                phone: form.phone.trim(),
                address: form.address.trim(),
                date_of_birth: form.date_of_birth || null
            });

            setSuccess(
                response.data?.message ||
                "Your profile was updated successfully."
            );

            // Reload the saved profile from the server.
            const updatedResponse = await api.get("/profile");
            const updatedProfile = updatedResponse.data?.profile;

            if (updatedProfile) {
                setProfile({
                    ...INITIAL_PROFILE,
                    ...updatedProfile
                });

                setForm({
                    email: updatedProfile.email || "",
                    phone: updatedProfile.phone || "",
                    address: updatedProfile.address || "",
                    date_of_birth: formatDate(updatedProfile.date_of_birth)
                });
            }
        } catch (error) {
            console.error(
                "Update profile error:",
                error.response?.data || error.message
            );

            setProfileError(
                error.response?.data?.message ||
                "Unable to update your profile."
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async event => {
        event.preventDefault();

        setPasswordError("");
        setProfileError("");
        setSuccess("");

        if (passwordForm.newPassword.length < 8) {
            setPasswordError(
                "Your new password must contain at least 8 characters."
            );
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError(
                "The new password and confirmation do not match."
            );
            return;
        }

        setSavingPassword(true);

        try {
            const response = await api.put("/profile/password", {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
                confirmPassword: passwordForm.confirmPassword
            });

            setSuccess(
                response.data?.message ||
                "Password changed successfully. Please sign in again."
            );

            setPasswordForm(INITIAL_PASSWORD);

            // Sign out so the employee can log in with the new password.
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            navigate("/", {
                replace: true,
                state: {
                    message:
                        "Your password was changed successfully. Please log in using your new password."
                }
            });
        } catch (error) {
            console.error(
                "Change password error:",
                error.response?.data || error.message
            );

            setPasswordError(
                error.response?.data?.message ||
                "Unable to change your password."
            );
        } finally {
            setSavingPassword(false);
        }
    };

    const displayName = getDisplayName(profile, user);

    // Shared employee navigation, including Leave Management.
    const navigation = [
        { label: "Dashboard", path: "/employee-portal" },
        { label: "My Profile", path: "/employee-profile" },
        { label: "My Attendance", path: "/employee-attendance" },
        { label: "Leave Management", path: "/employee-leave" }
    ];

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());

    return (
        <div className="dashboard employee-profile-layout">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    Employee Management
                </div>

                <nav className="sidebar-menu">
                    {navigation.map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={
                                location.pathname === item.path
                                    ? "active"
                                    : ""
                            }
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h2>My Profile</h2>

                    <div className="user-section">
                        <span className="user-name">
                            {displayName}
                        </span>

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <section className="dashboard-content">
                    <div className="dashboard-welcome">
                        <div>
                            <h1>My Profile</h1>
                            <p>
                                View and update your personal information and
                                manage your password.
                            </p>
                        </div>
                    </div>

                    {success && (
                        <div
                            className="employee-profile-success"
                            role="status"
                        >
                            {success}
                        </div>
                    )}

                    {profileError && (
                        <div className="dashboard-error" role="alert">
                            {profileError}
                        </div>
                    )}

                    {loading ? (
                        <div className="dashboard-recent employee-profile-panel">
                            <div className="employee-profile-loading">
                                Loading your profile...
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="dashboard-recent employee-profile-panel">
                                <div className="dashboard-section-header">
                                    <div>
                                        <h2>Personal Information</h2>
                                        <p>
                                            Update your contact details and
                                            personal information.
                                        </p>
                                    </div>
                                </div>

                                <form
                                    className="employee-profile-form"
                                    onSubmit={handleProfileSubmit}
                                >
                                    <label>
                                        First Name
                                        <input
                                            type="text"
                                            value={profile.first_name || ""}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Last Name
                                        <input
                                            type="text"
                                            value={profile.last_name || ""}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Employee Code
                                        <input
                                            type="text"
                                            value={profile.employee_code || ""}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Username
                                        <input
                                            type="text"
                                            value={profile.username || ""}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Email Address *
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleProfileChange}
                                            maxLength={100}
                                            required
                                        />
                                    </label>

                                    <label>
                                        Phone Number
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleProfileChange}
                                            maxLength={20}
                                        />
                                    </label>

                                    <label>
                                        Date of Birth
                                        <input
                                            type="date"
                                            name="date_of_birth"
                                            value={form.date_of_birth}
                                            onChange={handleProfileChange}
                                            max={today}
                                        />
                                    </label>

                                    <label>
                                        Department
                                        <input
                                            type="text"
                                            value={profile.department_name || "—"}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Job Title
                                        <input
                                            type="text"
                                            value={profile.job_title || "—"}
                                            readOnly
                                        />
                                    </label>

                                    <label>
                                        Employment Status
                                        <input
                                            type="text"
                                            value={profile.status || "—"}
                                            readOnly
                                        />
                                    </label>

                                    <label className="employee-profile-full-width">
                                        Address
                                        <textarea
                                            name="address"
                                            value={form.address}
                                            onChange={handleProfileChange}
                                            maxLength={255}
                                            rows={3}
                                        />
                                    </label>

                                    <div className="employee-profile-actions employee-profile-full-width">
                                        <button
                                            type="submit"
                                            className="admin-attendance-primary-button"
                                            disabled={savingProfile}
                                        >
                                            {savingProfile
                                                ? "Saving..."
                                                : "Save Profile"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="dashboard-recent employee-profile-panel">
                                <div className="dashboard-section-header">
                                    <div>
                                        <h2>Change Password</h2>
                                        <p>
                                            Verify your current password before
                                            choosing a new one.
                                        </p>
                                    </div>
                                </div>

                                {passwordError && (
                                    <div
                                        className="dashboard-error employee-profile-password-error"
                                        role="alert"
                                    >
                                        {passwordError}
                                    </div>
                                )}

                                <form
                                    className="employee-profile-form employee-password-form"
                                    onSubmit={handlePasswordSubmit}
                                >
                                    <label className="employee-profile-full-width">
                                        Current Password *
                                        <input
                                            type="password"
                                            name="currentPassword"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                            autoComplete="current-password"
                                            required
                                        />
                                    </label>

                                    <label>
                                        New Password *
                                        <input
                                            type="password"
                                            name="newPassword"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                            minLength={8}
                                            maxLength={72}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <span className="employee-profile-help">
                                            Use at least 8 characters.
                                        </span>
                                    </label>

                                    <label>
                                        Confirm New Password *
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                            minLength={8}
                                            maxLength={72}
                                            autoComplete="new-password"
                                            required
                                        />
                                    </label>

                                    <div className="employee-profile-actions employee-profile-full-width">
                                        <button
                                            type="submit"
                                            className="admin-attendance-primary-button"
                                            disabled={savingPassword}
                                        >
                                            {savingPassword
                                                ? "Changing Password..."
                                                : "Change Password"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}

export default EmployeeProfile;