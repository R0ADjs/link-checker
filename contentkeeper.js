const fs = require("fs");
const path = require("path");
const { fetchURL } = require("../fetch.js");
const ckjson = JSON.parse(fs.readFileSync(path.join(__dirname, 'json/contentkeeper.json'), 'utf8'));
async function contentkeeper(url) {
    try {
        const CLASSIFICATION_SERVER = "http://e.cc328a.ep.contentkeeper.net";
        const PUBLIC_KEY = "QgXn7Km";
        const PASSWORD_PREFIX = "fZHBT]4Jt]&BF*<hp'&Q";
        const PASSWORD = Buffer.from(PASSWORD_PREFIX + PUBLIC_KEY, "utf8");


        function deriveKeyAndIv(password, salt) {
            let derived = Buffer.alloc(0);
            let prev = Buffer.alloc(0);
            while (derived.length < 48) {
                const md5 = crypto.createHash("md5");
                md5.update(Buffer.concat([prev, password, salt]));
                prev = md5.digest();
                derived = Buffer.concat([derived, prev]);
            }
            return {
                key: derived.slice(0, 32),
                iv: derived.slice(32, 48),
            };
        }


        function encryptOpenSSL(data) {
            const salt = crypto.randomBytes(8);
            const {
                key,
                iv
            } = deriveKeyAndIv(PASSWORD, salt);
            const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
            const padded = Buffer.concat([
                cipher.update(Buffer.from(data, "utf8")),
                cipher.final(),
            ]);
            return Buffer.concat([
                Buffer.from("Salted__"),
                salt,
                padded,
            ]).toString("base64");
        }


        function decryptOpenSSL(encryptedB64) {
            const encrypted = Buffer.from(encryptedB64, "base64");
            if (encrypted.toString("utf8", 0, 8) !== "Salted__") {
                throw new Error("Invalid encrypted data: missing OpenSSL salt marker.");
            }
            const salt = encrypted.slice(8, 16);
            const ciphertext = encrypted.slice(16);
            const {
                key,
                iv
            } = deriveKeyAndIv(PASSWORD, salt);
            const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);
            return decrypted.toString("utf8");
        }
        const dummyEmail = "test@test.com";
        const urlWithoutProtocol = url.replace(/^https?:\/\//, "");
        const payload = `<a>${dummyEmail}</a><i>1</i><os>1</os><c>${urlWithoutProtocol}</c>`;
        const encryptedPayload = encryptOpenSSL(payload);
        const finalUrl = `${CLASSIFICATION_SERVER}/?sPol=<e>${PUBLIC_KEY}</e><g>${encryptedPayload}</g>`;
        const res = await fetchURL(finalUrl, {
            timeout: 10000
        });
        const encryptedResponse = await res.text();
        const decrypted = decryptOpenSSL(encryptedResponse);
        let ogjson = JSON.parse(decrypted);
        let blocked;
        let category;
        if (ogjson.catDesc != null) {
            blocked = true;
            category = ogjson.catDesc;
        } else {
            blocked = false;
            category = "ContentKeeper";
        }
        let json = {
            blocked: blocked,
            category: category
        }
        return json;
    } catch (err) {
        console.warn("ContentKeeper Error: " + err);
        return `Error`;
    }
}
module.exports = {contentkeeper};
