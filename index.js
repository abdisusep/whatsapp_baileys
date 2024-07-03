const {
	default: makeWASocket,
	useMultiFileAuthState,
	DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const express = require("express");
const cors = require('cors');
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let userId = 'dev';
let sock;
let qrValue;

const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${userId}`);

    sock = makeWASocket({
    	printQRInTerminal: true,
    	auth: state,
    	logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
    	const { connection, lastDisconnect, qr } = update;
    	
    	if (qr !== undefined) {
    		qrValue = qr;
    	}

    	if (connection === 'close') {
    		const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
    		if (shouldReconnect) {
    			connectToWhatsApp();
    		}
    	} else if (connection === 'open') {
            console.log('Open Connected!');
            return;
        }
    });

    sock.ev.on('message.update', (messageInfo) => {
    	console.log(messageInfo);
    });

    sock.ev.on('message.upsert', (messageInfoUpsert) => {
    	console.log(messageInfoUpsert);
    });

    sock.ev.on('creds.update', saveCreds);
}

app.get('/', (req, res) => {
  	const response = {
        success: true,
        status: qrValue ? 'Scan QR' : 'Connected',
        qr: qrValue
    };

    res.json(response);
})

app.get('/send', async (req, res) => {
    const { number, message } = req.query;

    if (!number || !message) {
        return res.status(200).json({
            success: false,
            message: 'Number and message required!',
        });
    }

    let numberWA;
    const serverWA = '@c.us';
    if (number.startsWith('62')) {
      numberWA = number + serverWA;
    } else {
      numberWA = '62' + number.substring(1) + serverWA;
    }

    try {
        const exists = await sock.onWhatsApp(numberWA);
        if (exists?.jid || (exists && exists[0]?.jid)) {
            await sock.sendMessage(exists.jid || exists[0].jid, { text: message });
            res.status(200).json({
                success: true,
                message: `Message send successfull to ${number}`,
            });
        } else {
            res.status(200).json({
                success: false,
                message: `Number ${number} not registered!`,
            });
        }
    } catch (err) {
        res.status(200).json({
            success: false,
            message: err.message,
        });
    }
});

connectToWhatsApp();

app.listen(port, () => {
  console.log(`Running on port : ${port}`)
})