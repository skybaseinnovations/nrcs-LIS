const net = require('net');
const axios = require('axios');
require('dotenv').config();

const PORT = process.env.PORT || 6666;
const SYSTEM_ID = process.env.SYSTEM_ID || 'TESTLAB';
const CLOUD_URL = process.env.CLOUD_LARAVEL_URL || 'http://localhost:8000/api/autolumo';

// ASCII Art Banner
console.log('\x1b[36m');
console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                           ║');
console.log('║   ███████╗██╗  ██╗██╗   ██╗██████╗  █████╗ ███████╗███████╗              ║');
console.log('║   ██╔════╝██║ ██╔╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝              ║');
console.log('║   ███████╗█████╔╝  ╚████╔╝ ██████╔╝███████║███████╗█████╗                ║');
console.log('║   ╚════██║██╔═██╗   ╚██╔╝  ██╔══██╗██╔══██║╚════██║██╔══╝                ║');
console.log('║   ███████║██║  ██╗   ██║   ██████╔╝██║  ██║███████║███████╗              ║');
console.log('║   ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝              ║');
console.log('║                                                                           ║');
console.log('║              🛰️  AutoLumo Medical Bridge Protocol v2.1  🛰️               ║');
console.log('║                                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
console.log('\x1b[0m');

console.log('\x1b[33m⚡ SYSTEM INITIALIZATION\x1b[0m');
console.log(`📡 TCP Port      : \x1b[32m${PORT}\x1b[0m`);
console.log(`🏷️  System ID    : \x1b[32m${SYSTEM_ID}\x1b[0m`);
console.log(`☁️  Cloud Target : \x1b[32m${CLOUD_URL}\x1b[0m`);
console.log('\x1b[90m' + '─'.repeat(75) + '\x1b[0m\n');

let connectionCount = 0;
let messageCount = 0;

const server = net.createServer((socket) => {
    connectionCount++;
    const clientAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    const connId = `CONN-${connectionCount}`;
    
    console.log(`\x1b[32m▲ ${connId}\x1b[0m AutoLumo CONNECTED → \x1b[36m${clientAddr}\x1b[0m`);

    socket.on('data', async (data) => {
        messageCount++;
        const rawMessage = data.toString().trim();
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`\x1b[90m[${timestamp}]\x1b[0m \x1b[35m⬇ MSG-${messageCount}\x1b[0m FROM ANALYZER`);
        console.log(`   \x1b[90m${rawMessage}\x1b[0m`);

        // QUICK AUTO-REPLY FOR TESTING — REMOVE LATER
        if (rawMessage.startsWith('{1,')) {
            const parts = rawMessage.slice(1, -1).split(',');
            const sn = parts[1];
            const sampleNo = parts[3];
            const reply = `{2,${sn},0,${sampleNo},1,0,P001,[S]Test],[S]Patient],1,35,[S],[S],[S],[S],[S]2025/11/26],[S],[S],1,TSH,1}`;
            socket.write(reply + '\r\n');
            console.log(`   \x1b[34m⬆ RESPONSE\x1b[0m TO ANALYZER`);
            console.log(`   \x1b[90m${reply}\x1b[0m\n`);
            return;
        }

        // Forward to cloud Laravel
        try {
            console.log(`   \x1b[33m☁️  Forwarding to cloud...\x1b[0m`);
            
            const response = await axios.post(
                CLOUD_URL,
                rawMessage,
                {
                    timeout: 15000,
                    headers: {
                        'Content-Type': 'text/plain',
                        'X-API-KEY': 'asdkfbjJHVsfajhdJHVSFkajsdj'
                    }
                }
            );

            const reply = response.data || '';
            
            // Check if response is JSON with status field
            let jsonResponse;
            try {
                jsonResponse = typeof reply === 'string' ? JSON.parse(reply) : reply;
            } catch (e) {
                jsonResponse = null;
            }

            if (jsonResponse && typeof jsonResponse.status !== 'undefined') {
                if (jsonResponse.status === true) {
                    console.log(`   \x1b[32m✓ SUCCESS\x1b[0m`);
                    if (jsonResponse.message) {
                        console.log(`   \x1b[32m→ ${jsonResponse.message}\x1b[0m`);
                    }
                } else {
                    console.log(`   \x1b[31m✗ FAILED\x1b[0m`);
                    if (jsonResponse.message) {
                        console.log(`   \x1b[31m→ ${jsonResponse.message}\x1b[0m`);
                    }
                }
            } else {
                console.log(`   \x1b[32m✓ Cloud response received\x1b[0m`);
            }

            if (reply) {
                socket.write(reply + '\r\n');
                console.log(`   \x1b[34m⬆ RESPONSE\x1b[0m TO ANALYZER`);
                console.log(`   \x1b[90m${typeof reply === 'string' ? reply : JSON.stringify(reply)}\x1b[0m\n`);
            }
        } catch (err) {
            const msg = err.response?.data || err.message;
            console.error(`   \x1b[31m✗ CLOUD ERROR:\x1b[0m ${msg}`);
            socket.write('{2,999,1,[S]LIS Offline}\r\n');
            console.log(`   \x1b[31m⬆ ERROR RESPONSE\x1b[0m TO ANALYZER\n`);
        }
    });

    socket.on('close', () => {
        console.log(`\x1b[31m▼ ${connId}\x1b[0m AutoLumo DISCONNECTED ← \x1b[36m${clientAddr}\x1b[0m`);
        console.log('\x1b[90m' + '─'.repeat(75) + '\x1b[0m\n');
    });
    
    socket.on('error', (err) => {
        console.log(`\x1b[31m⚠ Socket error [${connId}]:\x1b[0m ${err.message}`);
    });
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log('\x1b[31m✗ ERROR: Port ${PORT} is already in use!\x1b[0m');
        console.log('\x1b[33m💡 Solutions:\x1b[0m');
        console.log('   1. Kill the existing process:');
        console.log(`      \x1b[90mlsof -ti:${PORT} | xargs kill -9\x1b[0m`);
        console.log('   2. Use a different port:');
        console.log('      \x1b[90mPORT=6667 node skybase.js\x1b[0m');
        console.log('   3. Find what\'s using the port:');
        console.log(`      \x1b[90mlsof -i :${PORT}\x1b[0m\n`);
        process.exit(1);
    } else {
        console.error('\x1b[31m✗ Server error:\x1b[0m', err.message);
        process.exit(1);
    }
});

// Start TCP server
server.listen(PORT, '0.0.0.0', () => {
    console.log('\x1b[32m✓ SKYBASE BRIDGE IS LIVE\x1b[0m');
    console.log(`\x1b[36m→ Listening on tcp://0.0.0.0:${PORT}\x1b[0m`);
    console.log(`\x1b[33m→ Point your AutoLumo analyzer to this IP:PORT\x1b[0m`);
    console.log('\x1b[90m' + '─'.repeat(75) + '\x1b[0m');
    console.log('\x1b[90mPress CTRL+C to shutdown\x1b[0m\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m⚠ Shutdown signal received\x1b[0m');
    console.log('\x1b[90mClosing connections...\x1b[0m');
    server.close(() => {
        console.log('\x1b[32m✓ SKYBASE Bridge shutdown complete\x1b[0m');
        console.log('\x1b[36m👋 See you space cowboy...\x1b[0m\n');
        process.exit(0);
    });
});