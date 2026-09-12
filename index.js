require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { router: membersRouter } = require("./routes/members");
const paymentsRouter = require("./routes/payments");

const app = express();
app.use(cors());

// IMPORTANT: the Paystack webhook needs the raw request body to verify the
// signature, so it must be mounted BEFORE express.json() and excluded from it.
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.use("/api/members", membersRouter);
app.use("/api/payments", paymentsRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
