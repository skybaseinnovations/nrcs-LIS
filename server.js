const net = require('net');
const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 6666; //192.168.18.243
const SYSTEM_ID = process.env.SYSTEM_ID || 'TESTLAB';
const CLOUD_URL = process.env.CLOUD_LARAVEL_URL || 'http://localhost:8000/api/autolumo';

console.log(`AutoLumo Node.js Bridge Starting`);
console.log(`Listening on port: ${PORT}`);
console.log(`System ID: ${SYSTEM_ID}`);
console.log(`Forwarding to: ${CLOUD_URL}\n`);

const server = net.createServer((socket) => {
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`AutoLumo CONNECTED → ${clientAddr}`);

    socket.on('data', async (data) => {
        const rawMessage = data.toString().trim();
        console.log(`FROM ANALYZER → ${rawMessage}`);

                // QUICK AUTO-REPLY FOR TESTING — REMOVE LATER
        if (rawMessage.startsWith('{1,')) {
            const parts = rawMessage.slice(1, -1).split(',');
            const sn = parts[1];
            const sampleNo = parts[3];
            const reply = `{2,${sn},0,${sampleNo},1,0,P001,[S]Test],[S]Patient],1,35,[S],[S],[S],[S],[S]2025/11/26],[S],[S],1,TSH,1}`;
            socket.write(reply + '\r\n');
            console.log(`TO ANALYZER   ← ${reply}`);
            return;   // skip cloud call for now
        }
        // Forward to your hosted/cloud Laravel
        try {
    const payload =
        `${rawMessage}`;

    const response = await axios.post(
        CLOUD_URL,
        payload,
        {
            timeout: 15000,
            headers: {
                'Content-Type': 'text/plain',
                'X-API-KEY': 'asdkfbjJHVsfajhdJHVSFkajsdj'
            }
        }
    );

    const reply = response.data || '';
    if (reply) {
        socket.write(reply + '\r\n');
        console.log(`TO ANALYZER   ← ${reply}`);
    }
    } catch (err) {
        const msg = err.response?.data || err.message;
        console.error('CLOUD ERROR:', msg);
        socket.write('{2,999,1,[S]LIS Offline}\r\n');
    }


    });

    socket.on('close', () => console.log(`AutoLumo DISCONNECTED ← ${clientAddr}\n`));
    socket.on('error', (err) => console.log('Socket error:', err.message));
});

// Start TCP server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`BRIDGE IS LIVE → tcp://0.0.0.0:${PORT}`);
    console.log(`Point AutoLumo to your IP and port ${PORT}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
}); 