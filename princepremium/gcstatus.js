/**
 * gcstatus.js — Publie un Statut WhatsApp (story) visible par les membres
 * du groupe où la commande est tapée.
 *
 * Usage :
 *   .gcstatus <texte>                         → statut texte, fond aléatoire
 *   .gcstatus #RRGGBB <texte>                  → statut texte, couleur précise
 *   (en réponse à un texte) .gcstatus          → republie ce texte en statut
 *   (en réponse à une photo) .gcstatus <légende optionnelle>
 *   (en réponse à une vidéo) .gcstatus <légende optionnelle>
 *   (en envoyant direct une photo/vidéo avec ".gcstatus <légende>" en légende)
 *
 * Fonctionnement technique : WhatsApp n'a pas de "statut de groupe" séparé —
 * ce que montre la capture (fond coloré, "Ajouté par ~Nom") est un Statut
 * normal (envoyé à status@broadcast) dont l'audience (statusJidList) est
 * limitée aux membres du groupe. C'est pour ça qu'il apparaît chez eux comme
 * mis à jour par le compte qui a exécuté la commande.
 */

const RANDOM_COLORS = [
    '#7d3c98', '#1abc9c', '#e74c3c', '#2980b9',
    '#e67e22', '#16a085', '#8e44ad', '#c0392b'
];

function randomColor() {
    return RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
}

// Sépare un éventuel "#RRGGBB" en tête des arguments du texte qui suit.
function parseColorAndText(args) {
    if (args.length && /^#[0-9a-fA-F]{6}$/.test(args[0])) {
        return { color: args[0], text: args.slice(1).join(' ') };
    }
    return { color: randomColor(), text: args.join(' ') };
}

// Détermine d'où doit venir le contenu du statut :
// 1) le message qui porte la commande lui-même (photo/vidéo envoyée avec
//    ".gcstatus ..." en légende)
// 2) le message cité (reply) — texte, photo ou vidéo
// 3) sinon rien de spécial : ce sera un statut texte à partir des args
function resolveStatusSource(m) {
    if (m?.type === 'imageMessage' || m?.type === 'videoMessage') {
        return { kind: m.type, source: m };
    }

    if (m?.quoted) {
        const qType = m.quoted.type;
        if (qType === 'imageMessage' || qType === 'videoMessage') {
            return { kind: qType, source: m.quoted };
        }
        if (qType === 'conversation' || qType === 'extendedTextMessage') {
            const quotedText = qType === 'conversation'
                ? m.quoted.msg
                : (m.quoted.msg?.text || '');
            return { kind: 'text', text: (quotedText || '').trim() };
        }
    }

    return null;
}

