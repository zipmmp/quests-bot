const { Logger } = require('../../core/logger.js');
const { customAxiosWithProxy } = require('./axiosInstance.js');
function isValidDiscordToken(token) {
    /*   const discordTokenRegex =
           /^[A-Za-z0-9_\-]{23,28}\.[A-Za-z0-9_\-]{6}\.[A-Za-z0-9_\-]{27,38}$/;
   
       return discordTokenRegex.test(token);*/
    return token.split('.').length === 3;
}
function getIdFromToken(token) {
    try {
        const parts = token.split('.');
        const idBase64 = parts?.[0];
        const id = Buffer.from(idBase64, 'base64').toString('utf-8');
        return id;
    }
    catch (error) {
        return null;
    }
}
export async function check_token(token) {
    if (!token || typeof token !== "string") {
        Logger.warn("check_token called with invalid token");
        return false;
    }
    try {
        const api = customAxiosWithProxy(token);
        const { data } = await api.get("/users/@me");
        const isValid = Boolean(data?.id);
        if (!isValid) {
            Logger.warn("Token check failed: no user ID returned");
        }
        return isValid;
    }
    catch (err) {
        const errorMessage = err?.response?.data || err?.message || String(err);
        Logger.error(`check_token failed: ${errorMessage}`);
        return false;
    }
}
function decodeTimestampFromUrl(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    const hexTimestamp = urlParams.get('ex');
    if (hexTimestamp) {
        const timestamp = parseInt(hexTimestamp, 16); // Convert hex to decimal
        return new Date(timestamp * 1000).getTime();
        ; // Convert to milliseconds (JavaScript uses ms)
    }
    return null;
}
;
function cleanToken(token) {
    if (!token)
        return token;
    // Remove quotes only if they are at the start AND end
    if ((token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'"))) {
        return token.slice(1, -1);
    }
    return token;
}
