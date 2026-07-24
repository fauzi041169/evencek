const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const crypto = require("crypto");

const app = express();
const port = Number(process.env.WHATSAPP_PORT || 3001);
const host = process.env.WHATSAPP_HOST || "127.0.0.1";
const apiToken = process.env.WHATSAPP_BAILEYS_TOKEN || process.env.WHATSAPP_TOKEN || "";

app.use(bodyParser.json({ limit: "1mb" }));

function timingSafeEqualString(a, b) {
    const left = Buffer.from(String(a || ""), "utf8");
    const right = Buffer.from(String(b || ""), "utf8");
    if (left.length !== right.length) {
        return false;
    }
    return crypto.timingSafeEqual(left, right);
}

app.use((req, res, next) => {
    if (!apiToken) {
        return res.status(503).json({ error: "WhatsApp service token is not configured" });
    }

    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const provided = bearer || req.headers["x-api-token"] || "";

    if (!provided || !timingSafeEqualString(provided, apiToken)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    return next();
});

/** @type {Map<string, { sock: any, qr: string|null, status: string, connecting: boolean }>} */
const sessions = new Map();

function sanitizeActivityId(raw) {
    const id = String(raw || "").trim();
    if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
        return null;
    }
    return id;
}

function getActivityId(req) {
    return sanitizeActivityId(
        req.params.activityId ||
        req.query.activity_id ||
        req.body?.activity_id
    );
}

function authDirFor(activityId) {
    return path.join(__dirname, "auth_sessions", activityId);
}

function ensureSession(activityId) {
    if (!sessions.has(activityId)) {
        sessions.set(activityId, {
            sock: null,
            qr: null,
            status: "disconnected",
            connecting: false,
        });
    }
    return sessions.get(activityId);
}

async function connectToWhatsApp(activityId) {
    const session = ensureSession(activityId);
    if (session.connecting || session.status === "connected") {
        return session;
    }

    session.connecting = true;
    const authPath = authDirFor(activityId);
    fs.mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: "silent" }),
    });

    session.sock = sock;
    session.status = "connecting";

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        const current = ensureSession(activityId);

        if (qr) {
            current.qr = await qrcode.toDataURL(qr);
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            current.status = "disconnected";
            current.qr = null;
            current.connecting = false;
            current.sock = null;

            if (shouldReconnect) {
                setTimeout(() => connectToWhatsApp(activityId), 1500);
            }
        } else if (connection === "open") {
            current.status = "connected";
            current.qr = null;
            current.connecting = false;
        } else if (connection === "connecting") {
            current.status = "connecting";
        }
    });

    sock.ev.on("creds.update", saveCreds);
    session.connecting = false;
    return session;
}

app.get("/status", async (req, res) => {
    const activityId = getActivityId(req);
    if (!activityId) {
        return res.status(422).json({ error: "activity_id is required" });
    }

    const session = ensureSession(activityId);
    if (!session.sock && !session.connecting) {
        connectToWhatsApp(activityId).catch(() => {});
    }

    return res.json({
        status: session.status,
        qr: session.qr,
        activity_id: activityId,
    });
});

app.post("/send", async (req, res) => {
    const activityId = getActivityId(req);
    const { phone, message } = req.body || {};

    if (!activityId) {
        return res.status(422).json({ error: "activity_id is required" });
    }
    if (!phone || !message) {
        return res.status(422).json({ error: "phone and message are required" });
    }

    let session = ensureSession(activityId);
    if (session.status !== "connected") {
        await connectToWhatsApp(activityId);
        session = ensureSession(activityId);
    }

    if (session.status !== "connected" || !session.sock) {
        return res.status(400).json({ error: "WhatsApp not connected for this activity" });
    }

    try {
        let formattedPhone = String(phone).replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "62" + formattedPhone.slice(1);
        }
        if (!formattedPhone.endsWith("@s.whatsapp.net")) {
            formattedPhone += "@s.whatsapp.net";
        }

        const sentMsg = await session.sock.sendMessage(formattedPhone, { text: String(message).slice(0, 4000) });
        return res.json({ success: true, data: sentMsg, activity_id: activityId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.post("/logout", async (req, res) => {
    const activityId = getActivityId(req);
    if (!activityId) {
        return res.status(422).json({ error: "activity_id is required" });
    }

    try {
        const session = ensureSession(activityId);
        if (session.sock) {
            try {
                await session.sock.logout();
            } catch (_) {
                // ignore logout errors for already-dead sockets
            }
        }

        const authPath = authDirFor(activityId);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }

        sessions.set(activityId, {
            sock: null,
            qr: null,
            status: "disconnected",
            connecting: false,
        });

        return res.json({ success: true, activity_id: activityId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

app.listen(port, host, () => {
    // Sessions connect on-demand per activity_id
    console.log(`WhatsApp Baileys listening on ${host}:${port} (per-activity sessions)`);
});
