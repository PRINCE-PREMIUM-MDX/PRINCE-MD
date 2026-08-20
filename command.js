/*
𝙿𝚁𝙸𝙽𝙲𝙴 𝙿𝚁𝙴𝙼𝙸𝚄𝙼 

ᴀɴʏᴡᴀʏ, ʏᴏᴜ ᴍᴜsᴛ ɢɪᴠᴇ ᴄʀᴇᴅɪᴛ ᴛᴏ ᴍʏ ᴄᴏᴅᴇ ᴡʜᴇɴ ᴄᴏᴘʏ ɪᴛ
ᴄᴏɴᴛᴀᴄᴛ ᴍᴇ ʜᴇʀᴇ +243860885022
ɢɪᴛʜᴜʙ: prince-xmd
*/
var commands = [];

function cmd(info, func) {
    var data = info;
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!info.desc) info.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!info.category) data.category = 'misc';
    if(!info.filename) data.filename = "Not Provided";
    commands.push(data);
    return data;
}
module.exports = {
    cmd,
    AddCommand:cmd,
    Function:cmd,
    Module:cmd,
    commands,
};
