
import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();

    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    // Redirect users who are not logged in.
    if (!token || !storedUser) {
        return (
            <Navigate
                to="/"
                replace
                state={{ from: location }}
            />
        );
    }

    let user;

    // Validate the stored user data.
    try {
        user = JSON.parse(storedUser);
    } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return <Navigate to="/" replace />;
    }

    if (!user || !user.role) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return <Navigate to="/" replace />;
    }

    // Restrict access according to the user's role.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        if (user.role === "Admin") {
            return <Navigate to="/dashboard" replace />;
        }

        if (user.role === "Employee") {
            return <Navigate to="/employee-portal" replace />;
        }

        // Unknown role
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
