const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const { YOUTUBE_API_KEY, OWNER1, OWNER2, SOUNDCLOUD_CLIENT_ID } = require("../util/lechsbottUtil");
const YouTube = require('simple-youtube-api');
const youtube = new YouTube(YOUTUBE_API_KEY)
const { getData, getPreview, getTracks } = require('spotify-url-info')
const scdl = require('soundcloud-downloader').default;
const { SoundCloud } = require("scdl-core");
const scdlcore = new SoundCloud();
const moment = require("moment")
const progressbar = require('string-progressbar');

//Global queue for your bot. Every server will have a key and value pair in this map. { guild.id, queue_constructor{} }
const queue = new Map();

module.exports = {
    name: 'play',
    aliases: ['p', 'skip', 'disconnect', 'dc', 'volume', 'nowplaying', 'np', 'queue', 'pause', 'resume', 'clearqueue', 'seek','leave', 'remove', 'lyrics', 'skipto', 'search', 'grab', 'shuffle'],
    description: 'Advanced music bot by lechixy',
    async execute(client, message, args, cmd, Discord){

        const user = message.author;
        const voice_channel = message.member.voice.channel;
        

        if (!voice_channel) {
            const embed = new Discord.MessageEmbed()
            .setAuthor(`You need to be in a channel to execute this command!`, message.author.displayAvatarURL({dynamic: true}))
            return message.channel.send(embed)
        }
    
        const permissions = voice_channel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')|| (!permissions.has('SPEAK'))) {
            const embed = new Discord.MessageEmbed()
            .setAuthor(`I don't have the correct permissions`, message.author.displayAvatarURL({dynamic: true}))
            .addField('Needed Permissions', '\`Connect\`\n\`Speak\`', true)
            .addField('To Channel', voice_channel.name, true)
            return message.channel.send(embed);
        }

        let song = {};
        const server_queue = queue.get(message.guild.id);


        //If the user has used the play or p command
        if (cmd === 'play' || cmd === 'p'){
            if (!args.length){
                let argsembed = new Discord.MessageEmbed()
                .setAuthor(`l!play`, user.displayAvatarURL({dynamic: true}))
                .addField(`youtube`, `search/link/playlist`, true)
                .addField(`spotify`, `link/playlist`, true)
                .addField('soundcloud', 'link/playlist', true)
                return message.channel.send(argsembed)
            }
            voice_channel.join()

            searchVideo(message, args, client, voice_channel)
        }

        else if(cmd === 'skip') skip_song(message, server_queue, client);
        else if(cmd === 'disconnect' || cmd === 'dc') disconnect_song(message, server_queue, client);
        else if(cmd === 'volume') volume_song(message, server_queue, args, client);
        else if(cmd === 'nowplaying' || cmd === 'np') np_song(message, server_queue, args, client);
        else if(cmd === 'queue') queue_song(message, server_queue, args, client);
        else if(cmd === 'pause') pause_song(message, server_queue, client);
        else if(cmd === 'resume') resume_song(message, server_queue, client);
        else if(cmd === 'clearqueue') clearqueue(message, server_queue, client);
        else if(cmd === 'seek') seek_song(message, server_queue, args, client);
        else if(cmd === 'leave') leavechannel(message, server_queue, client);
        else if(cmd === 'remove') remove_song(message, args, client, server_queue);
        else if(cmd === 'lyrics') lyrics(message, args, server_queue, client);
        else if(cmd === 'skipto') skipto(message, args, server_queue, client);
        else if(cmd === 'search') search_cmd(message, args, server_queue, client);
        else if(cmd === 'shuffle') shuffle_song(message, args, server_queue);
        else if (cmd === 'grab') grab_song(message, args, client ,server_queue)
    }
    
}

