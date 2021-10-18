const { PREFIX } = require('../util/lechsbottUtil')
const { roleColor } = require('../util/lechsbottFunctions')

module.exports = {
    name: 'ban',
    aliases: ['unban', 'pardon', 'kick'],
    description: 'ban',
    async execute(client, message, args, cmd, Discord) {
        const user = message.author;
        let member
        if (message.mentions.members.first()) {
            member = message.mentions.members.first()
        } else if (args[0]) {
            member = await message.guild.members.cache.get(args[0])
        }

        if(!member){
            member = args[0]
        }

        if (cmd === 'ban') {

            if (!message.member.permissions.has("BAN_MEMBERS")) {
                let permembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**You need to** \`Ban Members\` **permission to ban a member!**`)
                return message.channel.send({ embeds: [permembed] })
            }

            if (!message.guild.me.permissions.has('BAN_MEMBERS')) {
                const embed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**Lechsbott needs to** \`Ban Members\` **permission to ban a member!**`)
                return message.channel.send({ embeds: [embed] });
            }

            if (!member) {
                let membembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setAuthor(`Please mention a member for ban!`, user.displayAvatarURL({ dynamic: true }))
                    .addField(`Usage`, `${PREFIX}${cmd} <@User>`)
                return message.channel.send({ embeds: [membembed] })
            }

            const reason = args.slice(1).join(" ") || `No reason`
            const d = new Date()

            function fixTime(time) {
                return time < 10 ? `0${time}` : time;
            }

            const fulldate = `${d.getFullYear()}/${d.getMonth()}/${d.getDate()} at ${fixTime(d.getHours())}:${fixTime(d.getMinutes())}:${fixTime(d.getSeconds())}`

            if (typeof member === 'string') {
                try {
                    message.guild.bans.create(member)

                    let succesembed = new Discord.MessageEmbed()
                        .setColor(roleColor(message))
                        .setDescription(`**${member}** banned from server by **<@${message.author.id}>**`)
                        .addField(`Reason`, reason, true)
                        .addField(`At`, fulldate, true)
                    return message.channel.send({ embeds: [succesembed] })
                } catch (e) {

                    console.log(e)

                    let embed = new Discord.MessageEmbed()
                        .setColor(roleColor(message))
                        .setDescription(`There was an error while banning the member, please try later!`)
                    message.channel.send({ embeds: [embed] })

                }
            }

            if (message.member.id !== message.guild.ownerId && message.member.id !== message.guild.ownerId && message.member.roles.highest.position <= member.roles.highest.position) {
                let erembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`You can't do that because you **either have the same role** or **your role is lower** from ${member}`)
                return message.channel.send({ embeds: [erembed] })
            }


            try {

                member.ban({ reason })

                let succesembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**<@${member.id}>** banned from server by **<@${message.author.id}>**`)
                    .addField(`Reason`, reason, true)
                    .addField(`At`, fulldate, true)
                message.channel.send({ embeds: [succesembed] })

            } catch (e) {
                console.log(e)

                let embed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`There was an error while banning the member, please try later!`)
                message.channel.send({ embeds: [embed] })
            }


        }
        else if (cmd === 'kick') {

            if (!message.member.permissions.has("KICK_MEMBERS")) {
                let permembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**You need to** \`Kick Members\` **permission to ban a member!**`)
                return message.channel.send({ embeds: [permembed] })
            }

            if (!message.guild.me.permissions.has('BAN_MEMBERS')) {
                const embed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**Lechsbott needs to** \`Kick Members\` **permission to ban a member!**`)
                return message.channel.send({ embeds: [embed] });
            }

            if (!member) {
                let membembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setAuthor(`Please mention a member for kick!`, user.displayAvatarURL({ dynamic: true }))
                    .addField(`Usage`, `${PREFIX}${cmd} <@User | UserId>`)
                return message.channel.send({ embeds: [membembed] })
            }
            if (message.member.id !== message.guild.ownerId && message.member.roles.highest.position <= member.roles.highest.position) {
                let erembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`You can't do that because you **either have the same role** or **your role is lower** from ${member}`)
                return message.channel.send({ embeds: [erembed] })
            }

            const reason = args.slice(1).join(" ") || `No reason`



            try {

                member.kick({ reason })

                let succesembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`${member.id} kicked from server by ${user}`)
                    .addField(`Reason`, reason, true)
                    .addField(`Date`, fulldate, true)
                message.channel.send({ embeds: [succesembed] })

            } catch (e) {
                console.log(e)

                let embed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`There was an error while kicking the member, please try later!`)
                message.channel.send({ embeds: [embed] })
            }

        }
        else if (cmd === 'unban' || cmd === 'pardon') {
            if (!message.member.permissions.has("BAN_MEMBERS")) {
                let permembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**You need to** \`Ban Members\` **permission to unban a member!**`)
                return message.channel.send({ embeds: [permembed] })
            }

            if (!message.guild.me.permissions.has('BAN_MEMBERS')) {
                const embed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**Lechsbott needs to** \`Ban Members\` **permission to unban a member!**`)
                return message.channel.send({ embeds: [embed] });
            }

            const id = args[0]
            if (!id) {
                let notembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setAuthor(`You need to provide an id want to unban!`, user.displayAvatarURL({ dynamic: true }))
                    .setDescription(`Cannot unban an user without id`)
                    .addField(`Usage`, `${PREFIX}${cmd} <banned user id>`)
                return message.channel.send({ embeds: [notembed] })
            }




            message.guild.members.unban(id).then(user => {
                let succesembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setDescription(`**${user.tag} is now unbanned from server!**`)
                message.channel.send({ embeds: [succesembed] })
            }).catch(err => {


                let notembed = new Discord.MessageEmbed()
                    .setColor(roleColor(message))
                    .setAuthor(`User with "${args[0]}" id, is not banned!`, user.displayAvatarURL({ dynamic: true }))
                    .setDescription(`We cannot found, please sure entered correctly id`)
                return message.channel.send({ embeds: [notembed] })
            })




        }
    }
}