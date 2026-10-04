/**
 * gstatut.js — Poste un vrai STATUT DE GROUPE dans TOUS les groupes du bot.
 * Commande : .gstatut <texte>  ou  (reply à image/vidéo/audio) .gstatut <légende>
 * ⚠️ Nécessite un baileys qui connaît groupStatusMessageV2.
 */
const crypto = require('crypto');
const { proto, generateWAMessageContent, generateWAMessageFromContent, downloadContentFromMessage } = require('baileys');

function groupStatusSupported() {
    try {
        const probe = proto.Message.create({ groupStatusMessageV2: { message: { conversation: 'x' } } });
        return proto.Message.encode(probe).finish().length > 0;
    } catch (e) {
        return false;
    }
}

async function downloadMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

async function sendGroupStatus(sock, groupJid, content, bgColor) {
    const inside = await generateWAMessageContent(content, { upload: sock.waUploadToServer });
    if (bgColor && inside.extendedTextMessage) {
        inside.extendedTextMessage.backgroundArgb = (0xFF000000 | parseInt(bgColor.slice(1), 16)) >>> 0;
    }
    const messageSecret = crypto.randomBytes(32);
    const wrapped = generateWAMessageFromContent(
        groupJid,
        {
            messageContextInfo: { messageSecret },
            groupStatusMessageV2: { message: { ...inside, messageContextInfo: { messageSecret } } }
        },
        {}
    );
    await sock.relayMessage(groupJid, wrapped.message, { messageId: wrapped.key.id });
}

module.exports = {
    name: "gstatut",
    category: "owner",
    description: "📢 Poster un statut de groupe dans TOUS les groupes",
    commands: ["gstatut"],

    handler: async ({ socket, msg, args, reply, isOwner }) => {
        if (!isOwner) return reply('❌ *This command is for the bot owner only.*');
        if (!groupStatusSupported()) {
            return reply('❌ *Ta version de baileys ne supporte pas les statuts de groupe. Mets à jour baileys (npm install) puis redémarre.*');
        }

        const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const teks = (args || []).join(' ').trim() ||
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption || '';

        try {
            let content = null;
            if (quoted?.imageMessage) {
                content = { image: await downloadMedia(quoted.imageMessage, 'image'), caption: teks };
            } else if (quoted?.videoMessage) {
                content = { video: await downloadMedia(quoted.videoMessage, 'video'), caption: teks };
            } else if (quoted?.audioMessage) {
                content = { audio: await downloadMedia(quoted.audioMessage, 'audio'), mimetype: 'audio/mp4', ptt: false };
            } else if (teks) {
                content = { text: teks };
            }

            if (!content) {
                return reply('❌ *Please provide a message or reply to a media.*\nExample: .gstatut Hello everyone!');
            }

            const groups = await socket.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);
            await reply(`🚀 *Sending status to ${groupIds.length} groups...*`);

            let ok = 0;
            for (const id of groupIds) {
                try {
                    await sendGroupStatus(socket, id, content, content.text ? '#7c3aed' : null);
                    ok++;
                    await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.log(`Failed to send to: ${id} - ${err.message}`);
                }
            }
            return reply(`✅ *Status sent to ${ok}/${groupIds.length} groups!*`);
        } catch (e) {
            console.error('gstatut error:', e.message);
            return reply(`❌ *Error:* ${e.message}`);
        }
    }
};
        