// * Functions for search and play
async function searchVideo(message, args, client, voice_channel) {

    const ytemoji = client.emojis.cache.get("846030610526634005");
    const spotifyemoji = client.emojis.cache.get("846030610929418310");
    const scemoji = client.emojis.cache.get("865548940694519819");
    const playlisturl = 'https://www.youtube.com/playlist?list=';
    const spotifyurl = 'https://open.spotify.com/track/';
    const spotifyplaylisturl = "https://open.spotify.com/playlist/";
    const scurl = 'https://soundcloud.com/'


    
    if(args[0].includes(scurl)){
        message.channel.send(`${scemoji} **Searching on SoundCloud** \`${args.join(' ')}\``)

        scdlcore.connect(SOUNDCLOUD_CLIENT_ID).then(async () => {

            const scdlinfoget = await scdlcore.tracks.getTrack(args[0])

            if(scdlinfoget){
                if(scdlinfoget.kind === 'track'){
                    
                    const durationvideo = scdlinfoget.duration
                    
                    song = {
                        url: scdlinfoget.permalink_url,
                        title: scdlinfoget.title,
                        type: 'sc',
                        app: 'SoundCloud',
                        customurl: scdlinfoget.permalink_url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: `${moment.duration(durationvideo).minutes()}:${moment.duration(durationvideo).seconds()}`
                    }
                await handleVideo(song, message, args, voice_channel, 'false')
                } else if(scdlinfoget.kind === 'playlist'){

                    const otherscdlhandler = await scdl.getSetInfo(args[0])
                    
                    otherscdlhandler.tracks.forEach(async track => {
                        
                        const durationvideo = track.duration

                        song = {
                            url: track.permalink_url,
                            title: track.title,
                            type: 'sc',
                            app: 'SoundCloud',
                            customurl: permalink_url,
                            addedby: message.author.username,
                            addedid: message.author.id,
                            duration: `${moment.duration(durationvideo).minutes()}:${moment.duration(durationvideo).seconds()}`
                        }
                        await handleVideo(song, message, args, voice_channel, 'soundcloudplaylist')
                    })

                    let playlistembed = new Discord.MessageEmbed()
                    .setAuthor(`SoundCloud playlist has been added to the queue with ${scdlinfoget.tracks.length} songs!`, `${message.author.displayAvatarURL({dynamic: true})}`)
                    return message.channel.send(playlistembed)
                }

            } else if(!scdlinfoget){
                let errorembed = new Discord.MessageEmbed()
                .setDescription(`${scemoji} Song or playlist isn't found on SoundCloud!`)
                return message.channel.send(errorembed)
            }
        })
    }
    else if(args[0].includes(spotifyurl)){
        message.channel.send(`${spotifyemoji} **Searching on Spotify** \`${args.join(' ')}\``)

        const spotify_finder = await getPreview(args[0])

        const search_title = `${spotify_finder.artist} ${spotify_finder.title}`


        const spoyt_finder = async (query) =>{
            const video_result = await ytSearch(query);
            return (video_result.videos.length > 1) ? video_result.videos[0] : null;
        }

        const spoytvid = await spoyt_finder(search_title);

        if(spoytvid) {
            song = {
                url: spoytvid.url,
                title: `${spotify_finder.artist} - ${spotify_finder.title}`,
                type: 'normal',
                app: 'Spotify',
                customurl: args[0],
                addedby: message.author.username,
                addedid: message.author.id,
                duration: spoytvid.duration.timestamp,
            }
        } else {
            let errorembed = new Discord.MessageEmbed()
            .setDescription(`${spotifyemoji} Song isn't found on Spotify!`)
            return message.channel.send(errorembed)
        }
        await handleVideo(song, message, args, voice_channel, 'false')
    }
    else if(args[0].includes(spotifyplaylisturl)){
        message.channel.send(`${spotifyemoji} **Searching playlist** \`${args.join(' ')}\``)
        
        const data = await getTracks(args[0])
        
        

        const spoyt_finder = async (query) =>{
            const video_result = await ytSearch(query);
            return (video_result.videos.length > 1) ? video_result.videos[0] : null;
        }

        let number = data.length

        data.forEach(async song => {

            const search_title = `${song.artists[0].name} - ${song.name}`

            const spotifyplaylist = await spoyt_finder(search_title);

            if(spotifyplaylist) {
                song = {
                    url: spotifyplaylist.url,
                    title: search_title,
                    type: 'normal',
                    app: 'Spotify',
                    customurl: args[0],
                    addedby: message.author.username,
                    addedid: message.author.id,
                    duration: spotifyplaylist.duration.timestamp,
                }
                await handleVideo(song, message, args, voice_channel, 'spotifyplaylist', 'normal')
            } else {
                let errorembed = new Discord.MessageEmbed()
                .setDescription(`${spotifyemoji} Playlist isn't found on Spotify!`)
                message.channel.send(errorembed)
            }

        })
        let playlistembed = new Discord.MessageEmbed()
        .setAuthor(`Spotify playlist has been added to the queue with ${number} songs!`, `${message.author.displayAvatarURL({dynamic: true})}`)
        return message.channel.send(playlistembed)
    }
    else if(args[0].includes(playlisturl)){
        message.channel.send(`${ytemoji} **Searching playlist** \`${args.join(' ')}\``)

        const playlist = await youtube.getPlaylist(args[0]);
        const videos = await playlist.getVideos();
        
        for(const video of Object.values(videos)){
            const ytplaylist = await youtube.getVideoByID(video.id)

            let song = {
                title: ytplaylist.title,
                url: `https://www.youtube.com/watch?v=${ytplaylist.id}`,
                type: 'normal',
                app: 'YouTube',
                customurl: `${args[0]}`,
                addedby: message.author.username,
                addedid: message.author.id,
                duration: `${song.duration.minutes}:${song.durationSeconds}`,
            }

            await handleVideo(song, message, args, voice_channel, 'youtubeplaylist')
        }
        let playlistembed = new Discord.MessageEmbed()
        .setAuthor(`Youtube playlist has been added to the queue with ${playlist.videos.length} songs!`, `${message.author.displayAvatarURL({dynamic: true})}`)
        return message.channel.send(playlistembed)
    }
    else if (ytdl.validateURL(args[0])) {
        message.channel.send(`${ytemoji} **Searching** \`${args.join(' ')}\``)

        const song_info = await ytdl.getInfo(args[0]);
        const ytsinfo = await ytSearch({ videoId: song_info.videoDetails.videoId })

        song = {
            url: song_info.videoDetails.video_url,
            title: song_info.videoDetails.title, 
            type: 'normal',
            app: 'YouTube',
            customurl: song_info.videoDetails.video_url,
            addedby: message.author.username,
            addedid: message.author.id,
            duration: ytsinfo.duration.timestamp,
        };
        await handleVideo(song, message, args, voice_channel, 'false')
    } else {
        message.channel.send(`${ytemoji} **Searching** \`${args.join(' ')}\``)
        //If there was no link, we use keywords to search for a video. Set the song object to have two keys. Title and URl.
        const video_finder = async (query) =>{
            const video_result = await ytSearch(query);
            return (video_result.videos.length > 1) ? video_result.videos[0] : null;
        }

        const video = await video_finder(args.join(' '));
        if (video){
            song = {
                title: video.title,
                url: video.url,
                type: 'normal',
                app: 'YouTube',
                customurl: video.url,
                addedby: message.author.username,
                addedid: message.author.id,
                duration: video.duration.timestamp,
            }
        } else {
             message.channel.send(`Error finding video`);
        }
        await handleVideo(song, message, args, voice_channel, 'false')
    }

}

