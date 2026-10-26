
const express = require("express");
const router = express.Router();

const {
    getAttendance,
    getMyAttendance,
    checkIn,
    checkOut,
    getAttendanceById,
    createAttendance,
    updateAttendance,
    deleteAttendance
} = require("../controllers/attendanceController");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/authMiddleware");

// Employee routes: the controller derives employee_id from the JWT.
router.get(
    "/me",
    authenticateToken,
    authorizeRoles("Employee"),
    getMyAttendance
);

router.post(
    "/check-in",
    authenticateToken,
    authorizeRoles("Employee"),
    checkIn
);

router.post(
    "/check-out",
    authenticateToken,
    authorizeRoles("Employee"),
    checkOut
);

// Admin attendance management.
router.get(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    getAttendance
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("Admin"),
    createAttendance
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    updateAttendance
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("Admin"),
    deleteAttendance
);

// Admin can view any record; employees can view their own only.
router.get(
    "/:id",
    authenticateToken,
    getAttendanceById
);

module.exports = router;
