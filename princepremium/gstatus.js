/**
 * gstatus.js — Poste un "Group Status" dans le groupe où la commande est tapée.
 *
 * Commandes : .groupstatus / .gcstatus / .togstatus / .gstatus
 *
 * Usage :
 *   .gstatus <texte>                    → statut texte, fond noir
 *   (image/vidéo + légende .gstatus)    → statut média
 *   (réponse à image/vidéo/audio)       .gstatus <légende optionnelle>
 *
 * Réservé aux admins du groupe (et au owner).
 * Remplace l'ancien princepremium/gstatus.js (mêmes commandes).
 */

const { downloadMediaMessage } = require('baileys');

module.exports = {
    name: 'gstatus',
    category: 'group',
    description: '📢 Poster un Group Status (texte, image, vidéo ou audio)',
    commands: ['groupstatus', 'gcstatus', 'togstatus', 'gstatus'],

    handler: async ({ sock, msg, args, reply, isGroup, isAdmin, isOwner, groupMetadata, command }) => {
        const from = msg.key.remoteJid;

        const react = (emoji) =>
            sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {});

        if (!isGroup) return reply('👥 *Group Status*\n\nCette commande est réservée aux groupes.');
        if (!isAdmin && !isOwner) return reply('❌ *Seuls les admins peuvent utiliser cette commande !*');

        await react('📢');

        try {
            // Déballe les messages éphémères / view-once éventuels
            let content = msg.message || {};
            if (content.ephemeralMessage) content = content.ephemeralMessage.message || content;
            if (content.viewOnceMessage) content = content.viewOnceMessage.message || content;

            const directIm = content.imageMessage;
            const directVm = content.videoMessage;
            const directAm = content.audioMessage;
            const isDirect = !!(directIm || directVm || directAm);

            const ctx =
                content.extendedTextMessage?.contextInfo ||
                directIm?.contextInfo ||
                directVm?.contextInfo ||
                directAm?.contextInfo;
            const quotedMsgObj = ctx?.quotedMessage;

            const im = directIm || quotedMsgObj?.imageMessage;
            const vm = directVm || quotedMsgObj?.videoMessage;
            const am = directAm || quotedMsgObj?.audioMessage;
            const caption = args.join(' ').trim();

            if (!im && !vm && !am && !caption) {
                await react('❗');
                return reply(
                    `❗ *Usage :* .${command} <texte>\n` +
                    `Ou mets .${command} en légende d'une image/vidéo, ` +
                    `ou réponds à un média avec .${command} <légende optionnelle>`
                );
            }

            let meta = groupMetadata;
            if (!meta?.participants) meta = await sock.groupMetadata(from);
            const participants = (meta?.participants || []).map((p) => p.id);

            // ---------- Statut texte ----------
            if (!im && !vm && !am) {
                await sock.sendMessage(
                    from,
                    {
                        text: caption,
                        contextInfo: { mentionedJid: participants, isGroupStatus: true },
                    },
                    { backgroundColor: '#000000', statusJidList: participants }
                );
                await react('✅');
                return reply('🎉 Group Status posté avec succès !');
            }

            // ---------- Téléchargement du média ----------
            let buf;
            if (isDirect) {
                buf = await downloadMediaMessage(msg, 'buffer', {}, {
                    logger: undefined,
                    reuploadRequest: sock.updateMediaMessage,
                });
            } else {
                const fakeMsg = {
                    key: {
                        remoteJid: from,
                        id: ctx?.stanzaId || 'GCSTATUS',
                        fromMe: false,
                        participant: ctx?.participant,
                    },
                    message: im ? { imageMessage: im } : vm ? { videoMessage: vm } : { audioMessage: am },
                };
                buf = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
                    logger: undefined,
                    reuploadRequest: sock.updateMediaMessage,
                });
            }

            if (!buf || !buf.length) throw new Error('Impossible de télécharger le média.');

            // ---------- Envoi ----------
            const contextInfo = { mentionedJid: participants, isGroupStatus: true };

            if (im) {
                await sock.sendMessage(from, { image: buf, caption, contextInfo }, { statusJidList: participants });
            } else if (vm) {
                await sock.sendMessage(from, { video: buf, caption, contextInfo }, { statusJidList: participants });
            } else if (am) {
                await sock.sendMessage(
                    from,
                    { audio: buf, mimetype: 'audio/mp4', ptt: false, contextInfo },
                    { statusJidList: participants }
                );
            }

            await react('✅');
            return reply('🎉 Group Status posté avec succès !');
        } catch (e) {
            console.error('GroupStatus Error:', e);
            await react('❌');
            return reply(`❌ ${e.message}`);
        }
    },
};
