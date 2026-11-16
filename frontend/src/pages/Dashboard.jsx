function Dashboard() {

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    return (
        <div>

            <h1>Dashboard</h1>

            <h2>
                Welcome, {user?.username}
            </h2>

            <p>
                Role: {user?.role}
            </p>

        </div>
    );
}

export default Dashboard;