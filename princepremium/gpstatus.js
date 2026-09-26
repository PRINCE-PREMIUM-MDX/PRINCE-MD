/**
 * groupstatus.js — Publie un Statut WhatsApp (story) visible par les membres
 * du groupe où la commande est tapée.
 *
 * Usage :
 *   .groupstatus <texte>
 *   (en réponse à une image/vidéo/audio) .groupstatus <légende optionnelle>
 *   (en réponse à un texte) .groupstatus
 *
 * Alias : togstatus, gstatus
 *
 * Note technique : WhatsApp n'a pas de "statut de groupe" séparé — on publie
 * un Statut normal (status@broadcast) dont l'audience (statusJidList) est
 * limitée aux membres du groupe.
 */

function randomBackground() {
    const colors = ['#7d3c98', '#1abc9c', '#e74c3c', '#2980b9', '#e67e22', '#16a085', '#8e44ad', '#c0392b'];
    return colors[Math.floor(Math.random() * colors.length)];
}

module.exports = {
    name: "gpstatus",
    category: "group",
    description: "📢 Publier un Statut WhatsApp (texte, image, vidéo ou audio cité) visible par les membres du groupe",
    commands: ["gpstatus"],

    handler: async ({ sock, msg, m, reply, args, isGroup, groupMetadata }) => {
        if (!isGroup) {
            return reply(`👥 *Group Status*\n\nCette commande fonctionne uniquement dans un groupe.`);
        }

        const quoted = m.quoted;
        const textInput = (args || []).join(' ').trim();

        if (!quoted && !textInput) {
            return reply(`📢 *Group Status*\n\nRéponds à une image/vidéo/audio, ou donne un texte à publier.\n\nExemple : .gstatus Hello group!`);
        }

        // Audience : uniquement les membres avec un JID classique (@s.whatsapp.net)
        const participants = groupMetadata?.participants || [];
        const allIds = participants.map(p => p.id).filter(Boolean);
        const statusJidList = allIds.filter(id => id.endsWith('@s.whatsapp.net'));

        if (statusJidList.length === 0) {
            return reply(`❌ *Group Status*\n\nImpossible de récupérer la liste des membres du groupe, réessaie dans un instant.`);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: '📢', key: m.key } });

            // ==========================================
            // 1. TEXTE SIMPLE (pas de message cité)
            // ==========================================
            if (!quoted && textInput) {
                await sock.sendMessage('status@broadcast', {
                    text: textInput,
                    backgroundColor: randomBackground(),
                    font: Math.floor(Math.random() * 5)
                }, { statusJidList });
            }

            // ==========================================
            // 2. MESSAGE CITÉ (média ou texte)
            // ==========================================
            else if (quoted) {
                const mime = quoted.msg?.mimetype || '';

                // IMAGE
                if (/image/.test(mime)) {
                    const media = await quoted.download();
                    if (!media) return reply(`❌ *Group Status*\n\nÉchec du téléchargement de l'image.`);
                    await sock.sendMessage('status@broadcast', {
                        image: media,
                        caption: textInput || quoted.msg?.caption || ''
                    }, { statusJidList, backgroundColor: randomBackground() });
                }

                // VIDÉO
                else if (/video/.test(mime)) {
                    const media = await quoted.download();
                    if (!media) return reply(`❌ *Group Status*\n\nÉchec du téléchargement de la vidéo.`);
                    await sock.sendMessage('status@broadcast', {
                        video: media,
                        caption: textInput || quoted.msg?.caption || ''
                    }, { statusJidList, backgroundColor: randomBackground() });
                }

                // AUDIO
                else if (/audio/.test(mime)) {
                    const media = await quoted.download();
                    if (!media) return reply(`❌ *Group Status*\n\nÉchec du téléchargement de l'audio.`);
                    await sock.sendMessage('status@broadcast', {
                        audio: media,
                        mimetype: 'audio/mpeg',
                        ptt: !!quoted.msg?.ptt
                    }, { statusJidList });
                }

                // TEXTE CITÉ
                else if (quoted.type === 'conversation' || quoted.type === 'extendedTextMessage') {
                    const quotedText = quoted.type === 'conversation'
                        ? quoted.msg
                        : (quoted.msg?.text || '');
                    const finalText = textInput && quotedText
                        ? `${quotedText}\n\n${textInput}`
                        : (quotedText || textInput);

                    if (!finalText) {
                        return reply(`❗ *Group Status*\n\nLe message cité ne contient pas de texte.`);
                    }

                    await sock.sendMessage('status@broadcast', {
                        text: finalText,
                        backgroundColor: randomBackground(),
                        font: Math.floor(Math.random() * 5)
                    }, { statusJidList });
                }

                else {
                    return reply(`❌ *Group Status*\n\nType de média non supporté. Réponds à une image, vidéo, audio ou un texte.`);
                }
            }

            await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            return reply(`📢 *Group Status*\n\nStatut publié, visible par ${statusJidList.length} membre(s) du groupe.`);

        } catch (error) {
            console.error('Group Status Error:', error);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            return reply(`⚠️ *Group Status*\n\nÉchec : ${error.message}`);
        }
    }
};
