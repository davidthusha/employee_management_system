
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

// Employee-specific attendance endpoints.
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

// Admin attendance management endpoints.
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

// This route must remain after /me and the other named routes.
router.get(
    "/:id",
    authenticateToken,
    getAttendanceById
);

module.exports = router;
