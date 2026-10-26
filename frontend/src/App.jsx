
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

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Login page */}
                <Route path="/" element={<Login />} />

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
                            <AdminDashboard>
                                <Departments />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminAttendance />
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

                <Route
                    path="/employee-profile"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeProfile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employee-attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeAttendance />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employee-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeLeave />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminLeave />
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
