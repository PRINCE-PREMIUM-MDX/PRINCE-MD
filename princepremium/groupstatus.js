const { downloadContentFromMessage } = require('baileys');
const Group = require('../Prince/group');

async function downloadBuffer(mediaMsg, type) {
    const stream = await downloadContentFromMessage(mediaMsg, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

module.exports = {
    name: "groupstatus",
    category: "group",
    description: "📢 Post a text/image/video/audio as a group status",
    commands: ["groupstatus", "gcstatus", "togstatus"],

    handler: async ({ socket, msg, sender, args, reply, isGroup, isOwner }) => {
        if (!isOwner) {
            return reply(
                `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
                `*— 𝙾𝙽𝙻𝚈 𝚃𝙷𝙴 𝙱𝙾𝚃 𝙾𝚆𝙽𝙴𝚁 𝙲𝙰𝙽 𝚄𝚂𝙴.*`
            );
        }
        if (!isGroup) {
            return reply(
                `*❌ 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳.*\n\n` +
                `*— 𝚃𝙷𝙸𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳 𝙸𝚂 𝚁𝙴𝚂𝚃𝚁𝙸𝙲𝚃𝙴𝙳 𝚃𝙾 𝙶𝚁𝙾𝚄𝙿𝚂.*`
            );
        }

        try {
            const prefix = '.';
            const inputText = (args || []).join(' ').trim();

            // Message cité (reply)
            const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
            const quotedText =
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                '';

            const teks = inputText || quotedText || '';

            // Détection du média (cité ou envoyé directement avec la commande en légende)
            let media = null;
            let type = null;

            const sources = [quoted, msg?.message].filter(Boolean);
            for (const src of sources) {
                if (src.imageMessage) {
                    type = 'image';
                    media = await downloadBuffer(src.imageMessage, 'image');
                } else if (src.videoMessage) {
                    type = 'video';
                    media = await downloadBuffer(src.videoMessage, 'video');
                } else if (src.audioMessage) {
                    type = 'audio';
                    media = await downloadBuffer(src.audioMessage, 'audio');
                }
                if (media) break;
            }

            if (!media && !teks) {
                return reply(
                    `*❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝚄𝚂𝙰𝙶𝙴.*\n\n` +
                    `*— 𝚄𝚂𝙰𝙶𝙴: ${prefix}groupstatus <text>*\n` +
                    `*— 𝙾𝚁 𝚁𝙴𝙿𝙻𝚈 𝚃𝙾 𝙰𝙽 𝙸𝙼𝙰𝙶𝙴/𝚅𝙸𝙳𝙴𝙾/𝙰𝚄𝙳𝙸𝙾 𝚆𝙸𝚃𝙷 ${prefix}groupstatus <optional caption>*\n\n` +
                    `*𝙴𝚇𝙰𝙼𝙿𝙻𝙴: ${prefix}groupstatus Hello everyone!*`
                );
            }

            const groupMetadata = await Group.getGroupMetadata(socket, sender);
            const participants = (groupMetadata.participants || []).map(v => v.id);

            const contextInfo = {
                mentionedJid: participants,
                isGroupStatus: true
            };

            if (!media) {
                await socket.sendMessage(
                    sender,
                    { text: teks || 'undefined', contextInfo },
                    { backgroundColor: '#000000', statusJidList: participants }
                );
                return reply(`*✅ 𝚃𝙴𝚇𝚃 𝚂𝚄𝙲𝙲𝙴𝚂𝚂𝙵𝚄𝙻𝙻𝚈 𝚄𝙿𝙻𝙾𝙰𝙳𝙴𝙳 𝚃𝙾 𝙶𝚁𝙾𝚄𝙿 𝚂𝚃𝙰𝚃𝚄𝚂*`);
            }

            if (type === 'image') {
                await socket.sendMessage(
                    sender,
                    { image: media, caption: teks || '', contextInfo },
                    { statusJidList: participants }
                );
                return reply(`*✅ 𝙸𝙼𝙰𝙶𝙴 𝚂𝚄𝙲𝙲𝙴𝚂𝚂𝙵𝚄𝙻𝙻𝚈 𝚄𝙿𝙻𝙾𝙰𝙳𝙴𝙳 𝚃𝙾 𝙶𝚁𝙾𝚄𝙿 𝚂𝚃𝙰𝚃𝚄𝚂*`);
            }

            if (type === 'video') {
                await socket.sendMessage(
                    sender,
                    { video: media, caption: teks || '', contextInfo },
                    { statusJidList: participants }
                );
                return reply(`*✅ 𝚅𝙸𝙳𝙴𝙾 𝚂𝚄𝙲𝙲𝙴𝚂𝚂𝙵𝚄𝙻𝙻𝚈 𝚄𝙿𝙻𝙾𝙰𝙳𝙴𝙳 𝚃𝙾 𝙶𝚁𝙾𝚄𝙿 𝚂𝚃𝙰𝚃𝚄𝚂*`);
            }

            if (type === 'audio') {
                await socket.sendMessage(
                    sender,
                    { audio: media, mimetype: 'audio/mp4', ptt: false, contextInfo },
                    { statusJidList: participants }
                );
                return reply(`*✅ 𝙰𝚄𝙳𝙸𝙾 𝚂𝚄𝙲𝙲𝙴𝚂𝚂𝙵𝚄𝙻𝙻𝚈 𝚄𝙿𝙻𝙾𝙰𝙳𝙴𝙳 𝚃𝙾 𝙶𝚁𝙾𝚄𝙿 𝚂𝚃𝙰𝚃𝚄𝚂*`);
            }
        } catch (e) {
            return reply(`❌ *Error:* ${e.message}`);
        }
    }
};
