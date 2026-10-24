
import { useEffect, useState } from "react";
import api from "../services/api";
import "../CSS/Department.css";

const initialForm = {
    department_name: "",
    description: ""
};

function Departments() {
    const [departments, setDepartments] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadDepartments = async () => {
        setLoading(true);

        try {
            const response = await api.get("/departments");
            setDepartments(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to load departments."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDepartments();
    }, []);

    const openAddModal = () => {
        setEditingDepartment(null);
        setForm(initialForm);
        setError("");
        setSuccess("");
        setModalOpen(true);
    };

    const openEditModal = (department) => {
        setEditingDepartment(department);

        setForm({
            department_name: department.department_name || "",
            description: department.description || ""
        });

        setError("");
        setSuccess("");
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingDepartment(null);
        setForm(initialForm);
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

        const departmentName = form.department_name.trim();

        if (!departmentName) {
            setError("Department name is required.");
            return;
        }

        setSaving(true);

        try {
            if (editingDepartment) {
                await api.put(
                    `/departments/${editingDepartment.department_id}`,
                    {
                        department_name: departmentName,
                        description: form.description.trim() || null
                    }
                );

                setSuccess("Department updated successfully.");
            } else {
                await api.post("/departments", {
                    department_name: departmentName,
                    description: form.description.trim() || null
                });

                setSuccess("Department created successfully.");
            }

            setModalOpen(false);
            setEditingDepartment(null);
            setForm(initialForm);

            await loadDepartments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Failed to ${editingDepartment ? "update" : "create"} department.`
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (department) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${department.department_name}"?`
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            await api.delete(
                `/departments/${department.department_id}`
            );

            setSuccess("Department deleted successfully.");

            await loadDepartments();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Failed to delete department."
            );
        }
    };

    const filteredDepartments = departments.filter((department) => {
        const query = search.toLowerCase();

        return [
            department.department_name,
            department.description
        ].some((value) =>
            String(value || "").toLowerCase().includes(query)
        );
    });

    return (
        <div className="departments-page">
            <div className="departments-header">
                <div>
                    <h1>Departments</h1>
                    <p>Manage your organization's departments</p>
                </div>

                <button
                    type="button"
                    className="department-primary-button"
                    onClick={openAddModal}
                >
                    + Add Department
                </button>
            </div>

            {success && (
                <div className="department-success" role="status">
                    {success}
                </div>
            )}

            {error && !modalOpen && (
                <div className="department-error" role="alert">
                    {error}
                </div>
            )}

            <div className="departments-summary">
                <div className="department-summary-card">
                    <span>Total Departments</span>
                    <strong>{departments.length}</strong>
                </div>
            </div>

            <div className="departments-table-card">
                <div className="departments-toolbar">
                    <input
                        type="search"
                        placeholder="Search departments..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>

                <div className="departments-table-wrapper">
                    <table className="departments-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Department Name</th>
                                <th>Description</th>
                                <th>Created At</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="department-empty">
                                        Loading departments...
                                    </td>
                                </tr>
                            ) : filteredDepartments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="department-empty">
                                        {search
                                            ? "No matching departments found."
                                            : "No departments found. Add your first department."}
                                    </td>
                                </tr>
                            ) : (
                                filteredDepartments.map((department) => (
                                    <tr key={department.department_id}>
                                        <td>DEP{String(
                                            department.department_id
                                        ).padStart(3, "0")}</td>

                                        <td className="department-name-cell">
                                            {department.department_name}
                                        </td>

                                        <td>
                                            {department.description || "-"}
                                        </td>

                                        <td>
                                            {department.created_at
                                                ? new Date(
                                                    department.created_at
                                                ).toLocaleDateString()
                                                : "-"}
                                        </td>

                                        <td className="department-actions">
                                            <button
                                                type="button"
                                                className="department-icon-button department-edit-button"
                                                title="Edit department"
                                                aria-label={`Edit ${department.department_name}`}
                                                onClick={() =>
                                                    openEditModal(department)
                                                }
                                            >
                                                ✏️
                                            </button>

                                            <button
                                                type="button"
                                                className="department-icon-button department-delete-button"
                                                title="Delete department"
                                                aria-label={`Delete ${department.department_name}`}
                                                onClick={() =>
                                                    handleDelete(department)
                                                }
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div
                    className="department-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeModal();
                        }
                    }}
                >
                    <div
                        className="department-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="department-modal-title"
                    >
                        <div className="department-modal-header">
                            <div>
                                <h2 id="department-modal-title">
                                    {editingDepartment
                                        ? "Edit Department"
                                        : "Add Department"}
                                </h2>

                                <p>
                                    {editingDepartment
                                        ? "Update the department details."
                                        : "Enter the new department details."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="department-modal-close"
                                onClick={closeModal}
                                disabled={saving}
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="department-form-field">
                                <label htmlFor="department_name">
                                    Department Name *
                                </label>

                                <input
                                    id="department_name"
                                    name="department_name"
                                    value={form.department_name}
                                    onChange={handleChange}
                                    placeholder="e.g. Human Resources"
                                    maxLength={100}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="department-form-field">
                                <label htmlFor="description">
                                    Description
                                </label>

                                <textarea
                                    id="description"
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    placeholder="Enter department responsibilities..."
                                    rows={4}
                                />
                            </div>

                            {error && (
                                <div
                                    className="department-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}

                            <div className="department-modal-actions">
                                <button
                                    type="button"
                                    className="department-secondary-button"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="department-primary-button"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingDepartment
                                            ? "Save Changes"
                                            : "Save Department"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Departments;
