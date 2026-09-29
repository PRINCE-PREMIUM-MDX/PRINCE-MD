const { cmd } = require("../princepremium");

cmd({
    pattern: "groupstatus",
    alias: ["gstatus", "poststatus", "statuspost"],
    desc: "Post text or media to WhatsApp Status",
    category: "group",
    react: "📡",
    filename: __filename
},
async (conn, mek, m, { body, reply, pushname }) => {
    try {

        const caption = body.split(" ").slice(1).join(" ");

        // TEXT STATUS
        if (!m.quoted && caption) {

            await conn.sendMessage(
                "status@broadcast",
                {
                    text:
`╭━━〔 PRINCE MD★ 〕━━⬣
┃ 👤 User : ${pushname}
┃ ⏰ Time : ${new Date().toLocaleString()}
┃
┃ 💬 Message:
┃ ${caption}
╰━━━━━━━━━━━━━━━━⬣`
                }
            );

            return reply("✅ Text status posted successfully.");
        }

        if (!m.quoted) {
            return reply(
                "❌ Reply to an image, video, audio, or sticker.\n\nExample:\n.groupstatus Hello World"
            );
        }

        const quoted = m.quoted;
        const type = quoted.mtype || '';
        const media = await quoted.download();

        // IMAGE
        if (type === 'imageMessage') {

            await conn.sendMessage(
                "status@broadcast",
                {
                    image: media,
                    caption:
`📸 KAIRO ZYNEX

👤 Posted By: ${pushname}
🕒 ${new Date().toLocaleString()}

${caption || "No Caption"}`
                }
            );

            return reply("✅ Image status posted.");
        }

        // VIDEO
        if (type === 'videoMessage') {

            await conn.sendMessage(
                "status@broadcast",
                {
                    video: media,
                    caption:
`🎥 PRINCE MD 

👤 Posted By: ${pushname}
🕒 ${new Date().toLocaleString()}

${caption || "No Caption"}`
                }
            );

            return reply("✅ Video status posted.");
        }

        // AUDIO
        if (type === 'audioMessage') {

            await conn.sendMessage(
                "status@broadcast",
                {
                    audio: media,
                    mimetype: "audio/mp4",
                    ptt: false
                }
            );

            return reply("✅ Audio status posted.");
        }

        // STICKER
        if (type === 'stickerMessage') {

            await conn.sendMessage(
                "status@broadcast",
                {
                    sticker: media
                }
            );

            return reply("✅ Sticker status posted.");
        }

        return reply("❌ Unsupported media type.");

    } catch (err) {
        console.log("GROUPSTATUS ERROR:", err);

        return reply(
`❌ KAIRO ZYNEX STATUS ERROR

${err.message}`
        );
    }
});
