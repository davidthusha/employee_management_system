
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

                {/* Admin pages */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

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
                            <AdminDashboard>
                                <AdminAttendance />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/admin-leave"
                    element={
                        <ProtectedRoute allowedRoles={["Admin"]}>
                            <AdminDashboard>
                                <AdminLeave />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

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

                {/* Employee pages: one shared employee layout */}
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
                            <EmployeeDashboard>
                                <EmployeeProfile />
                            </EmployeeDashboard>
                        </ProtectedRoute>
                    }
                />

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

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
