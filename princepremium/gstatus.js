/**
 * gstatus.js — Poste un Statut WhatsApp (status@broadcast) : texte, image,
 * vidéo, audio ou sticker.
 *
 * Commandes : .groupstatus / .gstatus / .poststatus / .statuspost
 *
 * Usage :
 *   .gstatus <texte>                       → statut texte
 *   (en réponse à une image)  .gstatus <légende optionnelle>
 *   (en réponse à une vidéo)  .gstatus <légende optionnelle>
 *   (en réponse à un audio)   .gstatus
 *   (en réponse à un sticker) .gstatus
 */

module.exports = {
    name: "gstatus",
    category: "group",
    description: "📡 Poster un Statut WhatsApp (texte, image, vidéo, audio ou sticker cité)",
    commands: ["groupstatus", "gstatus", "poststatus", "statuspost"],

    handler: async ({ sock, m, reply, args }) => {
        try {
            await m.react('📡');

            const caption = args.join(' ').trim();
            const quoted = m.quoted;

            // ==========================================
            // TEXTE
            // ==========================================
            if (!quoted && caption) {
                await sock.sendMessage("status@broadcast", {
                    text:
`╭━━〔 PRINCE MD 〕━━⬣
┃ 👤 User : ${m.pushName || 'Guest'}
┃ ⏰ Time : ${new Date().toLocaleString()}
┃
┃ 💬 Message:
┃ ${caption}
╰━━━━━━━━━━━━━━━━⬣`
                });

                await m.react('✅');
                return reply("✅ Text status posted successfully.");
            }

            if (!quoted) {
                return reply(
                    "❌ Reply to an image, video, audio, or sticker.\n\nExample:\n.gstatus Hello World"
                );
            }

            const type = quoted.type || '';
            const media = await quoted.download();

            // ==========================================
            // IMAGE
            // ==========================================
            if (type === 'imageMessage') {
                await sock.sendMessage("status@broadcast", {
                    image: media,
                    caption:
`📸 PRINCE MD

👤 Posted By: ${m.pushName || 'Guest'}
🕒 ${new Date().toLocaleString()}

${caption || "No Caption"}`
                });

                await m.react('✅');
                return reply("✅ Image status posted.");
            }

            // ==========================================
            // VIDÉO
            // ==========================================
            if (type === 'videoMessage') {
                await sock.sendMessage("status@broadcast", {
                    video: media,
                    caption:
`🎥 PRINCE MD

👤 Posted By: ${m.pushName || 'Guest'}
🕒 ${new Date().toLocaleString()}

${caption || "No Caption"}`
                });

                await m.react('✅');
                return reply("✅ Video status posted.");
            }

            // ==========================================
            // AUDIO
            // ==========================================
            if (type === 'audioMessage') {
                await sock.sendMessage("status@broadcast", {
                    audio: media,
                    mimetype: "audio/mp4",
                    ptt: false
                });

                await m.react('✅');
                return reply("✅ Audio status posted.");
            }

            // ==========================================
            // STICKER
            // ==========================================
            if (type === 'stickerMessage') {
                await sock.sendMessage("status@broadcast", {
                    sticker: media
                });

                await m.react('✅');
                return reply("✅ Sticker status posted.");
            }

            return reply("❌ Unsupported media type.");

        } catch (err) {
            console.error("GSTATUS ERROR:", err);
            await m.react('❌');
            return reply(
`❌ PRINCE MD STATUS ERROR

${err.message}`
            );
        }
    }
};
