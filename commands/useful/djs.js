const axios = require('axios')
const { PREFIX } = require('../util/lechsbottUtil')

module.exports = {
    name:'djs',
    aliases:['djdocs'],
    description:'',
    async execute(client, message, args, cmd, Discord) {
      
        const query = args.join(' ')
        if(!query){
            const embed = new Discord.MessageEmbed()
            .setAuthor(`You need to specify djs category to find somethings!`, message.author.displayAvatarURL({dynamic: true}))
            .addField(`Usage`, `${PREFIX}djs/djsdocs <category>`, true)
            return message.channel.send(embed);
        }
      
        const url = `https://djsdocs.sorta.moe/v2/embed?src=stable&q=${encodeURIComponent(query)}`

        axios.get(url).then(({data}) => {
            if(data) {
                message.channel.send({ embed: data});
            }
        })
  }
}