async function handleVideo(video, message, args, voice_channel, playlist){
    const Discord = require('discord.js')
    const server_queue = queue.get(message.guild.id)
    const song = {
        title: video.title,
        url: video.url,
        type: video.type,
        app: video.app,
        customurl: video.customurl,
        addedby: video.addedby,
        addedid: video.addedid,
        duration: video.duration,
        seekedsecond: null,
    }
    console.log(song)
    if (!server_queue){
                
        const queue_constructor = {
            voice_channel: voice_channel,
            text_channel: message.channel,
            connection: null,
            songs: [],
            volume: '1',
            playing: true,
        }
        
        //Add our key and value pair into the global queue. We then use this to get our server queue.
        queue.set(message.guild.id, queue_constructor);
        queue_constructor.songs.push(song);

        const lechsbottPlayer = async (guild, song, seek) => {
            const song_queue = queue.get(guild.id);
            const Discord = require('discord.js')
        
            if (!song) {
                queue.delete(guild.id);
                return;
            }
        
            if(song.type === 'normal'){
                const stream = ytdl(song.url, { filter: 'audioonly' });
                song_queue.connection.play(stream, { seek: seek, volume: song_queue.volume })
                .on('finish', () => {
                    song_queue.songs.shift();
                    lechsbottPlayer(guild, song_queue.songs[0], seek);
                });
            } else if(song.type === 'sc'){
                const stream = await scdl.download(song.url)
                song_queue.connection.play(stream, { seek: seek, volume: song_queue.volume })
                .on('finish', () => {
                    song_queue.songs.shift();
                    lechsbottPlayer(guild, song_queue.songs[0], seek);
                })
            }


            let playing = new Discord.MessageEmbed()
            .setAuthor(name= `Now playing`, icon_url= `${message.author.displayAvatarURL({dynamic: true})}`)
            .setTitle(`${song.title}`)
            .setURL(`${song.customurl}`)
            .setFooter(`Added by ${song.addedby}`)
            .setTimestamp()
            await song_queue.text_channel.send(playing)
        }

        //Establish a connection and play the song with the vide_player function.
        try {
            const connection = await voice_channel.join();
            queue_constructor.connection = connection;
            connection.voice.setDeaf(true);
            lechsbottPlayer(message.guild, queue_constructor.songs[0], 0);
        } catch (err) {
            queue.delete(message.guild.id);
            const embed = new Discord.MessageEmbed()
            .setDescription(`**There was an error connecting!**`)
            message.channel.send(embed);
            throw new Error(e)
        }
    } else {
        server_queue.songs.push(song)

        if(playlist === 'youtubeplaylist') return undefined;
        else if(playlist === 'spotifyplaylist') return undefined;
        else if(playlist === 'soundcloudplaylist') return undefined;
        else if(playlist === 'false'){
            const member = message.author;
            let memberavatar = member.displayAvatarURL()
            let queueInfo = new Discord.MessageEmbed()
            .setAuthor(name= `Added to queue`, icon_url= `${memberavatar}`)
            .setTitle(`${song.title}`)
            .setURL(`${song.customurl}`)
            .setTimestamp()
            .setFooter(`Added by ${song.addedby}`)

            return message.channel.send(queueInfo).then(message => {message.react('👍')})
        }
    }
    return undefined;
    
}

