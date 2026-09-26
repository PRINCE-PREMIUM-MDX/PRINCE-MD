module.exports = {
    name: "gpstatus",
    category: "group",
    description: "📢 Group Status command",
    commands: ["gpstatus"],

    handler: async ({ sock, m, reply, args, isGroup, groupMetadata, sessionConfig }) => {
        if (!isGroup) {
            return reply(`👥 *Group Status*\n\nThis command can only be used in groups.`);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: '📢', key: m.key } });

            // Check if replying to a message or providing text
            const quotedMsg = m.quoted;
            const textInput = args.join(' ').trim();

            if (!quotedMsg && !textInput) {
                return reply(`📢 *Group Status*\n\nReply to an image/video/audio or provide text to post as group status.\n\nExample: ${sessionConfig.PREFIX || '!'}gstatus Hello group!`);
            }

            // PRINCE-MD has no fake "group status" message type — a real
            // WhatsApp Status is a normal Status (status@broadcast) whose
            // audience (statusJidList) is limited to the group's members.
            const participants = groupMetadata?.participants || [];
            const statusJidList = participants
                .map(p => p.id)
                .filter(id => id && id.endsWith('@s.whatsapp.net'));

            if (statusJidList.length === 0) {
                return reply(`❌ *Group Status*\n\nCouldn't fetch the group's member list, try again in a moment.`);
            }

            // ==========================================
            // 1. HANDLE TEXT STATUS (BLACK BACKGROUND)
            // ==========================================
            if (!quotedMsg && textInput) {
                await sock.sendMessage('status@broadcast', {
                    text: textInput,
                    backgroundColor: '#000000', // BLACK background
                    font: 1
                }, { statusJidList });

                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                return reply(`📢 *Group Status*\n\nText status posted!`);
            }

            // ==========================================
            // 2. HANDLE QUOTED MEDIA/TEXT
            // ==========================================
            else if (quotedMsg) {
                // Check if it's a media message
                const mime = (quotedMsg.msg || quotedMsg).mimetype || '';

                // IMAGE STATUS
                if (/image/.test(mime)) {
                    // Download image
                    let media = await quotedMsg.download();
                    if (!media) return reply(`❌ *Group Status*\n\nFailed to download the image.`);

                    // Send as image status
                    await sock.sendMessage('status@broadcast', {
                        image: media,
                        caption: textInput || quotedMsg.msg?.caption || ''
                    }, { statusJidList, backgroundColor: '#000000' });
                }

                // VIDEO STATUS
                else if (/video/.test(mime)) {
                    // Download video
                    let media = await quotedMsg.download();
                    if (!media) return reply(`❌ *Group Status*\n\nFailed to download the video.`);

                    // Send as video status
                    await sock.sendMessage('status@broadcast', {
                        video: media,
                        caption: textInput || quotedMsg.msg?.caption || ''
                    }, { statusJidList, backgroundColor: '#000000' });
                }

                // AUDIO STATUS (NEW)
                else if (/audio/.test(mime)) {
                    // Download audio
                    let media = await quotedMsg.download();
                    if (!media) return reply(`❌ *Group Status*\n\nFailed to download the audio.`);

                    // Send as audio status
                    await sock.sendMessage('status@broadcast', {
                        audio: media,
                        mimetype: 'audio/mpeg',
                        ptt: !!quotedMsg.msg?.ptt // true for voice note
                    }, { statusJidList });
                }

                // TEXT STATUS (Quoted text - BLACK BACKGROUND)
                else if (quotedMsg.type === 'conversation' || quotedMsg.type === 'extendedTextMessage') {
                    const textContent = (quotedMsg.type === 'conversation'
                        ? quotedMsg.msg
                        : quotedMsg.msg?.text) || textInput;

                    await sock.sendMessage('status@broadcast', {
                        text: textContent,
                        backgroundColor: '#000000', // BLACK background
                        font: 2
                    }, { statusJidList });

                } else {
                    return reply(`❌ *Group Status*\n\nUnsupported media type. Reply to image, video, audio, or text only.`);
                }

                await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                reply(`📢 *Group Status*\n\nStatus posted!`);
            }

        } catch (error) {
            console.error('Group Status Error:', error);
            await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            reply(`⚠️ *Group Status*\n\nFailed: ${error.message}`);
        }
    }
};
