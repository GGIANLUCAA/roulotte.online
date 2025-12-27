const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://roulotte-online-foto.onrender.com';

// Un piccolo PNG 1x1 rosso valido
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_BUFFER = Buffer.from(PNG_BASE64, 'base64');

async function runTest() {
    console.log(`=== INIZIO TEST AUTONOMO INSERIMENTO ROULOTTE CON FOTO REALE (SU ${BASE_URL}) ===`);

    try {
        // 1. LOGIN
        console.log("1. Tentativo Login Admin...");
        let adminUser = 'admin';
        let adminPass = 'admin123';
        
        try {
            const envFile = fs.readFileSync(path.join(__dirname, 'backend', '.env'), 'utf8');
            const userMatch = envFile.match(/ADMIN_USER=(.*)/);
            const passMatch = envFile.match(/ADMIN_PASS=(.*)/);
            if (userMatch) adminUser = userMatch[1].trim();
            if (passMatch) adminPass = passMatch[1].trim();
        } catch (e) {
            console.log("Nessun file .env trovato, uso default.");
        }

        console.log(`Tentativo Login con user: ${adminUser}`);
        
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: adminUser, password: adminPass })
        });

        if (!loginRes.ok) {
            const txt = await loginRes.text();
            throw new Error(`Login fallito: ${loginRes.status} - ${txt}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Login OK. Token ricevuto.");

        // 2. CREAZIONE ROULOTTE CON FOTO
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        
        // Costruiamo il body multipart come Buffer per supportare dati binari
        const parts = [];

        function addPart(name, value) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
        }

        function addFilePart(name, filename, mime, buffer) {
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`));
            parts.push(buffer);
            parts.push(Buffer.from(`\r\n`));
        }

        addPart('marca', 'TEST_FOTO_R2');
        addPart('modello', 'MODELLO_CON_FOTO');
        addPart('prezzo', '9999');
        addPart('anno', '2025');
        addPart('descrizione', 'Test caricamento foto su R2');
        addPart('stato', 'nuovo');

        // Aggiungo il file immagine reale
        addFilePart('photos', 'test-image.png', 'image/png', PNG_BUFFER);

        // Chiusura boundary
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        const bodyBuffer = Buffer.concat(parts);

        console.log("Invio richiesta creazione roulotte con FOTO...");

        const createRes = await fetch(`${BASE_URL}/api/roulottes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length
            },
            body: bodyBuffer
        });

        let createData;
        try {
            const txt = await createRes.text();
            try {
                createData = JSON.parse(txt);
            } catch {
                throw new Error(`Risposta non JSON: ${txt}`);
            }
        } catch (e) {
            throw new Error(`Errore lettura risposta creazione: ${e.message}`);
        }

        if (!createRes.ok) {
             throw new Error(`Creazione fallita: ${createRes.status} - ${JSON.stringify(createData)}`);
        }

        console.log("Creazione Roulotte OK:", createData);

        if (createData && createData.id) {
            const newId = createData.id;
            console.log(`Roulotte creata con ID: ${newId}`);

            // 3. VERIFICA PRESENZA FOTO (GET)
            console.log("Verifica presenza foto...");
            const listRes = await fetch(`${BASE_URL}/api/roulottes`);
            const listData = await listRes.json();
            const item = listData.find(r => r.id === newId);

            if (item) {
                console.log("Roulotte trovata nell'elenco.");
                console.log("Foto associate:", item.photos);
                
                // item.photos dovrebbe essere un array di URL (o null se vuoto, ma il backend fa json_agg)
                // In server.js: COALESCE((SELECT json_agg(...) ...), '[]'::json)
                // Quindi sarà un array.
                
                if (Array.isArray(item.photos) && item.photos.length > 0) {
                    console.log(`SUCCESSO: Trovate ${item.photos.length} foto.`);
                    console.log(`URL Foto 1: ${item.photos[0]}`);
                    
                    // Verifica se l'URL è raggiungibile (opzionale, ma utile per CORS check)
                    try {
                        console.log("Verifica accessibilità URL foto...");
                        const imgRes = await fetch(item.photos[0]);
                        if (imgRes.ok) {
                            console.log("Foto scaricabile correttamente!");
                        } else {
                            console.error(`Foto non scaricabile: ${imgRes.status}`);
                        }
                    } catch (e) {
                        console.error("Errore fetch foto (possibile CORS o DNS):", e.message);
                    }

                } else {
                    console.error("ATTENZIONE: Nessuna foto trovata nell'oggetto restituito.");
                }
            } else {
                console.error("ERRORE: Roulotte non trovata nell'elenco dopo la creazione.");
            }

            // 4. ELIMINAZIONE (PULIZIA)
            console.log("Pulizia: Eliminazione roulotte di test...");
            const deleteRes = await fetch(`${BASE_URL}/api/roulottes/${newId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!deleteRes.ok) {
                console.error("Eliminazione fallita");
            } else {
                console.log("Eliminazione OK.");
            }
        }

        console.log("=== TEST COMPLETATO ===");

    } catch (error) {
        console.error("ERRORE CRITICO NEL TEST:", error.message);
    }
}

runTest();