// * Util functions
const skip_song = (message, server_queue, client) => {
    const Discord = require('discord.js')
    const cross = client.emojis.cache.get("846030611486474280");
    
    if(!message.member.voice.channel){
        let userisntonchannelembed = new Discord.MessageEmbed()
        .setDescription(`You need to be in a channel to execute this command!`)
        return message.channel.send(userisntonchannelembed);
    }
    if(!server_queue.songs[1]){
        let embed = new Discord.MessageEmbed()
        .setDescription(`**There is no more songs to skip**`)
        .addField('Want to add song?', `l!play`)
        return message.channel.send(embed);
    } else {
        let skippedembed = new Discord.MessageEmbed()
        .setDescription('**⏭️ Skipping**')
        message.channel.send(skippedembed)
        server_queue.connection.dispatcher.end();
    }
    
}

const disconnect_song = async (message, server_queue, client) => {
    const Discord = require('discord.js')
    const voiceChannel = message.member.voice.channel;

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }

    if(server_queue.playing === false){
        queue.delete(message.guild.id);
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully disconnect from \`${message.member.voice.channel.name}\`**`)
        return message.channel.send(embed)
    }

    if(!server_queue){
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully disconnect from \`${message.member.voice.channel.name}\`**`)
        message.channel.send(embed)
    } else {
        server_queue.songs = [];
        server_queue.connection.dispatcher.end();
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully disconnect from \`${message.member.voice.channel.name}\`**`)
        message.channel.send(embed)
    }  
}

const volume_song = async (message, server_queue, args, client) => {
    const Discord = require('discord.js')
    const cross = client.emojis.cache.get("846030611486474280");

    if(!message.member.voice.channel){
        let userisntonchannelembed = new Discord.MessageEmbed()
        .setDescription(`You need to be in a channel to execute this command!`)
        return message.channel.send(userisntonchannelembed);
    } 
    if(!server_queue) {
        let server_queueembed =  new Discord.MessageEmbed()
        .setDescription(`There is any **lechsbott song queue** for **${message.guild.name}**...\nWant to add song? Type **l!play**  \`song name/url\``)
        return message.channel.send(server_queueembed)
    }
    if(!args[0]) {
        let volumeisembed = new Discord.MessageEmbed()
        .setDescription(`The volume is **${server_queue.volume}**`)
        return message.channel.send(volumeisembed)
    }

    if(isNaN(args[0])) {
        let embed = new Discord.MessageEmbed()
        .setDescription(`**That is not a valid amount to change the volume to!**`)
        return message.channel.send(embed)
    }

    if(args[0] > 100){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You can set volume max to 100**`)
        return message.channel.send(embed);
    }
    if(args[0] < 0){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You can set volume minimum to 0**`)
        return message.channel.send(embed);
    }

    if(args[0] === '2'){
        server_queue.volume = `${args[0]}`
        server_queue.connection.dispatcher.setVolume(2)
    }
    if(args[0] === '1.5'){
        server_queue.volume = `${args[0]}`
        server_queue.connection.dispatcher.setVolume(1.5)
    }
    if(args[0] === '1'){
        server_queue.volume = `${args[0]}`
        server_queue.connection.dispatcher.setVolume(1)
    }
    if(args[0] === '0.5'){
        server_queue.volume = `${args[0]}`
        server_queue.connection.dispatcher.setVolume(0.5)
    }
    if(args[0] === '0'){
        server_queue.volume = `${args[0]}`
        server_queue.connection.dispatcher.setVolume(0)
    }

    let volumechangedembed = new Discord.MessageEmbed()
    .setDescription(`**Volume is setted to \`${args[0]}\` now!**`)
    await message.channel.send(volumechangedembed)
    
}

