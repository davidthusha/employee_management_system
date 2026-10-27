
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employee";
import Departments from "./pages/Departments";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import AdminAttendance from "./pages/AdminAttendance";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeLeave from "./pages/EmployeeLeave";
import AdminLeave from "./pages/AdminLeave";
import AdminReports from "./pages/AdminReports";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Login page */}
                <Route
                    path="/"
                    element={<Login />}
                />

                {/* Admin dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Employee management */}
                <Route
                    path="/employees"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                             <AdminDashboard>
                                <Employees />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

                {/* Department management */}
                <Route
                    path="/departments"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                                <Departments />
                        </ProtectedRoute>
                    }
                />

                {/* Admin attendance */}
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminAttendance />
                        </ProtectedRoute>
                    }
                />

                {/* Admin leave management */}
                <Route
                    path="/admin-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminLeave />
                        </ProtectedRoute>
                    }
                />

                {/* Admin reports */}
                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminDashboard>
                            <AdminReports />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

                {/* Employee portal */}
                <Route
                    path="/employee-portal"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Employee profile */}
                <Route
                    path="/employee-profile"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeProfile />
                        </ProtectedRoute>
                    }
                />

                {/* Employee attendance */}
                <Route
                    path="/employee-attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeAttendance />
                        </ProtectedRoute>
                    }
                />

                {/* Employee leave */}
                <Route
                    path="/employee-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeLeave />
                        </ProtectedRoute>
                    }
                />

                {/* Unknown routes */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
