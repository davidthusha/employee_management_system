
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
import AdminAttendance from "./pages/AdminAttendance";
import AdminLeave from "./pages/AdminLeave";
import AdminReports from "./pages/AdminReports";

import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeAttendance from "./pages/EmployeeAttendance";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeLeave from "./pages/EmployeeLeave";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />

                {/* Admin Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Employees */}
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

                {/* Departments already includes AdminDashboard */}
                <Route
                    path="/departments"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <Departments />
                        </ProtectedRoute>
                    }
                />

                {/* Attendance already includes AdminDashboard */}
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminAttendance />
                        </ProtectedRoute>
                    }
                />

                {/* Leave Management already includes AdminDashboard */}
                <Route
                    path="/admin-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminLeave />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Reports */}
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

                {/* Employee Dashboard */}
                <Route
                    path="/employee-portal"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Employee Profile */}
                <Route
                    path="/employee-profile"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeDashboard>
                                <EmployeeProfile />
                            </EmployeeDashboard>
                        </ProtectedRoute>
                    }
                />

                {/* Employee Attendance */}
                <Route
                    path="/employee-attendance"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeDashboard>
                                <EmployeeAttendance />
                            </EmployeeDashboard>
                        </ProtectedRoute>
                    }
                />

                {/* Employee Leave */}
                <Route
                    path="/employee-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Employee"]}>
                            <EmployeeDashboard>
                                <EmployeeLeave />
                            </EmployeeDashboard>
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
