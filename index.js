const {
	default: makeWASocket,
	isJidBroadcast,
	useMultiFileAuthState,
	DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');

const connectToWhatsApp = async () => {
	const userId = 'dev';
    const { state, saveCreds } = await useMultiFileAuthState(`sessions/${userId}`);

    const sock = makeWASocket({
    	printQRInTerminal: true,
    	auth: state,
    	logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', async (update) => {
    	const { connection, lastDisconnect, qr } = update;

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

connectToWhatsApp();