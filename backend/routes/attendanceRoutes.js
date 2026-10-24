
const express = require("express");

const {
    getAttendance,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance
} = require("../controllers/attendanceController");

const router = express.Router();

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// View attendance records — Admin only
router.get(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    getAttendance
);

// View a single attendance record — authenticated users
router.get(
    "/:id",
    authenticateToken,
    getAttendanceById
);

// Create attendance — Admin only
router.post(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    createAttendance
);

// Update attendance — Admin only
router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    updateAttendance
);

// Delete attendance — Admin only
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    deleteAttendance
);

module.exports = router;
