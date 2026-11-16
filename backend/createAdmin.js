const bcrypt = require("bcrypt");
const pool = require("./config/db");

const createAdmin = async () => {
    try {
        const password = "Admin@123";

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `
            INSERT INTO users
            (username, password_hash, role)
            VALUES (?, ?, ?)
            `,
            [
                "admin",
                passwordHash,
                "Admin"
            ]
        );

        console.log("Admin created successfully");
        console.log("User ID:", result.insertId);

        process.exit();

    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
};

createAdmin();