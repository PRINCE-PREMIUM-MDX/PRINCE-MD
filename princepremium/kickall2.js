module.exports = {
  name: "kickall2",
  category: "group",
  description: "Kick tous les membres sauf admins",
  commands: ["kickall2", "kickall"],

  handler: async ({ sock, msg, reply, isGroup, isBotAdmin, isAdmin, isOwner, groupMetadata }) => {
    if (!isGroup) return reply("❌ *Commande pour groupe seulement!*");
    if (!isAdmin &&!isOwner) return reply("❌ *Seuls les admins peuvent utiliser ça!*");
    if (!isBotAdmin) return reply("❌ *Je dois être admin pour kicker!*");

    try {
      const participants = groupMetadata.participants;
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      // Liste des admins
      const admins = participants.filter(p => p.admin!== null).map(p => p.id);

      // On kick seulement les non-admins et pas le bot
      const toKick = participants
       .filter(p =>!admins.includes(p.id) && p.id!== botJid)
       .map(p => p.id);

      if (toKick.length === 0) return reply("✅ *Aucun membre à kicker, il ne reste que des admins.*");

      reply(`⚠️ *Kickall2 lancé... ${toKick.length} membres vont être retirés!*`);

      for (let id of toKick) {
        await sock.groupParticipantsUpdate(msg.key.remoteJid, [id], "remove");
        await new Promise(r => setTimeout(r, 1000)); // 1s de pause pour éviter ban
      }

      return reply(`✅ *Terminé! ${toKick.length} membres kickés.*`);
    } catch (e) {
      return reply(`❌ Erreur: ${e.message}`);
    }
  },
};