const np_song = (message, server_queue, args, client) => {
    const Discord = require('discord.js')

    function timestampconver(timestamp) {
        const split = timestamp.split(':')

        let [ minute, second ] = split;

        return (minute*60+second*1)
    }

    function barsplit(bar){
        const split = bar.split(',')

        let [ barresult, value ] = split;

        return barresult
    }

    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }

    // ! YENIDEN YAPILACAK BI HATA YUZUNE OLMUYOR AMK
    let songduration;
    if(server_queue.songs[0].seekedsecond === null){
        songduration = server_queue.connection.dispatcher.streamTime
    } else {
        const streamtimeconv = `${moment.duration(server_queue.connection.dispatcher.streamTime).minutes().toString()}:${moment.duration(server_queue.connection.dispatcher.streamTime).seconds().toString()}`
        const seekedsecondconv = `${moment.duration(server_queue.songs[0].seekedsecond).minutes().toString()}:${moment.duration(server_queue.songs[0].seekedsecond).seconds().toString()}`
        songduration = (timestampconver(seekedsecondconv))+(timestampconver(streamtimeconv))
        console.log(songduration)
    }
 
    const elapsedtime = `${moment.duration(songduration).minutes()}:${moment.duration(songduration).seconds()}`
    const totaltime = server_queue.songs[0].duration.toString()

    const bar = progressbar.splitBar(timestampconver(totaltime), timestampconver(songduration), 15, '▬', ':blue_circle:').toString()

    let nowplayingembed = new Discord.MessageEmbed()
    .setTitle(`${server_queue.songs[0].title}`)
    .setURL(server_queue.songs[0].customurl)
    .setDescription(`Added by <@${server_queue.songs[0].addedid}>\n
    ${barsplit(bar)}\n
    ${elapsedtime}/${totaltime}`)
    //fields
    .addField('<a:playingaudiowave:854663992697946122> Playing on', `<#${message.guild.me.voice.channel.id}>`, true)
    .addField(':loud_sound: Volume', `${server_queue.volume}`, true)
    .addField(':notes: Total songs', `${server_queue.songs.length}`, true)
    message.channel.send(nowplayingembed)
}