module.exports = {
    name: "gcstatus",
    category: "group",
    description: "📣 Publier un Statut WhatsApp (texte, photo, vidéo ou message cité) visible par les membres du groupe",
    commands: ["gcstatus"],

    handler: async ({ sock, msg, m, reply, args, isGroup, isAdmin, isOwner, groupMetadata }) => {
        if (!isGroup) return reply("❌ *Cette commande fonctionne uniquement dans un groupe !*");
        if (!isAdmin && !isOwner) return reply("❌ *Seuls les admins du groupe peuvent publier un statut de groupe !*");

        const participants = groupMetadata?.participants || [];
        // WhatsApp ne délivre un statut ciblé (statusJidList) qu'à des JIDs
        // classiques "@s.whatsapp.net". Certains membres ont un identifiant
        // "@lid" (numéro masqué) : impossible de leur envoyer un statut par ce
        // biais, WhatsApp les ignore silencieusement sans erreur. On les
        // exclut donc et on prévient l'utilisateur du nombre réellement visé.
        const allIds = participants.map(p => p.id).filter(Boolean);
        const statusJidList = allIds.filter(id => id.endsWith('@s.whatsapp.net'));
        const skippedCount = allIds.length - statusJidList.length;
        const audienceNote = skippedCount > 0
            ? `\n⚠️ *${skippedCount} membre(s) avec un numéro masqué (@lid) ne peuvent pas recevoir ce statut.*`
            : '';
        const privacyNote = `\n\nℹ️ *Si personne ne voit le statut :* sur le téléphone lié au bot, va dans WhatsApp → Paramètres → Confidentialité → Statut, et mets-le sur *"Tout le monde"*. WhatsApp bloque silencieusement les statuts envoyés à des numéros qui ne sont pas dans tes contacts si ce réglage n'est pas sur "Tout le monde".`;

        if (statusJidList.length === 0) {
            return reply("❌ *Impossible de récupérer la liste des membres du groupe, réessaie dans un instant.*");
        }

        const resolved = resolveStatusSource(m);
        const extraText = args.join(' ').trim();

        try {
            // --- Cas photo ou vidéo (envoyée directement, ou en reply) ---
            if (resolved && (resolved.kind === 'imageMessage' || resolved.kind === 'videoMessage')) {
                const buffer = await resolved.source.download();
                if (!buffer) return reply("❌ *Échec du téléchargement du média.*");

                const mediaField = resolved.kind === 'imageMessage' ? 'image' : 'video';
                await sock.sendMessage('status@broadcast', {
                    [mediaField]: buffer,
                    caption: extraText || ''
                }, {
                    statusJidList,
                    backgroundColor: randomColor(),
                    // Sans "broadcast: true", Baileys n'envoie pas toujours réellement
                    // le contenu comme un Statut ciblé à statusJidList : l'appel peut
                    // réussir sans erreur mais rien n'apparaît chez les destinataires.
                    broadcast: true
                });

                const label = resolved.kind === 'imageMessage' ? 'image' : 'vidéo';
                return reply(`✅ *Statut ${label} publié, visible par les ${statusJidList.length} membre(s) du groupe.*${audienceNote}${privacyNote}`);
            }

            // --- Cas texte cité (reply à un message texte), + texte ajouté en option ---
            if (resolved && resolved.kind === 'text') {
                if (!resolved.text && !extraText) {
                    return reply("❗ *Le message cité ne contient pas de texte.*");
                }
                const { color } = parseColorAndText(args); // ne garde que la couleur ici
                const finalText = extraText && resolved.text
                    ? `${resolved.text}\n\n${extraText}`
                    : (resolved.text || extraText);

                await sock.sendMessage('status@broadcast', {
                    text: finalText,
                    backgroundColor: color,
                    font: Math.floor(Math.random() * 5)
                }, { statusJidList, broadcast: true });

                return reply(`✅ *Statut publié, visible par les ${statusJidList.length} membre(s) du groupe.*${audienceNote}${privacyNote}`);
            }

            // --- Cas par défaut : statut texte simple à partir des args ---
            const { color, text } = parseColorAndText(args);
            if (!text.trim()) {
                return reply(
                    "❗ *Donne un texte, réponds à un message, ou envoie une photo/vidéo avec la commande en légende.*\n\n" +
                    "*Exemples :*\n" +
                    "▸ .gcstatus On se voit ce soir 🎉\n" +
                    "▸ .gcstatus #1abc9c Réunion à 20h\n" +
                    "▸ (en réponse à un message) .gcstatus\n" +
                    "▸ (en réponse à une photo/vidéo) .gcstatus Légende ici"
                );
            }

            await sock.sendMessage('status@broadcast', {
                text,
                backgroundColor: color,
                font: Math.floor(Math.random() * 5)
            }, { statusJidList, broadcast: true });

            return reply(`✅ *Statut publié, visible par les ${statusJidList.length} membre(s) du groupe.*${audienceNote}${privacyNote}`);
        } catch (e) {
            console.error('gcstatus error:', e.message);
            return reply(`❌ *Échec de la publication du statut :* ${e.message}`);
        }
    }
};
