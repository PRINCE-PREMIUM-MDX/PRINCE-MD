/**
 * gstatus.js — Poste un "Group Status" (groupStatusMessageV2) directement
 * dans le groupe où la commande est tapée.
 *
 * Commandes : .groupstatus / .togstatus / .gstatus
 *
 * Usage :
 *   .gstatus <texte>                → statut texte, fond noir
 *   (en réponse à une image)        .gstatus <légende optionnelle>
 *   (en réponse à une vidéo)        .gstatus <légende optionnelle>
 *   (en réponse à un audio)         .gstatus
 *   (en réponse à un texte)         .gstatus
 */

function generateMessageId() {
    return '3EB0' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = {
    name: "gstatus",
    category: "group",
    description: "📢 Poster un Group Status (texte, image, vidéo ou audio cité) dans le groupe",
    commands: ["groupstatus", "togstatus", "gstatus"],

    handler: async ({ sock, m, reply, args, isGroup }) => {
        if (!isGroup) {
            return reply(`👥 *Group Status*\n\nThis command can only be used in groups.`);
        }

        try {
            await m.react('📢');

            const quotedMsg = m.quoted;
            const textInput = args.join(' ').trim();

            if (!quotedMsg && !textInput) {
                return reply(`📢 *Group Status*\n\nReply to an image/video/audio or provide text to post as group status.\n\nExample: .gstatus Hello group!`);
            }

            let statusInnerMessage = {};

            // ==========================================
            // 1. HANDLE TEXT STATUS (BLACK BACKGROUND)
            // ==========================================
            if (!quotedMsg && textInput) {
                statusInnerMessage = {
                    extendedTextMessage: {
                        text: textInput,
                        backgroundArgb: 0xFF000000, // BLACK background
                        textArgb: 0xFFFFFFFF, // White text
                        font: 1,
                        contextInfo: {
                            mentionedJid: [],
                            isGroupStatus: true
                        }
                    }
                };

                const statusPayload = {
                    groupStatusMessageV2: {
                        message: statusInnerMessage
                    }
                };

                const statusId = generateMessageId();
                await sock.sendMessage(m.chat, statusPayload, { messageId: statusId });

                await m.react('✅');
                return reply(`📢 *Group Status*\n\nText status posted!`);
            }

            // ==========================================
            // 2. HANDLE QUOTED MEDIA/TEXT
            // ==========================================
            else if (quotedMsg) {
                const qType = quotedMsg.type;

                // IMAGE STATUS
                if (qType === 'imageMessage') {
                    let media = await quotedMsg.download();

                    await sock.sendMessage(m.chat, {
                        image: media,
                        caption: textInput || quotedMsg.msg?.caption || '',
                        contextInfo: { isGroupStatus: true }
                    });
                }

                // VIDEO STATUS
                else if (qType === 'videoMessage') {
                    let media = await quotedMsg.download();

                    await sock.sendMessage(m.chat, {
                        video: media,
                        caption: textInput || quotedMsg.msg?.caption || '',
                        contextInfo: { isGroupStatus: true }
                    });
                }

                // AUDIO STATUS
                else if (qType === 'audioMessage') {
                    let media = await quotedMsg.download();

                    await sock.sendMessage(m.chat, {
                        audio: media,
                        mimetype: 'audio/mpeg',
                        ptt: false, // true for voice note
                        contextInfo: { isGroupStatus: true }
                    });
                }

                // TEXT STATUS (Quoted text - BLACK BACKGROUND)
                else if (qType === 'conversation' || qType === 'extendedTextMessage') {
                    const textContent = qType === 'conversation'
                        ? quotedMsg.msg
                        : (quotedMsg.msg?.text || textInput);

                    statusInnerMessage = {
                        extendedTextMessage: {
                            text: textContent,
                            backgroundArgb: 0xFF000000, // BLACK background
                            textArgb: 0xFFFFFFFF, // White text
                            font: 2,
                            contextInfo: {
                                mentionedJid: [],
                                isGroupStatus: true
                            }
                        }
                    };

                    const statusPayload = {
                        groupStatusMessageV2: {
                            message: statusInnerMessage
                        }
                    };

                    const statusId = generateMessageId();
                    await sock.relayMessage(m.chat, statusPayload, { messageId: statusId });

                } else {
                    return reply(`❌ *Group Status*\n\nUnsupported media type. Reply to image, video, audio, or text only.`);
                }

                await m.react('✅');
                return reply(`📢 *Group Status*\n\nStatus posted!`);
            }

        } catch (error) {
            console.error('Group Status Error:', error);
            await m.react('❌');
            return reply(`⚠️ *Group Status*\n\nFailed: ${error.message}`);
        }
    }
};