const queue_song = (message, server_queue, args, client) => {
    const Discord = require('discord.js')
    const playingaudio = client.emojis.cache.get('854663992697946122');

    if(!server_queue) {
        let server_queueembed =  new Discord.MessageEmbed()
        .setDescription(`There is any **lechsbott song queue** for **${message.guild.name}**
        \nWant to add song? Type **l!play**`)
        return message.channel.send(server_queueembed)
    }

        let index = 1;
        let string = "";
    
            if(server_queue.songs[0]) string += `${playingaudio} ${server_queue.songs[0].title} **|** <@${server_queue.songs[0].addedid}>`;
        
        let string1 = "";

            if(server_queue.songs[1]) string1 += `${server_queue.songs.slice(1, 11).map(x => `**${index++}-** ${x.title} **|** <@${x.addedid}>`).join("\n")}`;

        if(server_queue.songs.length > 10){
            let queueembedonesong = new Discord.MessageEmbed()
            .setAuthor(`Current queue for ${message.guild.name}`, message.guild.iconURL())
            .addField(`Now playing`, `${string}`)
            .addField('\u200B', '\u200B')
            .addField('All of queue', `${string1}`)
            .addField('more ' + (server_queue.songs.length - 10) + ' from queue!', '\u200B')
            .setTimestamp()
            .setFooter(`total ${server_queue.songs.length} in queue`)
            // .setThumbnail(server_queue.queue[0])
            return message.channel.send(queueembedonesong)
        }
        else if(!server_queue.songs[1]) {
            let queueembedonesong = new Discord.MessageEmbed()
            .setAuthor(`Current queue for ${message.guild.name}`, message.guild.iconURL())
            .addField(`Now playing`, `${string}`)
            .setFooter(`total ${server_queue.songs.length} in queue`)
            .setTimestamp()
            // .setThumbnail(server_queue.queue[0])
            return message.channel.send(queueembedonesong)
        } else {
            let queueembed = new Discord.MessageEmbed()
            .setAuthor(`Current Queue for ${message.guild.name}`, message.guild.iconURL())
            .addField(`Now playing`, `${string}`)
            .addField('\u200B', '\u200B')
            .addField('All of queue', `${string1}`)
            .setFooter(`total ${server_queue.songs.length} in queue`)
            .setTimestamp()
            // .setThumbnail(server_queue.queue[0])
            return message.channel.send(queueembed)
    }
}

const pause_song = (message, server_queue, client) => {
    const Discord = require('discord.js')

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }
    if(server_queue.playing === false) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**:pause_button: Already paused**`)
        return message.channel.send(embed);
    }

    server_queue.playing = false
    server_queue.connection.dispatcher.pause()

    let pausedembed = new Discord.MessageEmbed()
    .setDescription('**⏸ Paused**')
    message.channel.send(pausedembed)
}

const resume_song = (message, server_queue, client) => {
    const Discord = require('discord.js')

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }

    if(server_queue.playing === true) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`:arrow_forward: Already playing`)
        message.channel.send(embed);
    }
    server_queue.playing = true
    server_queue.connection.dispatcher.resume()
    let resumeembed = new Discord.MessageEmbed()
    .setDescription('**▶ Resuming**')
    message.channel.send(resumeembed)
}

const clearqueue = (message, server_queue, client) => {
    const Discord = require('discord.js')
    const cross = client.emojis.cache.get("846030611486474280");

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }
    server_queue.songs = [];
    server_queue.connection.dispatcher.end();
    let clearqueueembed = new Discord.MessageEmbed()
    .setDescription('**↩ Queue cleared!**')
    message.channel.send(clearqueueembed)
}

const seek_song = (message, server_queue, args, client) => {
    const Discord = require('discord.js')

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }
    if(!args[0]){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to type the second for seek the song**`)
        .addField('Need to help?', 'l!seek <second>')
        return message.channel.send(embed);
    }


    const lechsbottPlayer = async (guild, song, seek) => {
        const song_queue = queue.get(guild.id);
        const Discord = require('discord.js')
    
        if (!song) {
            queue.delete(guild.id);
            return;
        }
    
        if(song.type === 'normal'){
            const stream = ytdl(song.url, { filter: 'audioonly' });
            song_queue.connection.play(stream, { seek: seek, volume: song_queue.volume })
            .on('finish', () => {
                song_queue.songs.shift();
                lechsbottPlayer(guild, song_queue.songs[0], 0);
            });
        } else if(song.type === 'sc'){
            const stream = await scdl.download(song.url)
            song_queue.connection.play(stream, { seek: seek, volume: song_queue.volume })
            .on('finish', () => {
                song_queue.songs.shift();
                lechsbottPlayer(guild, song_queue.songs[0], 0);
            })
        }
    }

    server_queue.songs[0].seekedsecond = args[0]
    console.log(server_queue.songs[0].seekedsecond)
    lechsbottPlayer(message.guild, server_queue.songs[0], args[0])

    const embed = new Discord.MessageEmbed()
    .setDescription(`Seeked to ${args[0]}`)
    return message.channel.send(embed);
}

