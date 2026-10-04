/**
 * gcstatus.js — Statut de groupe (groupstatus / gcstatus / togstatus)
 * À placer dans : princepremium/gcstatus.js (remplace l'ancien fichier)
 *
 * Usage :
 *   .gcstatus <texte>
 *   (en réponse à une image/vidéo/audio) .gcstatus <légende optionnelle>
 *   (en réponse à un texte) .gcstatus
 *
 * Réservé au propriétaire du bot, dans un groupe.
 */

const { generateWAMessageContent, generateMessageID } = require('baileys');

const MEDIA = {
    imageMessage: 'image',
    videoMessage: 'video',
    audioMessage: 'audio'
};

const box = (title, line) => `*${title}*\n\n*— ${line}*`;

module.exports = {
    name: 'gcstatus',
    category: 'group',
    description: '📡 Publier un statut de groupe (texte, image, vidéo, audio)',
    commands: ['gcstatus', 'groupstatus', 'togstatus'],

    handler: async ({ sock, msg, m, reply, args, isGroup, isOwner, groupMetadata, sessionConfig }) => {
        const prefix = sessionConfig?.PREFIX || '.';
        const chat = msg.key.remoteJid;

        if (!isOwner) return reply(box('❌ RESTRICTED', 'ONLY THE BOT OWNER CAN USE THIS.'));
        if (!isGroup) return reply(box('❌ RESTRICTED', 'THIS COMMAND IS RESTRICTED TO GROUPS.'));

        // Texte = arguments de la commande, sinon texte du message cité
        let teks = args.join(' ').trim();
        let media = null;
        let type = null;

        const q = m.quoted;
        if (q) {
            if (MEDIA[q.type]) {
                type = MEDIA[q.type];
                media = await q.download();
                if (!media) return reply(box('❌ ERROR', 'COULD NOT DOWNLOAD THE MEDIA.'));
            } else if (!teks) {
                teks = (q.type === 'conversation' ? q.msg : q.msg?.text) || '';
                teks = String(teks).trim();
            }
        }

        // Cas d'une image/vidéo envoyée directement avec la commande en légende
        if (!media && (m.type === 'imageMessage' || m.type === 'videoMessage')) {
            type = MEDIA[m.type];
            media = await m.download();
        }

        if (!media && !teks) {
            return reply(
                `*❌ INVALID USAGE.*\n\n` +
                `*— USAGE: ${prefix}gcstatus <text>*\n` +
                `*— OR REPLY TO AN IMAGE/VIDEO/AUDIO WITH ${prefix}gcstatus <optional caption>*\n\n` +
                `*EXAMPLE: ${prefix}gcstatus Hello everyone!*`
            );
        }

        const mentions = (groupMetadata?.participants || []).map(p => p.id);

        // Contenu du message selon le type
        let content;
        if (!media) {
            content = { text: teks, backgroundColor: '#000000' };
        } else if (type === 'audio') {
            content = { audio: media, mimetype: 'audio/mp4', ptt: false };
        } else {
            content = { [type]: media, caption: teks || '' };
        }

        try {
            // Un statut de groupe = message enveloppé dans groupStatusMessageV2,
            // envoyé directement dans le groupe.
            const inner = await generateWAMessageContent(content, {
                upload: sock.waUploadToServer
            });

            await sock.relayMessage(
                chat,
                { groupStatusMessageV2: { message: inner } },
                { messageId: generateMessageID() }
            );

            const label = !media ? 'TEXT' : type.toUpperCase();
            return reply(`*✅ ${label} SUCCESSFULLY UPLOADED TO GROUP STATUS*`);
        } catch (e) {
            console.error('gcstatus error:', e);
            return reply(box('❌ ERROR', `FAILED TO POST THE GROUP STATUS: ${e.message}`));
        }
    }
};
