const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const app = express();
const port = process.env.WHATSAPP_PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

let sock = null;
let qrCodeValue = null;
let connectionStatus = "disconnected"; // disconnected, connecting, connected

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "auth_info_baileys"));
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        logger: pino({ level: 'info' })
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeValue = await qrcode.toDataURL(qr);
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) ? 
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;
            
            connectionStatus = "disconnected";
            qrCodeValue = null;
            
            // console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect);
            
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === "open") {
            connectionStatus = "connected";
            qrCodeValue = null;
            // console.log("opened connection");
        } else if (connection === "connecting") {
            connectionStatus = "connecting";
        }
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
}

app.get("/status", (req, res) => {
    res.json({
        status: connectionStatus,
        qr: qrCodeValue
    });
});

app.post("/send", async (req, res) => {
    const { phone, message } = req.body;

    if (connectionStatus !== "connected") {
        return res.status(400).json({ error: "WhatsApp not connected" });
    }

    try {
        // Format phone: remove +, space, dash. Ensure starts with country code.
        let formattedPhone = phone.replace(/\D/g, "");
        if (formattedPhone.startsWith("0")) {
            formattedPhone = "62" + formattedPhone.slice(1);
        }
        if (!formattedPhone.endsWith("@s.whatsapp.net")) {
            formattedPhone += "@s.whatsapp.net";
        }

        const sentMsg = await sock.sendMessage(formattedPhone, { text: message });
        res.json({ success: true, data: sentMsg });
    } catch (error) {
        // console.error("Error sending message:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post("/logout", async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        // Remove auth folder
        const authPath = path.join(__dirname, "auth_info_baileys");
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        connectionStatus = "disconnected";
        qrCodeValue = null;
        res.json({ success: true });
        
        // Re-init socket for next QR
        setTimeout(() => connectToWhatsApp(), 2000);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    // console.log(`WhatsApp service listening at http://localhost:${port}`);
    connectToWhatsApp();
});
