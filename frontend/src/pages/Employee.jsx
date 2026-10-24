import { useEffect, useState } from "react";
import api from "../services/api";
import "../CSS/Employee.css";

const initialForm = {
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    hire_date: "",
    department_id: "",
    job_title: "",
    status: "Active"
};

function Employees() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get("/employees");
            setEmployees(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Could not load employees. Check your login and backend."
            );
        } finally {
            setLoading(false);
        }
    };

    const loadDepartments = async () => {
        try {
            const response = await api.get("/departments");
            setDepartments(response.data);
        } catch (err) {
            console.error("Could not load departments:", err);
        }
    };

    useEffect(() => {
        loadEmployees();
        loadDepartments();
    }, []);

    const openModal = () => {
        setEditingEmployee(null);
        setForm(initialForm);
        setError("");
        setSuccess("");
        setModalOpen(true);
    };

    const handleEdit = (employee) => {
        setEditingEmployee(employee);
        setForm({
            employee_code: employee.employee_code || "",
            first_name: employee.first_name || "",
            last_name: employee.last_name || "",
            email: employee.email || "",
            phone: employee.phone || "",
            address: employee.address || "",
            date_of_birth: employee.date_of_birth
                ? String(employee.date_of_birth).slice(0, 10)
                : "",
            hire_date: employee.hire_date
                ? String(employee.hire_date).slice(0, 10)
                : "",
            department_id: employee.department_id
                ? String(employee.department_id)
                : "",
            job_title: employee.job_title || "",
            status: employee.status || "Active"
        });
        setError("");
        setSuccess("");
        setModalOpen(true);
    };

    const handleDelete = async (employee) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await api.delete(`/employees/${employee.employee_id}`);
            setSuccess("Employee deleted successfully.");
            await loadEmployees();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to delete employee. Check the backend route and terminal."
            );
        }
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
        setError("");
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        setSaving(true);

        const payload = {
            ...form,
            department_id: form.department_id
                ? Number(form.department_id)
                : null,
            date_of_birth: form.date_of_birth || null,
            hire_date: form.hire_date || null
        };

        try {
            if (editingEmployee) {
                await api.put(
                    `/employees/${editingEmployee.employee_id}`,
                    payload
                );
                setSuccess("Employee updated successfully.");
            } else {
                await api.post("/employees", payload);
                setSuccess("Employee added successfully.");
            }

            setModalOpen(false);
            setEditingEmployee(null);
            setForm(initialForm);
            setError("");

            await loadEmployees();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Failed to ${editingEmployee ? "update" : "add"} employee. Check the backend route and terminal.`
            );
        } finally {
            setSaving(false);
        }
    };

    const filteredEmployees = employees.filter((employee) => {
        const query = search.toLowerCase();

        return [
            employee.employee_code,
            employee.first_name,
            employee.last_name,
            employee.email,
            employee.department_name,
            employee.job_title
        ].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );
    });

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <h1>Employees</h1>
                    <p>Manage employee information</p>
                </div>

                <button
                    className="primary-button"
                    onClick={openModal}
                >
                    + Add Employee
                </button>
            </div>

            {success && (
                <div className="success-message" role="status">
                    {success}
                </div>
            )}

            {error && !modalOpen && (
                <div className="error-message" role="alert">
                    {error}
                </div>
            )}

            <div className="employee-toolbar">
                <input
                    type="search"
                    placeholder="Search by name, code, email..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            <div className="table-container">
                {loading ? (
                    <p className="loading">Loading employees...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Department</th>
                                <th>Job Title</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty">
                                        No employees found
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((employee) => (
                                    <tr key={employee.employee_id}>
                                        <td>{employee.employee_code}</td>
                                        <td>
                                            {employee.first_name}{" "}
                                            {employee.last_name}
                                        </td>
                                        <td>{employee.email}</td>
                                        <td>
                                            {employee.department_name || "-"}
                                        </td>
                                        <td>{employee.job_title || "-"}</td>
                                        <td>
                                            <span
                                                className={`status ${
                                                    employee.status === "Active"
                                                        ? "active"
                                                        : "inactive"
                                                }`}
                                            >
                                                {employee.status}
                                            </span>
                                        </td>
                                        <td className="employee-actions">
                                            <button
                                                type="button"
                                                className="icon-button edit-icon"
                                                title="Edit employee"
                                                aria-label={`Edit ${employee.first_name} ${employee.last_name}`}
                                                onClick={() => handleEdit(employee)}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button delete-icon"
                                                title="Delete employee"
                                                aria-label={`Delete ${employee.first_name} ${employee.last_name}`}
                                                onClick={() => handleDelete(employee)}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && (
                <div
                    className="modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className="employee-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="employee-modal-title"
                    >
                        <div className="modal-header">
                            <div>
                                <h2 id="employee-modal-title">
                                    {editingEmployee ? "Edit Employee" : "Add Employee"}
                                </h2>
                                <p>
                                    {editingEmployee
                                        ? "Update the employee's details below."
                                        : "Enter the employee's details below."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="employee-form-grid">
                                <div className="form-field">
                                    <label htmlFor="employee_code">
                                        Employee Code *
                                    </label>
                                    <input
                                        id="employee_code"
                                        name="employee_code"
                                        value={form.employee_code}
                                        onChange={handleChange}
                                        required
                                        maxLength={20}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="job_title">Job Title</label>
                                    <input
                                        id="job_title"
                                        name="job_title"
                                        value={form.job_title}
                                        onChange={handleChange}
                                        maxLength={100}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="first_name">
                                        First Name *
                                    </label>
                                    <input
                                        id="first_name"
                                        name="first_name"
                                        value={form.first_name}
                                        onChange={handleChange}
                                        required
                                        maxLength={50}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="last_name">
                                        Last Name *
                                    </label>
                                    <input
                                        id="last_name"
                                        name="last_name"
                                        value={form.last_name}
                                        onChange={handleChange}
                                        required
                                        maxLength={50}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="email">Email *</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        maxLength={100}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="phone">Phone</label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={handleChange}
                                        maxLength={20}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="department_id">
                                        Department
                                    </label>
                                    <select
                                        id="department_id"
                                        name="department_id"
                                        value={form.department_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">
                                            No department
                                        </option>
                                        {departments.map((department) => (
                                            <option
                                                key={department.department_id}
                                                value={department.department_id}
                                            >
                                                {department.department_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label htmlFor="hire_date">Hire Date</label>
                                    <input
                                        id="hire_date"
                                        name="hire_date"
                                        type="date"
                                        value={form.hire_date}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="date_of_birth">
                                        Date of Birth
                                    </label>
                                    <input
                                        id="date_of_birth"
                                        name="date_of_birth"
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="form-field">
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div className="form-field full-width">
                                    <label htmlFor="address">Address</label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        rows={2}
                                        maxLength={255}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="error-message" role="alert">
                                    {error}
                                </div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingEmployee
                                            ? "Update Employee"
                                            : "Save Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Employees;