const leavechannel = async (message, server_queue, client) => {
    const Discord = require('discord.js')
    const voiceChannel = message.member.voice.channel;

    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }

    if(server_queue.playing === false){
        queue.delete(message.guild.id);
        await voiceChannel.leave()
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully leaved from \`${message.member.voice.channel.name}\`**`)
        return message.channel.send(embed)
    }

    if(!server_queue){
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully leaved from \`${message.member.voice.channel.name}\`**`)
        message.channel.send(embed)
    } else {
        server_queue.songs = [];
        server_queue.connection.dispatcher.end();
        await voiceChannel.leave()
        const embed = new Discord.MessageEmbed()
        .setDescription(`**📫 Succesfully leaved from \`${message.member.voice.channel.name}\`**`)
        message.channel.send(embed)
    }  
}

const remove_song = (message, args, client, server_queue) => {
    const Discord = require('discord.js')
    
    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }
    if(!args[0]){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to type the queue number of the song:** \`l!remove <queue number>\``)
        .addField('Need to queue number?', 'l!queue')
        return message.channel.send(embed);
    }
    if(args[0] > server_queue.songs.length) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is no song number you want to remove from the queue**`)
        .addField('Need to queue number?', 'l!queue')
        return message.channel.send(embed);
    }
    if(isNaN(args[0])) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to type a number**`)
        .addField('Need to queue number?', 'l!queue')
        return message.channel.send(embed);
    }
        
    let infoembed = new Discord.MessageEmbed()
    .setDescription(`**Removed ${server_queue.songs[args[0]].title} from queue!**`)
    message.channel.send(infoembed)
    server_queue.songs.splice(args[0], args[0])
}

const lyrics = async (message, args, server_queue, client) => {
    const Discord = require('discord.js')
    const lyricsFinder = require('lyrics-finder')
    
    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }

    const title = args.join(" ")

    let loading = new Discord.MessageEmbed()
    .setDescription(`<a:loading:846030612254687253> **Searching for lyrics of ${server_queue.songs[0].title}**...`)
    const m = await message.channel.send(loading);

    let lyrics = await lyricsFinder(title, "");

    if (!lyrics) {
        let errorembed = new Discord.MessageEmbed()
        .setDescription(`**Lyrics is not found!**`)
        m.edit(errorembed)
    } else {
        let lyricsEmbed = new Discord.MessageEmbed()
        .setTitle(`Lyrics of ${server_queue.songs[0].title}`)
        .setDescription(lyrics)
        .setTimestamp()

        if (lyricsEmbed.description.length >= 2048)
        lyricsEmbed.description = `${lyricsEmbed.description.substr(0, 2045)}...`;
        return m.edit(lyricsEmbed)
    }
}

const skipto = (message, args, server_queue, client) => {
    const Discord = require('discord.js')
    
    if(!message.member.voice.channel) return message.channel.send(`You need to be in a channel to execute this command!`);
    if(!server_queue) return message.channel.send(`There is nothing playing this server!`)
    if(!args.length) return message.channel.send(`You need to type the queue number of the song: \`l!skipto <song queue number>\``)

    if(args[0] > server_queue.songs.length) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is no song number you want to remove from the ranking:** \`l!queue for queue info\``)
        message.channel.send(embed);
    }

    if(isNaN(args[0])) {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to type the queue number of the song:** \`l!remove <song queue number>\``)
        message.channel.send(embed);
    }
    if(args[0] === '1'){
        server_queue.connection.dispatcher.end();
        let infoembed = new Discord.MessageEmbed()
        .setDescription(`**Skipped to \`${server_queue.songs[1].title}\` from queue!**`)
        return message.channel.send(infoembed)
    }
    server_queue.songs.splice(0, (args[0]*1)-1)

    let infoembed = new Discord.MessageEmbed()
    .setDescription(`**Skipped to \`${server_queue.songs[0].title}\` from queue!**`)
    message.channel.send(infoembed)

    server_queue.connection.dispatcher.end();
}

