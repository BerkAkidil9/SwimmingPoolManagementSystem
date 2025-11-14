const doctorRoutes = require("./routes/doctor");
const staffRoutes = require("./routes/staff");
const remindersRoutes = require("./routes/reminders");
const coachRoutes = require("./routes/coach"); // ⬅️ Coach için yeni route eklendi

// Routes
app.use("/api/auth", authRoutes); 
app.use("/api/admin", adminRoutes);
app.use("/api/member", memberRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/reminders", remindersRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/coach", coachRoutes); // ⬅️ Coach route'ları aktif edildi
