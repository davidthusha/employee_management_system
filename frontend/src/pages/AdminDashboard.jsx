function AdminDashboard() {

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        window.location.href = "/";
    };

    return (
        <div>

            <h1>Employee Management System</h1>

            <h2>Admin Dashboard</h2>

            <p>
                Welcome, {user?.username}
            </p>

            <p>
                Role: {user?.role}
            </p>

            <button onClick={logout}>
                Logout
            </button>

        </div>
    );
}

export default AdminDashboard;