
import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employee";
import Departments from "./pages/Departments";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Login />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/employees"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard>
                                <Employees />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/departments"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard>
                                <Departments />
                            </AdminDashboard>
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
