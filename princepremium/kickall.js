const { jidNormalizedUser } = require('baileys');

module.exports = {
    name: "kickall",
    category: "group",
    description: "💥 Kick tous les membres du groupe (sauf admins & bot)",
    commands: ["kickall"],

    handler: async ({ socket, sender, args, reply, isGroup, isOwner, senderNumber }) => {
        if (!isGroup) return reply('👥 *Cette commande marche seulement en groupe.*');

        try {
            const groupId = sender;
            const groupMetadata = await socket.groupMetadata(groupId);
            const participants = groupMetadata.participants || [];

            const botJid = jidNormalizedUser(socket.user.id);
            const senderJid = senderNumber + '@s.whatsapp.net';

            // Vérif si celui qui tape la commande est admin
            const isSenderAdmin = participants.some(p => p.id === senderJid && p.admin);
            const isBotAdmin = participants.some(p => p.id === botJid && p.admin);

            if (!isOwner &&!isSenderAdmin) {
                return reply('❌ *Seuls les admins du groupe ou le owner peuvent utiliser cette commande.*');
            }

            if (!isBotAdmin) {
                return reply('❌ *Je dois être admin pour kick.*');
            }

            // Option:.kickall force -> kick même les admins (sauf bot et toi)
            const force = args[0]?.toLowerCase() === 'force';

            let toKick = participants.filter(p => p.id!== botJid && p.id!== senderJid);

            if (!force) {
                // Ne kick pas les autres admins par sécurité
                toKick = toKick.filter(p =>!p.admin);
            }

            if (toKick.length === 0) {
                return reply('✅ *Rien à kick, il ne reste que des admins/bot.*');
            }

            await reply(`⚠️ *PRINCE MD - KICKALL*\n\n👥 Groupe: ${groupMetadata.subject}\n🎯 Cibles: ${toKick.length} membres\n⏳ *Suppression en cours...*`);

            // Pour éviter le spam/ban WhatsApp
            const delay = ms => new Promise(res => setTimeout(res, ms));

            for (const member of toKick) {
                try {
                    await socket.groupParticipantsUpdate(groupId, [member.id], 'remove');
                    await delay(1000); // 1 sec entre chaque kick
                } catch (e) {
                    console.log(`Fail kick ${member.id}: ${e.message}`);
                }
            }

            return reply(`✅ *KickAll terminé.*\n🗑️ ${toKick.length} membres retirés.\n\n> *BY PRINCE PREMIUM*`);

        } catch (e) {
            return reply(`❌ *Erreur:* ${e.message}`);
        }
    }
};