const search_cmd = async (message, args, server_queue, client) => {
    const Discord = require('discord.js')
    const voice_channel = message.member.voice.channel;
    
    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!args.length) {
        let argsembed = new Discord.MessageEmbed()
        .setAuthor(`l!search`, message.author.displayAvatarURL({dynamic: true}))
        .addField(`youtube`, `keywords for query`)
        return message.channel.send(argsembed)
    }

    const embed = new Discord.MessageEmbed()
    .setDescription(`<:youtube:846030610526634005> **Searching** \`${args.join(' ')}\``)
    const m = await message.channel.send(embed);

    const video = await ytSearch(args.join(' '));
    const videos = video.videos.slice( 0, 10)
    let index = 0;

    let string1 = "";

            string1 += `${videos.map(x => `**${++index}-** ${x.title}`).join("\n")}`;

    let searchresult = new Discord.MessageEmbed()
    .setTitle(`Search results for ${args.join(' ')}`)
    .setDescription(string1)
    m.edit(searchresult);
    m.react('1️⃣')
    m.react('2️⃣')
    m.react('3️⃣')
    m.react('4️⃣')
    m.react('5️⃣')
    m.react('6️⃣')
    m.react('7️⃣')
    m.react('8️⃣')
    m.react('9️⃣')
    m.react('🔟')

    const filter = (reaction, user) => {
        return ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'].includes(reaction.emoji.name) && user.id === message.author.id;
    }

    m.awaitReactions(filter, {max: 1, time: 30000, errors: ["time"]}).then(
        async(collected) => {
            const reaction = collected.first()
            if(reaction.emoji.name === "1️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[0]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                     const embed = new Discord.MessageEmbed()
                     .setDescription(`**An error occurred while finding video**`)
                     return message.channel.send(embed);
                }

                await handleVideo(song, message, args, voice_channel, 'false')
            } else if(reaction.emoji.name === "2️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[1]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, false)
            } else if(reaction.emoji.name === "3️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[2]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "4️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[3]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "5️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[4]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "6️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[5]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "7️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[6]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "8️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[7]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }

                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "9️⃣")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[8]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }

                await handleVideo(song, message, args, voice_channel, 'false')

            } else if(reaction.emoji.name === "🔟")
            {
                const video = await ytSearch(args.join(' '));
                let sended = video.videos[9]

                if (sended){
                    song = {
                        title: sended.title, 
                        url: sended.url,
                        type: 'normal',
                        app: 'YouTube',
                        customurl: sended.url,
                        addedby: message.author.username,
                        addedid: message.author.id,
                        duration: sended.duration.timestamp,
                    }
                } else {
                    const embed = new Discord.MessageEmbed()
                    .setDescription(`**An error occurred while finding video**`)
                    return message.channel.send(embed);
                }
                await handleVideo(song, message, args, voice_channel, 'false')
            }
        }
    )

    .catch(collected => {
        const embed = new Discord.MessageEmbed()
        .setDescription(`**Search reactions now disabled because you didn't select one of them!**`)
        return message.channel.send(embed);
    })
        
    
}

const shuffle_song = async (message, args, server_queue) => {
    if(!message.member.voice.channel){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**You need to be in a channel to execute this command**`)
        return message.channel.send(embed);
    }
    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }

    if(!server_queue.songs[2]) return message.channel.send('There is only **two song** in queue for **shuffle** need to more than **2** songs!')

    let songs = queue.queue;
    for (let i = server_queue.songs.length - 1; i > 1; i--) {
      let j = 1 + Math.floor(Math.random() * i);
      [songs[i], songs[j]] = [songs[j], songs[i]];
  }
}

const grab_song = async (message, args, client, server_queue) => {
    const Discord = require('discord.js')

    if(!server_queue){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There is nothing playing on this server**`)
        .addField('Want to add song?', 'l!play')
        return message.channel.send(embed);
    }

    if(!args[0]){
        const selected = server_queue.songs[0]

        const embed = new Discord.MessageEmbed()
        .setAuthor(`Now playing on ${message.guild.name}`, message.author.displayAvatarURL({dynamic: true}))
        .setTitle(selected.title)
        .setURL(selected.customurl)
        .addField(`App`, selected.app, true)
        .addField(`Duration`, selected.duration, true)
        .addField(`Added by`, selected.addedby, true)
        return message.author.send(embed);
    }

    if(args[0] > server_queue.songs.length-1){
        const embed = new Discord.MessageEmbed()
        .setDescription(`**There no songs with ${args[0]} number in queue**`)
        .addField(`Need queue number?`, `l!queue`, true)
        return message.channel.send(embed);
    }

    const selected = server_queue.songs[args[0]]

    const embed = new Discord.MessageEmbed()
    .setAuthor(`Now playing on ${message.guild.name}`, message.author.displayAvatarURL({dynamic: true}))
    .setTitle(selected.title)
    .setURL(selected.customurl)
    .addField(`App`, selected.app, true)
    .addField(`Duration`, selected.duration, true)
    .addField(`Added by`, selected.addedby, true)
    message.author.send(embed);
}