var Scraper = require('images-scraper');

const google = new Scraper({
    puppeteer: {
        headless: true
    }
})

module.exports = {
    name: 'image',
    aliases: ['search_image', 'resim'],
    cooldown: 0,
    description: 'This command searches an image on google and then broadcast to chat!',
    async execute(client, message, args, cmd, Discord){
        const loadingemoji = client.emojis.cache.get('849327711775227924');
        const image_query = args.join(' ');

        if(!image_query) return message.channel.send('Please enter an image name!')

        let loading = new Discord.MessageEmbed()
        .setTitle(`${loadingemoji} Searching results for ${image_query}...`)
        .setTimestamp()
        const m = await message.channel.send(loading)

        const image_results = await google.scrape(image_query, 1);

        if(!image_results){
            let errorembed = new Discord.MessageEmbed()
            .setDescription(`There is no image about ${image_query}`)
            .setTimestamp()
            m.edit(errorembed);
        }

        let resultEmbed = new Discord.MessageEmbed()
        .setTitle(`Google Image search results for ${image_query}`)
        .setImage(image_results[0].url)
        .setTimestamp()
        m.edit(resultEmbed);
    }
}